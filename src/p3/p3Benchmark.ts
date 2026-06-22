// P3 Benchmark: Anomaly-Driven Theory Refinement
// Given a baseline model and residual anomaly data, discover the planted
// correction term. Inspired by historical scientific anomalies (e.g., Mercury
// perihelion), but uses simplified synthetic scenarios — NOT real physics.
//
// Claim boundary:
//   Allowed: P3 tests anomaly-driven theory refinement in a controlled sandbox.
//   Forbidden: The system discovered general relativity or solved Mercury perihelion.

import { evaluate, type SymExpr } from '../p1/symbolicExpr.js';
import { inferDimension, dimEqual, type DimVector } from '../p2/dimensionalConstraints.js';
import { ANOMALY_SCENARIOS, generateAnomalyDataset, type AnomalyDataset } from './anomalyDataset.js';
import { generateCandidateCorrections, type CorrectionCandidate } from './candidateCorrections.js';
import {
  computeP3Metrics, heldoutResidualReduction, computeResidual, computeBaselineResidual,
  type P3Metrics,
} from './anomalyScore.js';
import * as fs from 'fs';
import * as path from 'path';

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
// Baseline 1: baseline_model_only — always return null correction
// ---------------------------------------------------------------------------

function baselineModelOnly(
  candidates: CorrectionCandidate[],
): { selected: CorrectionCandidate; queryCost: number } {
  const nullCand = candidates.find(c => c.isNull);
  return { selected: nullCand ?? candidates[candidates.length - 1], queryCost: 0 };
}

// ---------------------------------------------------------------------------
// Baseline 2: random_correction_search — randomly pick a correction
// ---------------------------------------------------------------------------

function randomCorrectionSearch(
  candidates: CorrectionCandidate[],
  rng: () => number,
): { selected: CorrectionCandidate; queryCost: number } {
  const idx = Math.floor(rng() * candidates.length);
  return { selected: candidates[idx], queryCost: 0 };
}

// ---------------------------------------------------------------------------
// Baseline 3: greedy_residual_fit — fit each correction, pick lowest residual
// ---------------------------------------------------------------------------

function greedyResidualFit(
  dataset: AnomalyDataset,
  candidates: CorrectionCandidate[],
): { selected: CorrectionCandidate; queryCost: number } {
  let best = candidates[0];
  let bestResidual = Infinity;

  for (const candidate of candidates) {
    const res = computeResidual(candidate.expr, dataset, dataset.train);
    if (res < bestResidual) {
      bestResidual = res;
      best = candidate;
    }
  }

  return { selected: best, queryCost: candidates.length };
}

// ---------------------------------------------------------------------------
// Baseline 4: active_random_correction — random queries, filter by residual
// ---------------------------------------------------------------------------

function activeRandomCorrection(
  dataset: AnomalyDataset,
  candidates: CorrectionCandidate[],
  budget: number,
  rng: () => number,
): { selected: CorrectionCandidate; queryCost: number } {
  const varNames = Object.keys(dataset.variableDimensions);
  let remaining = [...candidates];

  for (let q = 0; q < budget && remaining.length > 1; q++) {
    // Random query point
    const queryInputs: Record<string, number> = {};
    for (const name of varNames) {
      const [lo, hi] = getVarRange(dataset, name);
      queryInputs[name] = lo + rng() * (hi - lo);
    }

    // Observe target
    const observed = evaluate(dataset.fullModel, queryInputs);
    if (!Number.isFinite(observed)) continue;

    // Filter candidates by residual at this point
    const baselinePred = evaluate(dataset.baselineModel, queryInputs);
    const anomalyAtPoint = observed - baselinePred;

    const tolerance = 3 * 0.1 * Math.max(Math.abs(anomalyAtPoint), 1);
    remaining = remaining.filter(c => {
      const correctionPred = evaluate(c.expr, queryInputs);
      if (!Number.isFinite(correctionPred)) return false;
      return Math.abs(correctionPred - anomalyAtPoint) <= tolerance;
    });

    if (remaining.length === 0) {
      remaining = [candidates[0]];
      break;
    }
  }

  // Pick candidate with lowest train residual
  let best = remaining[0];
  let bestErr = Infinity;
  for (const c of remaining) {
    const err = computeResidual(c.expr, dataset, dataset.train);
    if (err < bestErr) { bestErr = err; best = c; }
  }

  return { selected: best, queryCost: budget };
}

