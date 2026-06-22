// P1 Baselines
// 5 baselines for symbolic expression discovery:
// 1. random_search       - randomly pick a formula from the library
// 2. greedy_symbolic_search - evaluate all candidates on fixed points, pick best
// 3. active_random       - query target at random points, filter candidates
// 4. active_infogain     - query target at max-variance points, filter candidates
// 5. oracle              - always returns the correct formula

import { type SymExpr, evaluateArray } from './symbolicExpr.js';
import { ALL_FORMULAS, type FormulaEntry } from './formulaLibrary.js';
import { type Dataset, type DataPoint, generateDataset } from './dataset.js';
import { computeP1Metrics, type P1Metrics } from './p1Score.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface P1Task {
  taskId: string;
  targetFormula: FormulaEntry;
  noiseLevel: number;
  budget: number;
  seed: number;
}

export interface P1BaselineResult {
  task: P1Task;
  predictedFormula: FormulaEntry | null;
  metrics: P1Metrics;
  queries: DataPoint[];
  candidateHistory: number[];  // candidate set size after each query
}

// ---------------------------------------------------------------------------
// RNG
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

function gaussianNoise(rng: () => number, sigma: number): number {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * sigma;
}

// ---------------------------------------------------------------------------
// Query the target function
// ---------------------------------------------------------------------------

function queryTarget(
  formula: FormulaEntry,
  inputs: number[],
  noiseLevel: number,
  rng: () => number,
): DataPoint {
  let output = evaluateArray(formula.expr, inputs);
  if (noiseLevel > 0) {
    output += gaussianNoise(rng, noiseLevel);
  }
  return { inputs, output };
}

// ---------------------------------------------------------------------------
// Candidate filtering
// ---------------------------------------------------------------------------

/**
 * Filter candidates by error on a single observation.
 * Remove candidates whose prediction differs from observed value
 * by more than tolerance.
 */
function filterCandidates(
  candidates: FormulaEntry[],
  observation: DataPoint,
  tolerance: number,
): FormulaEntry[] {
  return candidates.filter(f => {
    const predicted = evaluateArray(f.expr, observation.inputs);
    if (!Number.isFinite(predicted)) return false;
    const scale = Math.max(Math.abs(observation.output), 1);
    return Math.abs(predicted - observation.output) <= tolerance * scale;
  });
}

/**
 * Compute total squared error of a candidate against all observations.
 */
function totalError(candidate: FormulaEntry, observations: DataPoint[]): number {
  let err = 0;
  for (const obs of observations) {
    const pred = evaluateArray(candidate.expr, obs.inputs);
    if (!Number.isFinite(pred)) return Infinity;
    err += (pred - obs.output) ** 2;
  }
  return err;
}

// ---------------------------------------------------------------------------
// Generate candidate query points
// ---------------------------------------------------------------------------

function generateCandidateQueryPoints(
  dimension: number,
  nPoints: number,
  rng: () => number,
): number[][] {
  const points: number[][] = [];
  for (let i = 0; i < nPoints; i++) {
    const inputs: number[] = [];
    for (let d = 0; d < dimension; d++) {
      // Sample in [0.5, 10]
      inputs.push(0.5 + rng() * 9.5);
    }
    points.push(inputs);
  }
  return points;
}

// ---------------------------------------------------------------------------
// Baseline 1: Random Search
// ---------------------------------------------------------------------------

export function randomSearch(
  task: P1Task,
  formulas: FormulaEntry[] = ALL_FORMULAS,
): P1BaselineResult {
  const rng = mulberry32(task.seed);
  const idx = Math.floor(rng() * formulas.length);
  const predicted = formulas[idx];

  const dataset = generateDataset(task.targetFormula, {
    seed: task.seed,
    noiseLevel: task.noiseLevel,
  });

  const metrics = computeP1Metrics(
    predicted, task.targetFormula, dataset.heldout,
    'random_search', task.noiseLevel, 0, formulas.length,
  );

  return {
    task,
    predictedFormula: predicted,
    metrics,
    queries: [],
    candidateHistory: [formulas.length],
  };
}

// ---------------------------------------------------------------------------
// Baseline 2: Greedy Symbolic Search
// ---------------------------------------------------------------------------

export function greedySymbolicSearch(
  task: P1Task,
  formulas: FormulaEntry[] = ALL_FORMULAS,
): P1BaselineResult {
  const rng = mulberry32(task.seed);

  // Generate a fixed set of evaluation points (no active querying)
  const evalPoints = generateCandidateQueryPoints(task.targetFormula.inputDimension, task.budget, rng);
  const observations: DataPoint[] = [];
  for (const inputs of evalPoints) {
    observations.push(queryTarget(task.targetFormula, inputs, task.noiseLevel, rng));
  }

  // Evaluate all candidates on these points, pick the one with lowest error
  let bestCandidate: FormulaEntry | null = null;
  let bestError = Infinity;

  for (const f of formulas) {
    const err = totalError(f, observations);
    if (err < bestError) {
      bestError = err;
      bestCandidate = f;
    }
  }

  const dataset = generateDataset(task.targetFormula, {
    seed: task.seed,
    noiseLevel: task.noiseLevel,
  });

  const metrics = computeP1Metrics(
    bestCandidate, task.targetFormula, dataset.heldout,
    'greedy_symbolic_search', task.noiseLevel, task.budget, formulas.length,
  );

  return {
    task,
    predictedFormula: bestCandidate,
    metrics,
    queries: observations,
    candidateHistory: [formulas.length],
  };
}

// ---------------------------------------------------------------------------
// Baseline 3: Active Random
// ---------------------------------------------------------------------------

