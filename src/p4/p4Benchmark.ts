// P4 Benchmark: Open-Ended Active Theory Search
// Explores open-ended candidate generation in controlled settings.
// LLMs are used as proposal mechanisms, not final judges.
// External verification remains necessary.

import {
  evaluate, complexity, toString as exprToString,
  type SymExpr,
} from '../p1/symbolicExpr.js';
import {
  type DimVector, inferDimension, dimEqual,
} from '../p2/dimensionalConstraints.js';
import { PHYSICS_FORMULAS } from '../p2/physicsFormulaLibrary.js';
import type { PhysicsFormulaEntry } from '../p2/physicsExpr.js';
import { generatePhysicsDataset, type DataPoint, type PhysicsDataset } from '../p2/p2Dataset.js';
import {
  generateCandidates, generateCandidatesWithTarget,
  computeGenerationStats, type CandidateContext, type GeneratedCandidate,
} from './candidateGenerator.js';
import { parseCandidate, type ParseResult } from './candidateParser.js';
import {
  verifierFilter, isDimensionallyValid, type VerifierResult,
} from './verifierFilteredSearch.js';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface P4Metrics {
  formulaId: string;
  baseline: string;
  noiseLevel: number;
  seed: number;
  parseSuccessRate: number;
  verifierPassRate: number;
  heldoutAccuracy: number;
  correctionRecoveryRate: number;
  hallucinationRate: number;
  invalidDimensionRate: number;
  queryCost: number;
  oracleGap: number;
  candidateSetSize: number;
}

export interface P4BenchmarkOptions {
  noiseLevels: number[];
  budget: number;
  seeds: number;
  outputDir: string;
}

const BASELINES = [
  'llm_raw_candidate',
  'llm_plus_parser',
  'llm_plus_verifier',
  'llm_plus_active_infogain',
  'library_active_infogain',
  'oracle',
] as const;

type BaselineName = typeof BASELINES[number];

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeR2(predicted: SymExpr, heldout: DataPoint[], varNames: string[]): number {
  if (heldout.length === 0) return 0;

  const validPairs: [number, number][] = [];
  for (const dp of heldout) {
    const pred = evaluate(predicted, dp.inputs);
    if (Number.isFinite(pred) && Number.isFinite(dp.output)) {
      validPairs.push([pred, dp.output]);
    }
  }

  if (validPairs.length < 2) return 0;

  const meanActual = validPairs.reduce((s, [_, a]) => s + a, 0) / validPairs.length;
  const ssTot = validPairs.reduce((s, [_, a]) => s + (a - meanActual) ** 2, 0);
  const ssRes = validPairs.reduce((s, [p, a]) => s + (p - a) ** 2, 0);

  if (ssTot === 0) return ssRes === 0 ? 1 : 0;
  return Math.max(0, 1 - ssRes / ssTot);
}

function computeTrainError(expr: SymExpr, train: DataPoint[]): number {
  let totalError = 0;
  let count = 0;
  for (const dp of train) {
    const predicted = evaluate(expr, dp.inputs);
    if (!Number.isFinite(predicted)) continue;
    totalError += (predicted - dp.output) ** 2;
    count++;
  }
  return count > 0 ? totalError / count : Infinity;
}

function symbolicEquivalent(
  predicted: SymExpr,
  target: PhysicsFormulaEntry,
): boolean {
  const varNames = Object.keys(target.variableDimensions);
  const testVals = [0.5, 1, 2, 3, 5, 7, 10];

  for (const vals of generateTestCombinations(varNames.length, testVals)) {
    const inputMap: Record<string, number> = {};
    for (let i = 0; i < varNames.length; i++) {
      inputMap[varNames[i]] = vals[i];
    }

    const pVal = evaluate(predicted, inputMap);
    const tVal = evaluate(target.expr, inputMap);

    if (!Number.isFinite(pVal) && !Number.isFinite(tVal)) continue;
    if (!Number.isFinite(pVal) || !Number.isFinite(tVal)) return false;

    const scale = Math.max(Math.abs(tVal), 1);
    if (Math.abs(pVal - tVal) > 1e-6 * scale) return false;
  }

  return true;
}