// ---------------------------------------------------------------------------
// Baseline 5: active_infogain_correction — max-variance queries, filter
// ---------------------------------------------------------------------------

function activeInfogainCorrection(
  dataset: AnomalyDataset,
  candidates: CorrectionCandidate[],
  budget: number,
  noiseLevel: number,
): { selected: CorrectionCandidate; queryCost: number } {
  const varNames = Object.keys(dataset.variableDimensions);
  let remaining = [...candidates];

  for (let q = 0; q < budget && remaining.length > 1; q++) {
    // Sample candidate query points
    const queryPoints: Record<string, number>[] = [];
    for (let s = 0; s < 20; s++) {
      const qp: Record<string, number> = {};
      for (const name of varNames) {
        const [lo, hi] = getVarRange(dataset, name);
        qp[name] = lo + Math.random() * (hi - lo);
      }
      queryPoints.push(qp);
    }

    // Select query with max variance across candidate corrections
    let bestQuery = queryPoints[0];
    let bestVariance = -1;

    for (const qp of queryPoints) {
      const outputs = remaining.map(c => evaluate(c.expr, qp)).filter(Number.isFinite);
      if (outputs.length < 2) continue;

      const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length;
      const variance = outputs.reduce((a, b) => a + (b - mean) ** 2, 0) / outputs.length;

      if (variance > bestVariance) {
        bestVariance = variance;
        bestQuery = qp;
      }
    }

    // Observe anomaly at best query
    const observed = evaluate(dataset.fullModel, bestQuery);
    const baselinePred = evaluate(dataset.baselineModel, bestQuery);
    if (!Number.isFinite(observed) || !Number.isFinite(baselinePred)) continue;

    const anomalyAtPoint = observed - baselinePred;
    const sigma = noiseLevel * Math.max(Math.abs(anomalyAtPoint), 1);
    const tolerance = 3 * sigma;

    remaining = remaining.filter(c => {
      const correctionPred = evaluate(c.expr, bestQuery);
      return Number.isFinite(correctionPred) && Math.abs(correctionPred - anomalyAtPoint) <= tolerance;
    });

    if (remaining.length === 0) {
      remaining = [candidates[0]];
      break;
    }
  }

  let best = remaining[0];
  let bestErr = Infinity;
  for (const c of remaining) {
    const err = computeResidual(c.expr, dataset, dataset.train);
    if (err < bestErr) { bestErr = err; best = c; }
  }

  return { selected: best, queryCost: budget };
}

// ---------------------------------------------------------------------------
// Baseline 6: active_infogain_plus_verifier — pre-filter by dimensional
// validity, then active infogain
// ---------------------------------------------------------------------------

function activeInfogainPlusVerifier(
  dataset: AnomalyDataset,
  candidates: CorrectionCandidate[],
  budget: number,
  noiseLevel: number,
): { selected: CorrectionCandidate; queryCost: number; verifierRejectionRate: number } {
  // Pre-filter: keep only candidates whose output dimension matches target
  const targetOutputDim = dataset.outputDimension;
  const filtered = candidates.filter(c => {
    if (c.isNull) return true; // Null correction is always allowed
    const inferred = inferDimension(c.expr, dataset.variableDimensions);
    if (inferred === null) return false;
    return dimEqual(inferred, targetOutputDim);
  });

  const totalOriginal = candidates.length;
  const afterVerifier = filtered.length;
  const verifierRejectionRate = totalOriginal > 0
    ? (totalOriginal - afterVerifier) / totalOriginal
    : 0;

  const effectiveCandidates = filtered.length > 0 ? filtered : [candidates[0]];

  const result = activeInfogainCorrection(dataset, effectiveCandidates, budget, noiseLevel);
  return { ...result, verifierRejectionRate };
}

