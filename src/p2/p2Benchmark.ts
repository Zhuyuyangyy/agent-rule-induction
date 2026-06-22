// P2 Benchmark: Physics-Constrained Law Rediscovery
// Given data from known physics formulas, rediscover the formula under
// numerical fit, symbolic equivalence, dimensional homogeneity, and
// complexity penalty. This is controlled law rediscovery, not new physics.

import { evaluate, complexity, type SymExpr } from '../p1/symbolicExpr.js';
import { PHYSICS_FORMULAS, getFormulaById } from './physicsFormulaLibrary.js';
import type { PhysicsFormulaEntry } from './physicsExpr.js';
import { generatePhysicsDataset, type DataPoint, type PhysicsDataset } from './p2Dataset.js';
import { computeP2Metrics, type P2Metrics, candidateDimensionalValidity, heldoutAccuracy } from './p2Score.js';
import { inferDimension, dimEqual, type DimVector } from './dimensionalConstraints.js';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Baseline: random_search
// ---------------------------------------------------------------------------

function randomSearch(
  dataset: PhysicsDataset,
  formulas: PhysicsFormulaEntry[],
  rng: () => number,
): { predicted: PhysicsFormulaEntry; queryCost: number } {
  const idx = Math.floor(rng() * formulas.length);
  return { predicted: formulas[idx], queryCost: 0 };
}

// ---------------------------------------------------------------------------
// Baseline: greedy_symbolic_search
// ---------------------------------------------------------------------------

function greedySymbolicSearch(
  dataset: PhysicsDataset,
  formulas: PhysicsFormulaEntry[],
): { predicted: PhysicsFormulaEntry; queryCost: number } {
  const varNames = Object.keys(dataset.formula.variableDimensions);
  let bestFormula = formulas[0];
  let bestError = Infinity;

  for (const formula of formulas) {
    const fVarNames = Object.keys(formula.variableDimensions);
    if (fVarNames.length !== varNames.length) continue;

    let totalError = 0;
    let validCount = 0;
    for (const dp of dataset.train) {
      const predicted = evaluate(formula.expr, dp.inputs);
      if (!Number.isFinite(predicted)) continue;
      totalError += (predicted - dp.output) ** 2;
      validCount++;
    }

    if (validCount > 0) {
      const mse = totalError / validCount;
      if (mse < bestError) {
        bestError = mse;
        bestFormula = formula;
      }
    }
  }

  return { predicted: bestFormula, queryCost: 10 };
}

// ---------------------------------------------------------------------------
// Baseline: active_random
// ---------------------------------------------------------------------------

function activeRandom(
  dataset: PhysicsDataset,
  formulas: PhysicsFormulaEntry[],
  budget: number,
  rng: () => number,
): { predicted: PhysicsFormulaEntry; queryCost: number } {
  const varNames = Object.keys(dataset.formula.variableDimensions);
  let candidates = [...formulas];

  for (let q = 0; q < budget && candidates.length > 1; q++) {
    // Random query point
    const queryInputs: Record<string, number> = {};
    for (const name of varNames) {
      queryInputs[name] = 0.5 + rng() * 9.5;
    }

    // Observe target
    const observed = evaluate(dataset.formula.expr, queryInputs);
    if (!Number.isFinite(observed)) continue;

    // Filter candidates
    const tolerance = 3 * 0.1 * Math.max(Math.abs(observed), 1); // noise-dependent
    candidates = candidates.filter(f => {
      const predicted = evaluate(f.expr, queryInputs);
      return Number.isFinite(predicted) && Math.abs(predicted - observed) <= tolerance;
    });

    if (candidates.length === 0) {
      candidates = [formulas[0]];
      break;
    }
  }

  // Pick candidate with lowest train error
  let best = candidates[0];
  let bestErr = Infinity;
  for (const c of candidates) {
    const err = computeTrainError(c, dataset);
    if (err < bestErr) { bestErr = err; best = c; }
  }

  return { predicted: best, queryCost: budget };
}

// ---------------------------------------------------------------------------
// Baseline: active_infogain
// ---------------------------------------------------------------------------

function activeInfogain(
  dataset: PhysicsDataset,
  formulas: PhysicsFormulaEntry[],
  budget: number,
  noiseLevel: number,
): { predicted: PhysicsFormulaEntry; queryCost: number } {
  const varNames = Object.keys(dataset.formula.variableDimensions);
  let candidates = [...formulas];

  for (let q = 0; q < budget && candidates.length > 1; q++) {
    // Sample candidate query points
    const queryPoints: Record<string, number>[] = [];
    for (let s = 0; s < 20; s++) {
      const qp: Record<string, number> = {};
      for (const name of varNames) {
        qp[name] = 0.5 + Math.random() * 9.5;
      }
      queryPoints.push(qp);
    }

    // Select query with max variance across candidates
    let bestQuery = queryPoints[0];
    let bestVariance = -1;

    for (const qp of queryPoints) {
      const outputs = candidates.map(c => {
        return evaluate(c.expr, qp);
      }).filter(Number.isFinite);

      if (outputs.length < 2) continue;
      const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length;
      const variance = outputs.reduce((a, b) => a + (b - mean) ** 2, 0) / outputs.length;

      if (variance > bestVariance) {
        bestVariance = variance;
        bestQuery = qp;
      }
    }

    // Observe target
    const observed = evaluate(dataset.formula.expr, bestQuery);
    if (!Number.isFinite(observed)) continue;

    // Filter candidates
    const sigma = noiseLevel * Math.max(Math.abs(observed), 1);
    const tolerance = 3 * sigma;
    candidates = candidates.filter(c => {
      const predicted = evaluate(c.expr, bestQuery);
      return Number.isFinite(predicted) && Math.abs(predicted - observed) <= tolerance;
    });

    if (candidates.length === 0) {
      candidates = [formulas[0]];
      break;
    }
  }

  let best = candidates[0];
  let bestErr = Infinity;
  for (const c of candidates) {
    const err = computeTrainError(c, dataset);
    if (err < bestErr) { bestErr = err; best = c; }
  }

  return { predicted: best, queryCost: budget };
}