function generateTestCombinations(dim: number, vals: number[]): number[][] {
  if (dim === 0) return [[]];
  if (dim === 1) return vals.map(v => [v]);
  const subVals = vals.slice(0, 4);
  const result: number[][] = [];
  for (const v of subVals) {
    for (const rest of generateTestCombinations(dim - 1, subVals)) {
      result.push([v, ...rest]);
    }
  }
  return result;
}

function buildCandidateContext(formula: PhysicsFormulaEntry): CandidateContext {
  return {
    variableNames: Object.keys(formula.variableDimensions),
    variableDimensions: formula.variableDimensions,
    outputDimension: formula.outputDimension,
    inputDimension: formula.inputDimension,
  };
}

// ---------------------------------------------------------------------------
// Baseline 1: llm_raw_candidate
// Generate candidates, pick the first one that parses successfully.
// ---------------------------------------------------------------------------

function baselineLlmRaw(
  ctx: CandidateContext,
  target: PhysicsFormulaEntry,
  dataset: PhysicsDataset,
  rng: () => number,
  candidateCount: number,
): { predicted: SymExpr | null; stats: Partial<P4Metrics>; queryCost: number } {
  const candidates = generateCandidates(ctx, candidateCount, rng);
  const parseResults = candidates.map(c => parseCandidate(c.raw));

  const parseSuccessRate = parseResults.filter(r => r.success).length / candidates.length;
  const hallucinationRate = parseResults.filter(r => !r.success).length / candidates.length;

  // Pick first parseable candidate
  let predicted: SymExpr | null = null;
  for (const pr of parseResults) {
    if (pr.success && pr.expr) {
      predicted = pr.expr;
      break;
    }
  }

  return {
    predicted,
    stats: { parseSuccessRate, hallucinationRate },
    queryCost: 0,
  };
}

// ---------------------------------------------------------------------------
// Baseline 2: llm_plus_parser
// Generate candidates, parse all, pick best by train error.
// ---------------------------------------------------------------------------

function baselineLlmPlusParser(
  ctx: CandidateContext,
  target: PhysicsFormulaEntry,
  dataset: PhysicsDataset,
  rng: () => number,
  candidateCount: number,
): { predicted: SymExpr | null; stats: Partial<P4Metrics>; queryCost: number } {
  const candidates = generateCandidates(ctx, candidateCount, rng);
  const parseResults = candidates.map(c => parseCandidate(c.raw));

  const parseSuccessRate = parseResults.filter(r => r.success).length / candidates.length;
  const hallucinationRate = parseResults.filter(r => !r.success).length / candidates.length;

  // Collect all parseable candidates
  const parsed: SymExpr[] = [];
  for (const pr of parseResults) {
    if (pr.success && pr.expr) parsed.push(pr.expr);
  }

  // Pick best by train error
  let predicted: SymExpr | null = null;
  let bestError = Infinity;
  for (const expr of parsed) {
    const err = computeTrainError(expr, dataset.train);
    if (err < bestError) {
      bestError = err;
      predicted = expr;
    }
  }

  return {
    predicted,
    stats: { parseSuccessRate, hallucinationRate },
    queryCost: 0,
  };
}

// ---------------------------------------------------------------------------
// Baseline 3: llm_plus_verifier
// Generate candidates, filter by dimension, pick best by train error.
// ---------------------------------------------------------------------------