export function activeRandom(
  task: P1Task,
  formulas: FormulaEntry[] = ALL_FORMULAS,
): P1BaselineResult {
  const rng = mulberry32(task.seed);
  let candidates = [...formulas];
  const observations: DataPoint[] = [];
  const candidateHistory = [candidates.length];

  // Tolerance for filtering: scale with noise level
  const tolerance = task.noiseLevel > 0 ? 3 * task.noiseLevel : 0.01;

  for (let q = 0; q < task.budget && candidates.length > 1; q++) {
    // Select a random query point
    const queryInputs = generateCandidateQueryPoints(task.targetFormula.inputDimension, 1, rng)[0];
    const obs = queryTarget(task.targetFormula, queryInputs, task.noiseLevel, rng);
    observations.push(obs);

    // Filter candidates
    candidates = filterCandidates(candidates, obs, tolerance);
    candidateHistory.push(candidates.length);
  }

  // Pick the candidate with lowest total error
  let bestCandidate: FormulaEntry | null = null;
  let bestError = Infinity;
  for (const f of candidates) {
    const err = totalError(f, observations);
    if (err < bestError) {
      bestError = err;
      bestCandidate = f;
    }
  }

  const dataset = generateDataset(task.targetFormula, {
    seed: task.seed,
    noiseLevel: task.noiseLevel,
  });

  const metrics = computeP1Metrics(
    bestCandidate, task.targetFormula, dataset.heldout,
    'active_random', task.noiseLevel, observations.length, candidates.length,
  );

  return {
    task,
    predictedFormula: bestCandidate,
    metrics,
    queries: observations,
    candidateHistory,
  };
}

// ---------------------------------------------------------------------------
// Baseline 4: Active InfoGain (variance-based query selection)
// ---------------------------------------------------------------------------

export function activeInfogain(
  task: P1Task,
  formulas: FormulaEntry[] = ALL_FORMULAS,
): P1BaselineResult {
  const rng = mulberry32(task.seed);
  let candidates = [...formulas];
  const observations: DataPoint[] = [];
  const candidateHistory = [candidates.length];

  // Tolerance for filtering: scale with noise level
  const tolerance = task.noiseLevel > 0 ? 3 * task.noiseLevel : 0.01;

  // Number of candidate query points to evaluate per step
  const nCandidateQueries = 200;

  for (let q = 0; q < task.budget && candidates.length > 1; q++) {
    // Generate candidate query points
    const queryPoints = generateCandidateQueryPoints(
      task.targetFormula.inputDimension, nCandidateQueries, rng,
    );

    // Select the query point that maximizes variance across candidates
    let bestQuery = queryPoints[0];
    let bestVariance = -1;

    for (const qp of queryPoints) {
      const outputs: number[] = [];
      for (const f of candidates) {
        const val = evaluateArray(f.expr, qp);
        if (Number.isFinite(val)) outputs.push(val);
      }

      if (outputs.length < 2) continue;

      const mean = outputs.reduce((s, v) => s + v, 0) / outputs.length;
      const variance = outputs.reduce((s, v) => s + (v - mean) ** 2, 0) / outputs.length;

      if (variance > bestVariance) {
        bestVariance = variance;
        bestQuery = qp;
      }
    }

    // Query the target at the selected point
    const obs = queryTarget(task.targetFormula, bestQuery, task.noiseLevel, rng);
    observations.push(obs);

    // Filter candidates
    candidates = filterCandidates(candidates, obs, tolerance);
    candidateHistory.push(candidates.length);
  }

  // Pick the candidate with lowest total error
  let bestCandidate: FormulaEntry | null = null;
  let bestError = Infinity;
  for (const f of candidates) {
    const err = totalError(f, observations);
    if (err < bestError) {
      bestError = err;
      bestCandidate = f;
    }
  }

  const dataset = generateDataset(task.targetFormula, {
    seed: task.seed,
    noiseLevel: task.noiseLevel,
  });

  const metrics = computeP1Metrics(
    bestCandidate, task.targetFormula, dataset.heldout,
    'active_infogain', task.noiseLevel, observations.length, candidates.length,
  );

  return {
    task,
    predictedFormula: bestCandidate,
    metrics,
    queries: observations,
    candidateHistory,
  };
}

// ---------------------------------------------------------------------------
// Baseline 5: Oracle
// ---------------------------------------------------------------------------

export function oracle(
  task: P1Task,
  formulas: FormulaEntry[] = ALL_FORMULAS,
): P1BaselineResult {
  // Oracle always returns the correct formula
  const dataset = generateDataset(task.targetFormula, {
    seed: task.seed,
    noiseLevel: task.noiseLevel,
  });

  const metrics = computeP1Metrics(
    task.targetFormula, task.targetFormula, dataset.heldout,
    'oracle', task.noiseLevel, 0, formulas.length,
  );

  return {
    task,
    predictedFormula: task.targetFormula,
    metrics,
    queries: [],
    candidateHistory: [formulas.length],
  };
}

// ---------------------------------------------------------------------------
// Run all baselines on a single task
// ---------------------------------------------------------------------------

export function runAllBaselines(
  task: P1Task,
  formulas: FormulaEntry[] = ALL_FORMULAS,
): Record<string, P1BaselineResult> {
  return {
    random_search: randomSearch(task, formulas),
    greedy_symbolic_search: greedySymbolicSearch(task, formulas),
    active_random: activeRandom(task, formulas),
    active_infogain: activeInfogain(task, formulas),
    oracle: oracle(task, formulas),
  };
}