// ---------------------------------------------------------------------------
// Baseline: active_infogain_plus_verifier
// ---------------------------------------------------------------------------

function activeInfogainPlusVerifier(
  dataset: PhysicsDataset,
  formulas: PhysicsFormulaEntry[],
  budget: number,
  noiseLevel: number,
): { predicted: PhysicsFormulaEntry; queryCost: number; verifierRejectionRate: number } {
  const targetOutputDim = dataset.formula.outputDimension;

  // Pre-filter: keep only candidates whose output dimension matches target.
  // This is the physically meaningful constraint: we know the output dimension
  // of the target, so we filter candidates by output dimension.
  // Note: we do NOT check the candidate's own dimensional validity here,
  // because some formulas have simplified dimensions that fail self-checks
  // (e.g., electromagnetism with simplified current dimension).
  let candidates = formulas.filter(f => {
    return dimEqual(f.outputDimension, targetOutputDim);
  });

  const totalOriginal = formulas.length;
  const afterVerifier = candidates.length;
  const verifierRejectionRate = totalOriginal > 0
    ? (totalOriginal - afterVerifier) / totalOriginal
    : 0;

  if (candidates.length === 0) {
    candidates = [formulas[0]];
  }

  // Then run active_infogain on the filtered set
  const result = activeInfogain(dataset, candidates, budget, noiseLevel);
  return { ...result, verifierRejectionRate };
}

// ---------------------------------------------------------------------------
// Baseline: oracle
// ---------------------------------------------------------------------------