function baselineLlmPlusVerifier(
  ctx: CandidateContext,
  target: PhysicsFormulaEntry,
  dataset: PhysicsDataset,
  rng: () => number,
  candidateCount: number,
): { predicted: SymExpr | null; stats: Partial<P4Metrics>; queryCost: number } {
  const candidates = generateCandidates(ctx, candidateCount, rng);
  const parseResults = candidates.map(c => parseCandidate(c.raw));

  const parseSuccessRate = parseResults.filter(r => r.success).length / candidates.length;
  const hallucinationRate = parseResults.filter(r => !r.success).length / candidates.length;

  // Collect all parseable candidates
  const parsed: SymExpr[] = [];
  for (const pr of parseResults) {
    if (pr.success && pr.expr) parsed.push(pr.expr);
  }

  // Filter by dimensional validity
  const verifierResult = verifierFilter(parsed, target.variableDimensions, target.outputDimension);
  const verifierPassRate = parsed.length > 0 ? verifierResult.passed.length / parsed.length : 0;
  const invalidDimensionRate = parsed.length > 0 ? verifierResult.rejectionRate : 0;

  // Pick best by train error from passed candidates
  let predicted: SymExpr | null = null;
  let bestError = Infinity;
  const pool = verifierResult.passed.length > 0 ? verifierResult.passed : parsed;
  for (const expr of pool) {
    const err = computeTrainError(expr, dataset.train);
    if (err < bestError) {
      bestError = err;
      predicted = expr;
    }
  }

  return {
    predicted,
    stats: { parseSuccessRate, hallucinationRate, verifierPassRate, invalidDimensionRate },
    queryCost: 0,
  };
}

// ---------------------------------------------------------------------------
// Baseline 4: llm_plus_active_infogain
// Generate candidates, active search with max-variance queries.
// ---------------------------------------------------------------------------

function baselineLlmPlusActiveInfogain(
  ctx: CandidateContext,
  target: PhysicsFormulaEntry,
  dataset: PhysicsDataset,
  rng: () => number,
  candidateCount: number,
  budget: number,
  noiseLevel: number,
): { predicted: SymExpr | null; stats: Partial<P4Metrics>; queryCost: number } {
  const candidates = generateCandidates(ctx, candidateCount, rng);
  const parseResults = candidates.map(c => parseCandidate(c.raw));

  const parseSuccessRate = parseResults.filter(r => r.success).length / candidates.length;
  const hallucinationRate = parseResults.filter(r => !r.success).length / candidates.length;

  // Collect all parseable candidates
  let candidateExprs: SymExpr[] = [];
  for (const pr of parseResults) {
    if (pr.success && pr.expr) candidateExprs.push(pr.expr);
  }

  if (candidateExprs.length === 0) {
    return { predicted: null, stats: { parseSuccessRate, hallucinationRate }, queryCost: budget };
  }

  // Active search: iteratively query the most informative point
  const varNames = Object.keys(target.variableDimensions);

  for (let q = 0; q < budget && candidateExprs.length > 1; q++) {
    // Sample candidate query points
    const queryPoints: Record<string, number>[] = [];
    for (let s = 0; s < 20; s++) {
      const qp: Record<string, number> = {};
      for (const name of varNames) {
        qp[name] = 0.5 + rng() * 9.5;
      }
      queryPoints.push(qp);
    }

    // Select query with max variance across candidates
    let bestQuery = queryPoints[0];
    let bestVariance = -1;

    for (const qp of queryPoints) {
      const outputs = candidateExprs.map(c => evaluate(c, qp)).filter(Number.isFinite);
      if (outputs.length < 2) continue;
      const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length;
      const variance = outputs.reduce((a, b) => a + (b - mean) ** 2, 0) / outputs.length;
      if (variance > bestVariance) {
        bestVariance = variance;
        bestQuery = qp;
      }
    }

    // Observe target
    const observed = evaluate(target.expr, bestQuery);
    if (!Number.isFinite(observed)) continue;

    // Filter candidates
    const sigma = noiseLevel * Math.max(Math.abs(observed), 1);
    const tolerance = 3 * Math.max(sigma, 0.01 * Math.max(Math.abs(observed), 1));
    candidateExprs = candidateExprs.filter(c => {
      const predicted = evaluate(c, bestQuery);
      return Number.isFinite(predicted) && Math.abs(predicted - observed) <= tolerance;
    });

    if (candidateExprs.length === 0) break;
  }

  // Pick best by train error
  let predicted: SymExpr | null = null;
  let bestError = Infinity;
  for (const expr of candidateExprs) {
    const err = computeTrainError(expr, dataset.train);
    if (err < bestError) {
      bestError = err;
      predicted = expr;
    }
  }

  return {
    predicted,
    stats: { parseSuccessRate, hallucinationRate },
    queryCost: budget,
  };
}