// ---------------------------------------------------------------------------
// Baseline 7: oracle_planted_correction — always return the planted correction
// ---------------------------------------------------------------------------

function oraclePlantedCorrection(
  dataset: AnomalyDataset,
  candidates: CorrectionCandidate[],
): { selected: CorrectionCandidate; queryCost: number } {
  // Find the candidate matching the planted family
  const match = candidates.find(c => c.family === dataset.plantedFamily);
  if (match) return { selected: match, queryCost: 0 };

  // Fallback: create a synthetic candidate from the planted correction
  return {
    selected: {
      id: 'oracle',
      family: dataset.plantedFamily,
      expr: dataset.plantedCorrection,
      description: 'Oracle: planted correction',
      expectedDimension: dataset.outputDimension,
      complexity: 0,
      isNull: dataset.plantedFamily === 'null_correction',
      isSpurious: false,
    },
    queryCost: 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVarRange(dataset: AnomalyDataset, varName: string): [number, number] {
  // Find the scenario to get ranges
  const scenario = ANOMALY_SCENARIOS.find(s => s.id === dataset.id);
  if (scenario && scenario.variableRanges[varName]) {
    return scenario.variableRanges[varName];
  }
  return [0.5, 5];
}

// ---------------------------------------------------------------------------
// Main Benchmark Runner
// ---------------------------------------------------------------------------

export interface P3BenchmarkOptions {
  noiseLevels: number[];
  budget: number;
  seeds: number;
  outputDir: string;
}

const BASELINES = [
  'baseline_model_only',
  'random_correction_search',
  'greedy_residual_fit',
  'active_random_correction',
  'active_infogain_correction',
  'active_infogain_plus_verifier',
  'oracle_planted_correction',
] as const;

type BaselineName = typeof BASELINES[number];

export async function runP3Benchmark(options: P3BenchmarkOptions): Promise<void> {
  const { noiseLevels, budget, seeds, outputDir } = options;

  console.log('=== P3: Anomaly-Driven Theory Refinement Benchmark ===\n');
  console.log(`Scenarios: ${ANOMALY_SCENARIOS.length}`);
  console.log(`Noise levels: ${noiseLevels.join(', ')}`);
  console.log(`Budget: ${budget} queries`);
  console.log(`Seeds: ${seeds}`);
  console.log(`Baselines: ${BASELINES.join(', ')}\n`);

  const allMetrics: P3Metrics[] = [];
  const failureCases: any[] = [];

  for (const noiseLevel of noiseLevels) {
    console.log(`--- Noise level: ${noiseLevel} ---`);

    for (const scenario of ANOMALY_SCENARIOS) {
      for (let seedIdx = 0; seedIdx < seeds; seedIdx++) {
        const seed = 42 + seedIdx;
        const rng = mulberry32(seed);
        const dataset = generateAnomalyDataset(scenario, {
          seed,
          noiseLevel,
          gridSize: 6,
        });

        const candidates = generateCandidateCorrections(
          dataset.variableDimensions,
          dataset.outputDimension,
        );

        // Compute oracle reduction for gap calculation
        const oracleResult = oraclePlantedCorrection(dataset, candidates);
        const oracleReduction = heldoutResidualReduction(oracleResult.selected.expr, dataset);

        for (const baseline of BASELINES) {
          let result: { selected: CorrectionCandidate | null; queryCost: number; verifierRejectionRate?: number };

          switch (baseline) {
            case 'baseline_model_only': {
              const r = baselineModelOnly(candidates);
              result = { selected: r.selected, queryCost: r.queryCost };
              break;
            }
            case 'random_correction_search': {
              const r = randomCorrectionSearch(candidates, rng);
              result = { selected: r.selected, queryCost: r.queryCost };
              break;
            }
            case 'greedy_residual_fit': {
              const r = greedyResidualFit(dataset, candidates);
              result = { selected: r.selected, queryCost: r.queryCost };
              break;
            }
            case 'active_random_correction': {
              const r = activeRandomCorrection(dataset, candidates, budget, rng);
              result = { selected: r.selected, queryCost: r.queryCost };
              break;
            }
            case 'active_infogain_correction': {
              const r = activeInfogainCorrection(dataset, candidates, budget, noiseLevel);
              result = { selected: r.selected, queryCost: r.queryCost };
              break;
            }
            case 'active_infogain_plus_verifier': {
              const r = activeInfogainPlusVerifier(dataset, candidates, budget, noiseLevel);
              result = { selected: r.selected, queryCost: r.queryCost, verifierRejectionRate: r.verifierRejectionRate };
              break;
            }
            case 'oracle_planted_correction': {
              const r = oraclePlantedCorrection(dataset, candidates);
              result = { selected: r.selected, queryCost: r.queryCost };
              break;
            }
          }

          const metrics = computeP3Metrics(
            result.selected,
            dataset,
            baseline,
            noiseLevel,
            seed,
            result.queryCost,
            oracleReduction,
          );
          allMetrics.push(metrics);

          // Record failure cases: non-oracle baselines that don't recover the correction
          if (!metrics.correctionRecoveryRate && baseline !== 'oracle_planted_correction' && baseline !== 'random_correction_search') {
            failureCases.push({
              scenarioId: dataset.id,
              baseline,
              noiseLevel,
              seed,
              selectedFamily: metrics.selectedFamily,
              plantedFamily: metrics.plantedFamily,
              heldoutResidualReduction: metrics.heldoutResidualReduction,
              anomalyResolutionRate: metrics.anomalyResolutionRate,
              dimensionalValidity: metrics.dimensionalValidity,
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
  metrics: P3Metrics[],
  noiseLevels: number[],
  budget: number,
  seeds: number,
): string {
  const lines: string[] = [];

  lines.push('# P3: Anomaly-Driven Theory Refinement Benchmark Report\n');
  lines.push(`**Scenarios**: ${ANOMALY_SCENARIOS.length}`);
  lines.push(`**Noise levels**: ${noiseLevels.join(', ')}`);
  lines.push(`**Budget**: ${budget} queries`);
  lines.push(`**Seeds**: ${seeds}`);
  lines.push(`**Baselines**: ${BASELINES.join(', ')}\n`);

  for (const noise of noiseLevels) {
    lines.push(`## Noise = ${noise}\n`);
    lines.push('| Baseline | Anomaly Res Rate | Heldout Red | Recovery Rate | FP Rate | DimValid Rate | Avg Complexity | Avg Queries | Oracle Gap |');
    lines.push('|----------|-----------------:|------------:|--------------:|--------:|-------------:|---------------:|------------:|-----------:|');

    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const anomalyResRate = bm.reduce((s, m) => s + m.anomalyResolutionRate, 0) / bm.length;
      const avgHeldoutRed = bm.reduce((s, m) => s + m.heldoutResidualReduction, 0) / bm.length;
      const recoveryRate = bm.filter(m => m.correctionRecoveryRate).length / bm.length;
      const fpRate = bm.reduce((s, m) => s + m.falsePositiveCorrectionRate, 0) / bm.length;
      const dimValidRate = bm.filter(m => m.dimensionalValidity).length / bm.length;
      const avgComplexity = bm.reduce((s, m) => s + m.complexity, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const avgOracleGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      lines.push(
        `| ${baseline} | ${(anomalyResRate * 100).toFixed(1)}% | ${avgHeldoutRed.toFixed(4)} | ${(recoveryRate * 100).toFixed(1)}% | ${(fpRate * 100).toFixed(1)}% | ${(dimValidRate * 100).toFixed(1)}% | ${avgComplexity.toFixed(1)} | ${avgQueries.toFixed(1)} | ${avgOracleGap.toFixed(4)} |`,
      );
    }
    lines.push('');
  }

  // Per-scenario breakdown
  lines.push('## Per-Scenario Breakdown\n');
  const scenarioIds = [...new Set(metrics.map(m => m.scenarioId))];
  for (const sid of scenarioIds) {
    lines.push(`### ${sid}\n`);
    const sm = metrics.filter(m => m.scenarioId === sid);
    const plantedFamily = sm[0]?.plantedFamily ?? 'unknown';
    lines.push(`**Planted correction family**: ${plantedFamily}\n`);
    lines.push('| Baseline | Recovery | Heldout Red | DimValid |');
    lines.push('|----------|---------:|------------:|---------:|');
    for (const baseline of BASELINES) {
      const bm = sm.filter(m => m.baseline === baseline);
      if (bm.length === 0) continue;
      const recoveryRate = bm.filter(m => m.correctionRecoveryRate).length / bm.length;
      const avgRed = bm.reduce((s, m) => s + m.heldoutResidualReduction, 0) / bm.length;
      const dimValid = bm.filter(m => m.dimensionalValidity).length / bm.length;
      lines.push(`| ${baseline} | ${(recoveryRate * 100).toFixed(1)}% | ${avgRed.toFixed(4)} | ${(dimValid * 100).toFixed(1)}% |`);
    }
    lines.push('');
  }

  // Claim boundary
  lines.push('## Claim Boundary\n');
  lines.push('**Allowed**: P3 tests anomaly-driven theory refinement in a controlled sandbox. P3 is inspired by historical scientific anomalies. P3 evaluates whether active search can recover planted correction terms.');
  lines.push('**Forbidden**: The system discovered general relativity. The system solved Mercury perihelion. The system surpassed relativity. The system discovered a deeper theory.');

  return lines.join('\n');
}

function generateSummaryCSV(metrics: P3Metrics[], noiseLevels: number[]): string {
  const header = 'baseline,noise_level,anomaly_resolution_rate,heldout_residual_reduction,correction_recovery_rate,false_positive_correction_rate,dimensional_validity_rate,avg_complexity,avg_queries,oracle_gap';
  const rows: string[] = [];

  for (const noise of noiseLevels) {
    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const anomalyResRate = bm.reduce((s, m) => s + m.anomalyResolutionRate, 0) / bm.length;
      const avgHeldoutRed = bm.reduce((s, m) => s + m.heldoutResidualReduction, 0) / bm.length;
      const recoveryRate = bm.filter(m => m.correctionRecoveryRate).length / bm.length;
      const fpRate = bm.reduce((s, m) => s + m.falsePositiveCorrectionRate, 0) / bm.length;
      const dimValidRate = bm.filter(m => m.dimensionalValidity).length / bm.length;
      const avgComplexity = bm.reduce((s, m) => s + m.complexity, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const avgOracleGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      rows.push(
        `${baseline},${noise},${anomalyResRate.toFixed(4)},${avgHeldoutRed.toFixed(4)},${recoveryRate.toFixed(4)},${fpRate.toFixed(4)},${dimValidRate.toFixed(4)},${avgComplexity.toFixed(1)},${avgQueries.toFixed(1)},${avgOracleGap.toFixed(4)}`,
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
  let outputDir = 'results/p3_anomaly_refinement';

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

  await runP3Benchmark({ noiseLevels, budget, seeds, outputDir });
}

main().catch(e => {
  console.error(`P3 benchmark failed: ${e.message}`);
  process.exit(1);
});