function oracle(
  dataset: PhysicsDataset,
): { predicted: PhysicsFormulaEntry; queryCost: number } {
  return { predicted: dataset.formula, queryCost: 0 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTrainError(formula: PhysicsFormulaEntry, dataset: PhysicsDataset): number {
  let totalError = 0;
  let count = 0;
  for (const dp of dataset.train) {
    const predicted = evaluate(formula.expr, dp.inputs);
    if (!Number.isFinite(predicted)) continue;
    totalError += (predicted - dp.output) ** 2;
    count++;
  }
  return count > 0 ? totalError / count : Infinity;
}

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
// Main Benchmark Runner
// ---------------------------------------------------------------------------

export interface P2BenchmarkOptions {
  noiseLevels: number[];
  budget: number;
  seeds: number;
  outputDir: string;
}

const BASELINES = [
  'random_search',
  'greedy_symbolic_search',
  'active_random',
  'active_infogain',
  'active_infogain_plus_verifier',
  'oracle',
] as const;

type BaselineName = typeof BASELINES[number];

export async function runP2Benchmark(options: P2BenchmarkOptions): Promise<void> {
  const { noiseLevels, budget, seeds, outputDir } = options;

  console.log('=== P2: Physics-Constrained Law Rediscovery Benchmark ===\n');
  console.log(`Formulas: ${PHYSICS_FORMULAS.length}`);
  console.log(`Noise levels: ${noiseLevels.join(', ')}`);
  console.log(`Budget: ${budget} queries`);
  console.log(`Seeds: ${seeds}`);
  console.log(`Baselines: ${BASELINES.join(', ')}\n`);

  const allMetrics: P2Metrics[] = [];
  const failureCases: any[] = [];

  for (const noiseLevel of noiseLevels) {
    console.log(`--- Noise level: ${noiseLevel} ---`);

    for (const formula of PHYSICS_FORMULAS) {
      for (let seedIdx = 0; seedIdx < seeds; seedIdx++) {
        const seed = 42 + seedIdx;
        const rng = mulberry32(seed);
        const dataset = generatePhysicsDataset(formula, {
          seed,
          noiseLevel,
          gridSize: 8,
        });

        for (const baseline of BASELINES) {
          let result: { predicted: PhysicsFormulaEntry | null; queryCost: number; verifierRejectionRate?: number };

          switch (baseline) {
            case 'random_search': {
              const r = randomSearch(dataset, PHYSICS_FORMULAS, rng);
              result = { predicted: r.predicted, queryCost: r.queryCost };
              break;
            }
            case 'greedy_symbolic_search': {
              const r = greedySymbolicSearch(dataset, PHYSICS_FORMULAS);
              result = { predicted: r.predicted, queryCost: r.queryCost };
              break;
            }
            case 'active_random': {
              const r = activeRandom(dataset, PHYSICS_FORMULAS, budget, rng);
              result = { predicted: r.predicted, queryCost: r.queryCost };
              break;
            }
            case 'active_infogain': {
              const r = activeInfogain(dataset, PHYSICS_FORMULAS, budget, noiseLevel);
              result = { predicted: r.predicted, queryCost: r.queryCost };
              break;
            }
            case 'active_infogain_plus_verifier': {
              const r = activeInfogainPlusVerifier(dataset, PHYSICS_FORMULAS, budget, noiseLevel);
              result = { predicted: r.predicted, queryCost: r.queryCost, verifierRejectionRate: r.verifierRejectionRate };
              break;
            }
            case 'oracle': {
              const r = oracle(dataset);
              result = { predicted: r.predicted, queryCost: r.queryCost };
              break;
            }
          }

          const metrics = computeP2Metrics(
            result.predicted,
            formula,
            dataset.heldout,
            baseline,
            noiseLevel,
            result.queryCost,
            PHYSICS_FORMULAS.length,
            result.verifierRejectionRate ?? 0,
          );
          allMetrics.push(metrics);

          // Record failure cases
          if (!metrics.symbolicEquivalent && baseline !== 'oracle' && baseline !== 'random_search') {
            failureCases.push({
              formulaId: formula.id,
              baseline,
              noiseLevel,
              seed,
              heldoutAccuracy: metrics.heldoutAccuracy,
              dimensionalValidity: metrics.dimensionalValidity,
              complexity: metrics.complexity,
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
  metrics: P2Metrics[],
  noiseLevels: number[],
  budget: number,
  seeds: number,
): string {
  const lines: string[] = [];

  lines.push('# P2: Physics-Constrained Law Rediscovery Benchmark Report\n');
  lines.push(`**Formulas**: ${PHYSICS_FORMULAS.length}`);
  lines.push(`**Noise levels**: ${noiseLevels.join(', ')}`);
  lines.push(`**Budget**: ${budget} queries`);
  lines.push(`**Seeds**: ${seeds}`);
  lines.push(`**Baselines**: ${BASELINES.join(', ')}\n`);

  for (const noise of noiseLevels) {
    lines.push(`## Noise = ${noise}\n`);
    lines.push('| Baseline | SymEq Rate | DimValid Rate | Avg R² | Avg Queries | Verifier Rej Rate | Oracle Gap |');
    lines.push('|----------|-----------:|-------------:|-------:|------------:|------------------:|-----------:|');

    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const symEqRate = bm.filter(m => m.symbolicEquivalent).length / bm.length;
      const dimValidRate = bm.filter(m => m.dimensionalValidity).length / bm.length;
      const avgR2 = bm.reduce((s, m) => s + m.heldoutAccuracy, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const avgVerifRej = bm.reduce((s, m) => s + m.verifierRejectionRate, 0) / bm.length;
      const avgOracleGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      lines.push(
        `| ${baseline} | ${(symEqRate * 100).toFixed(1)}% | ${(dimValidRate * 100).toFixed(1)}% | ${avgR2.toFixed(4)} | ${avgQueries.toFixed(1)} | ${(avgVerifRej * 100).toFixed(1)}% | ${avgOracleGap.toFixed(4)} |`,
      );
    }
    lines.push('');
  }

  // Claim boundary
  lines.push('## Claim Boundary\n');
  lines.push('**Allowed**: P2 evaluates physics-constrained law rediscovery in controlled settings. Verifier constraints improve rejection of invalid symbolic candidates.');
  lines.push('**Forbidden**: P2 discovers new physics. P2 surpasses known physics. P2 discovers laws beyond relativity.');

  return lines.join('\n');
}

function generateSummaryCSV(metrics: P2Metrics[], noiseLevels: number[]): string {
  const header = 'baseline,noise_level,symeq_rate,dimvalid_rate,avg_r2,avg_queries,verifier_rejection_rate,oracle_gap';
  const rows: string[] = [];

  for (const noise of noiseLevels) {
    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const symEqRate = bm.filter(m => m.symbolicEquivalent).length / bm.length;
      const dimValidRate = bm.filter(m => m.dimensionalValidity).length / bm.length;
      const avgR2 = bm.reduce((s, m) => s + m.heldoutAccuracy, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const avgVerifRej = bm.reduce((s, m) => s + m.verifierRejectionRate, 0) / bm.length;
      const avgOracleGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      rows.push(
        `${baseline},${noise},${symEqRate.toFixed(4)},${dimValidRate.toFixed(4)},${avgR2.toFixed(4)},${avgQueries.toFixed(1)},${avgVerifRej.toFixed(4)},${avgOracleGap.toFixed(4)}`,
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
  let outputDir = 'results/p2_physics_constrained';

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

  await runP2Benchmark({ noiseLevels, budget, seeds, outputDir });
}

main().catch(e => {
  console.error(`P2 benchmark failed: ${e.message}`);
  process.exit(1);
});