// ---------------------------------------------------------------------------
// Baseline 5: library_active_infogain
// P2's active_infogain on the full library (for comparison).
// ---------------------------------------------------------------------------

function baselineLibraryActiveInfogain(
  target: PhysicsFormulaEntry,
  dataset: PhysicsDataset,
  budget: number,
  noiseLevel: number,
  rng: () => number,
): { predicted: PhysicsFormulaEntry | null; queryCost: number } {
  const varNames = Object.keys(target.variableDimensions);
  let candidates = [...PHYSICS_FORMULAS];

  for (let q = 0; q < budget && candidates.length > 1; q++) {
    const queryPoints: Record<string, number>[] = [];
    for (let s = 0; s < 20; s++) {
      const qp: Record<string, number> = {};
      for (const name of varNames) {
        qp[name] = 0.5 + rng() * 9.5;
      }
      queryPoints.push(qp);
    }

    let bestQuery = queryPoints[0];
    let bestVariance = -1;

    for (const qp of queryPoints) {
      const outputs = candidates.map(c => evaluate(c.expr, qp)).filter(Number.isFinite);
      if (outputs.length < 2) continue;
      const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length;
      const variance = outputs.reduce((a, b) => a + (b - mean) ** 2, 0) / outputs.length;
      if (variance > bestVariance) {
        bestVariance = variance;
        bestQuery = qp;
      }
    }

    const observed = evaluate(target.expr, bestQuery);
    if (!Number.isFinite(observed)) continue;

    const sigma = noiseLevel * Math.max(Math.abs(observed), 1);
    const tolerance = 3 * Math.max(sigma, 0.01 * Math.max(Math.abs(observed), 1));
    candidates = candidates.filter(c => {
      const predicted = evaluate(c.expr, bestQuery);
      return Number.isFinite(predicted) && Math.abs(predicted - observed) <= tolerance;
    });

    if (candidates.length === 0) {
      candidates = [PHYSICS_FORMULAS[0]];
      break;
    }
  }

  let best = candidates[0];
  let bestErr = Infinity;
  for (const c of candidates) {
    const err = computeTrainError(c.expr, dataset.train);
    if (err < bestErr) { bestErr = err; best = c; }
  }

  return { predicted: best, queryCost: budget };
}

// ---------------------------------------------------------------------------
// Baseline 6: oracle
// Always returns the correct formula.
// ---------------------------------------------------------------------------

function baselineOracle(target: PhysicsFormulaEntry): { predicted: SymExpr; queryCost: number } {
  return { predicted: target.expr, queryCost: 0 };
}

// ---------------------------------------------------------------------------
// Main Benchmark Runner
// ---------------------------------------------------------------------------

export async function runP4Benchmark(options: P4BenchmarkOptions): Promise<void> {
  const { noiseLevels, budget, seeds, outputDir } = options;
  const candidateCount = 20; // Number of candidates per generation round

  console.log('=== P4: Open-Ended Active Theory Search Benchmark ===\n');
  console.log(`Formulas: ${PHYSICS_FORMULAS.length}`);
  console.log(`Noise levels: ${noiseLevels.join(', ')}`);
  console.log(`Budget: ${budget} queries`);
  console.log(`Seeds: ${seeds}`);
  console.log(`Candidates per round: ${candidateCount}`);
  console.log(`Baselines: ${BASELINES.join(', ')}\n`);

  const allMetrics: P4Metrics[] = [];
  const failureCases: any[] = [];

  for (const noiseLevel of noiseLevels) {
    console.log(`--- Noise level: ${noiseLevel} ---`);

    for (const formula of PHYSICS_FORMULAS) {
      const ctx = buildCandidateContext(formula);

      for (let seedIdx = 0; seedIdx < seeds; seedIdx++) {
        const seed = 42 + seedIdx;
        const rng = mulberry32(seed);
        const dataset = generatePhysicsDataset(formula, {
          seed,
          noiseLevel,
          gridSize: 8,
        });

        for (const baseline of BASELINES) {
          let predictedExpr: SymExpr | null = null;
          let queryCost = 0;
          let stats: Partial<P4Metrics> = {};

          switch (baseline) {
            case 'llm_raw_candidate': {
              const r = baselineLlmRaw(ctx, formula, dataset, rng, candidateCount);
              predictedExpr = r.predicted;
              queryCost = r.queryCost;
              stats = r.stats;
              break;
            }
            case 'llm_plus_parser': {
              const r = baselineLlmPlusParser(ctx, formula, dataset, rng, candidateCount);
              predictedExpr = r.predicted;
              queryCost = r.queryCost;
              stats = r.stats;
              break;
            }
            case 'llm_plus_verifier': {
              const r = baselineLlmPlusVerifier(ctx, formula, dataset, rng, candidateCount);
              predictedExpr = r.predicted;
              queryCost = r.queryCost;
              stats = r.stats;
              break;
            }
            case 'llm_plus_active_infogain': {
              const r = baselineLlmPlusActiveInfogain(
                ctx, formula, dataset, rng, candidateCount, budget, noiseLevel,
              );
              predictedExpr = r.predicted;
              queryCost = r.queryCost;
              stats = r.stats;
              break;
            }
            case 'library_active_infogain': {
              const r = baselineLibraryActiveInfogain(formula, dataset, budget, noiseLevel, rng);
              predictedExpr = r.predicted ? r.predicted.expr : null;
              queryCost = r.queryCost;
              break;
            }
            case 'oracle': {
              const r = baselineOracle(formula);
              predictedExpr = r.predicted;
              queryCost = r.queryCost;
              break;
            }
          }

          // Compute metrics
          const r2 = predictedExpr
            ? computeR2(predictedExpr, dataset.heldout, Object.keys(formula.variableDimensions))
            : 0;
          const recovered = predictedExpr ? symbolicEquivalent(predictedExpr, formula) : false;

          // Compute dimension rates for baselines that don't already have them
          if (stats.verifierPassRate === undefined && predictedExpr) {
            stats.invalidDimensionRate = isDimensionallyValid(
              predictedExpr, formula.variableDimensions, formula.outputDimension,
            ) ? 0 : 1;
          }

          const metrics: P4Metrics = {
            formulaId: formula.id,
            baseline,
            noiseLevel,
            seed,
            parseSuccessRate: stats.parseSuccessRate ?? 0,
            verifierPassRate: stats.verifierPassRate ?? 0,
            heldoutAccuracy: r2,
            correctionRecoveryRate: recovered ? 1 : 0,
            hallucinationRate: stats.hallucinationRate ?? 0,
            invalidDimensionRate: stats.invalidDimensionRate ?? 0,
            queryCost,
            oracleGap: 1 - r2,
            candidateSetSize: candidateCount,
          };

          allMetrics.push(metrics);

          // Record failure cases (non-oracle baselines that don't recover the correct formula)
          if (!recovered && baseline !== 'oracle') {
            failureCases.push({
              formulaId: formula.id,
              baseline,
              noiseLevel,
              seed,
              heldoutAccuracy: r2,
              correctionRecoveryRate: 0,
              parseSuccessRate: metrics.parseSuccessRate,
              hallucinationRate: metrics.hallucinationRate,
              invalidDimensionRate: metrics.invalidDimensionRate,
              queryCost,
            });
          }
        }
      }
    }
  }

  // Generate report
  const report = generateReport(allMetrics, noiseLevels, budget, seeds);
  const summary = generateSummaryCSV(allMetrics, noiseLevels);

  // Write outputs
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'report.md'), report);
  fs.writeFileSync(path.join(outputDir, 'summary.csv'), summary);
  fs.writeFileSync(
    path.join(outputDir, 'failure_cases.jsonl'),
    failureCases.map(fc => JSON.stringify(fc)).join('\n') + '\n',
  );

  console.log(`\nResults written to ${outputDir}/`);
  console.log(`  report.md`);
  console.log(`  summary.csv`);
  console.log(`  failure_cases.jsonl`);
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function generateReport(
  metrics: P4Metrics[],
  noiseLevels: number[],
  budget: number,
  seeds: number,
): string {
  const lines: string[] = [];

  lines.push('# P4: Open-Ended Active Theory Search Benchmark Report\n');
  lines.push(`**Formulas**: ${PHYSICS_FORMULAS.length}`);
  lines.push(`**Noise levels**: ${noiseLevels.join(', ')}`);
  lines.push(`**Budget**: ${budget} queries`);
  lines.push(`**Seeds**: ${seeds}`);
  lines.push(`**Baselines**: ${BASELINES.join(', ')}\n`);

  for (const noise of noiseLevels) {
    lines.push(`## Noise = ${noise}\n`);

    // Main results table
    lines.push('### Main Results\n');
    lines.push('| Baseline | Parse Success | Verifier Pass | Hallucination | Invalid Dim | Recovery Rate | Avg R² | Avg Queries | Oracle Gap |');
    lines.push('|----------|-------------:|--------------:|--------------:|------------:|--------------:|-------:|------------:|-----------:|');

    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const parseSuccess = bm.reduce((s, m) => s + m.parseSuccessRate, 0) / bm.length;
      const verifierPass = bm.reduce((s, m) => s + m.verifierPassRate, 0) / bm.length;
      const hallucination = bm.reduce((s, m) => s + m.hallucinationRate, 0) / bm.length;
      const invalidDim = bm.reduce((s, m) => s + m.invalidDimensionRate, 0) / bm.length;
      const recoveryRate = bm.filter(m => m.correctionRecoveryRate === 1).length / bm.length;
      const avgR2 = bm.reduce((s, m) => s + m.heldoutAccuracy, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const oracleGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      lines.push(
        `| ${baseline} | ${(parseSuccess * 100).toFixed(1)}% | ${(verifierPass * 100).toFixed(1)}% | ${(hallucination * 100).toFixed(1)}% | ${(invalidDim * 100).toFixed(1)}% | ${(recoveryRate * 100).toFixed(1)}% | ${avgR2.toFixed(4)} | ${avgQueries.toFixed(1)} | ${oracleGap.toFixed(4)} |`,
      );
    }
    lines.push('');

    // LLM-specific analysis (only for LLM baselines)
    const llmBaselines = ['llm_raw_candidate', 'llm_plus_parser', 'llm_plus_verifier', 'llm_plus_active_infogain'];
    lines.push('### LLM Candidate Quality\n');
    lines.push('| Baseline | Parse Success | Hallucination Rate | Verifier Pass Rate | Invalid Dim Rate |');
    lines.push('|----------|-------------:|-------------------:|-------------------:|-----------------:|');

    for (const baseline of llmBaselines) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const parseSuccess = bm.reduce((s, m) => s + m.parseSuccessRate, 0) / bm.length;
      const hallucination = bm.reduce((s, m) => s + m.hallucinationRate, 0) / bm.length;
      const verifierPass = bm.reduce((s, m) => s + m.verifierPassRate, 0) / bm.length;
      const invalidDim = bm.reduce((s, m) => s + m.invalidDimensionRate, 0) / bm.length;

      lines.push(
        `| ${baseline} | ${(parseSuccess * 100).toFixed(1)}% | ${(hallucination * 100).toFixed(1)}% | ${(verifierPass * 100).toFixed(1)}% | ${(invalidDim * 100).toFixed(1)}% |`,
      );
    }
    lines.push('');
  }

  // Cross-noise comparison
  lines.push('## Cross-Noise Comparison\n');
  lines.push('| Baseline | Noise 0 Recovery | Noise 0.01 Recovery | Noise 0.05 Recovery | Noise 0 Avg R² | Noise 0.05 Avg R² |');
  lines.push('|----------|----------------:|--------------------:|--------------------:|---------------:|------------------:|');

  for (const baseline of BASELINES) {
    const cells: string[] = [baseline];
    for (const noise of noiseLevels) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      const recovery = bm.length > 0 ? bm.filter(m => m.correctionRecoveryRate === 1).length / bm.length : 0;
      cells.push(`${(recovery * 100).toFixed(1)}%`);
    }
    // R² for noise=0 and noise=0.05
    const bm0 = metrics.filter(m => m.baseline === baseline && m.noiseLevel === 0);
    const bm005 = metrics.filter(m => m.baseline === baseline && m.noiseLevel === 0.05);
    const r2_0 = bm0.length > 0 ? bm0.reduce((s, m) => s + m.heldoutAccuracy, 0) / bm0.length : 0;
    const r2_005 = bm005.length > 0 ? bm005.reduce((s, m) => s + m.heldoutAccuracy, 0) / bm005.length : 0;
    cells.push(r2_0.toFixed(4));
    cells.push(r2_005.toFixed(4));
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  // Claim boundary
  lines.push('## Claim Boundary\n');
  lines.push('**Allowed**: P4 explores open-ended candidate generation in controlled settings. LLMs are used as proposal mechanisms, not final judges. External verification remains necessary.');
  lines.push('**Forbidden**: The system autonomously discovers new physics. The system is a complete AI scientist. The system has solved open-ended scientific discovery.');

  return lines.join('\n');
}

function generateSummaryCSV(metrics: P4Metrics[], noiseLevels: number[]): string {
  const header = 'baseline,noise_level,parse_success_rate,verifier_pass_rate,hallucination_rate,invalid_dimension_rate,recovery_rate,avg_r2,avg_queries,oracle_gap';
  const rows: string[] = [];

  for (const noise of noiseLevels) {
    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const parseSuccess = bm.reduce((s, m) => s + m.parseSuccessRate, 0) / bm.length;
      const verifierPass = bm.reduce((s, m) => s + m.verifierPassRate, 0) / bm.length;
      const hallucination = bm.reduce((s, m) => s + m.hallucinationRate, 0) / bm.length;
      const invalidDim = bm.reduce((s, m) => s + m.invalidDimensionRate, 0) / bm.length;
      const recoveryRate = bm.filter(m => m.correctionRecoveryRate === 1).length / bm.length;
      const avgR2 = bm.reduce((s, m) => s + m.heldoutAccuracy, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const oracleGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      rows.push(
        `${baseline},${noise},${parseSuccess.toFixed(4)},${verifierPass.toFixed(4)},${hallucination.toFixed(4)},${invalidDim.toFixed(4)},${recoveryRate.toFixed(4)},${avgR2.toFixed(4)},${avgQueries.toFixed(1)},${oracleGap.toFixed(4)}`,
      );
    }
  }

  return header + '\n' + rows.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  let noiseLevels = [0, 0.01, 0.05];
  let budget = 10;
  let seeds = 3;
  let outputDir = 'results/p4_open_ended_search';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--noise' && args[i + 1]) {
      noiseLevels = args[++i].split(',').map(Number);
    } else if (args[i] === '--budget' && args[i + 1]) {
      budget = parseInt(args[++i]);
    } else if (args[i] === '--seeds' && args[i + 1]) {
      seeds = parseInt(args[++i]);
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[++i];
    }
  }

  await runP4Benchmark({ noiseLevels, budget, seeds, outputDir });
}

main().catch(e => {
  console.error(`P4 benchmark failed: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
