// P1 Scoring
// Metrics for evaluating symbolic expression discovery.

import { type SymExpr, evaluateArray, complexity } from './symbolicExpr.js';
import type { DataPoint } from './dataset.js';
import type { FormulaEntry } from './formulaLibrary.js';

// ---------------------------------------------------------------------------
// Heldout accuracy (R²)
// ---------------------------------------------------------------------------

/**
 * Compute R² (coefficient of determination) on heldout data.
 * Returns 0 if the prediction is constant or if R² would be negative.
 */
export function heldoutAccuracy(predicted: SymExpr, heldout: DataPoint[]): number {
  if (heldout.length === 0) return 0;

  const predictedOutputs = heldout.map(dp => evaluateArray(predicted, dp.inputs));
  const actualOutputs = heldout.map(dp => dp.output);

  // Filter out NaN/Inf predictions
  const validPairs: [number, number][] = [];
  for (let i = 0; i < predictedOutputs.length; i++) {
    if (Number.isFinite(predictedOutputs[i]) && Number.isFinite(actualOutputs[i])) {
      validPairs.push([predictedOutputs[i], actualOutputs[i]]);
    }
  }

  if (validPairs.length < 2) return 0;

  const meanActual = validPairs.reduce((s, [_, a]) => s + a, 0) / validPairs.length;
  const ssTot = validPairs.reduce((s, [_, a]) => s + (a - meanActual) ** 2, 0);
  const ssRes = validPairs.reduce((s, [p, a]) => s + (p - a) ** 2, 0);

  if (ssTot === 0) return ssRes === 0 ? 1 : 0;
  const r2 = 1 - ssRes / ssTot;
  return Math.max(0, r2);
}

// ---------------------------------------------------------------------------
// Symbolic equivalence
// ---------------------------------------------------------------------------

/**
 * Check if predicted expression is symbolically equivalent to target.
 * Uses numerical comparison on a grid of test points.
 * Two expressions are equivalent if they produce the same output
 * (within tolerance) on all test points.
 */
export function symbolicEquivalent(
  predicted: SymExpr,
  target: SymExpr,
  inputDimension: number,
  tolerance: number = 1e-6,
): boolean {
  // Generate test points
  const testPoints = generateTestPoints(inputDimension);

  for (const inputs of testPoints) {
    const pVal = evaluateArray(predicted, inputs);
    const tVal = evaluateArray(target, inputs);

    // If both are NaN/Inf, consider them matching at this point
    if (!Number.isFinite(pVal) && !Number.isFinite(tVal)) continue;
    if (!Number.isFinite(pVal) || !Number.isFinite(tVal)) return false;

    const scale = Math.max(Math.abs(tVal), 1);
    if (Math.abs(pVal - tVal) > tolerance * scale) return false;
  }

  return true;
}

function generateTestPoints(dim: number): number[][] {
  const points: number[][] = [];
  const vals = [0.5, 1, 2, 3, 5, 7, 10];

  if (dim === 1) {
    return vals.map(v => [v]);
  }

  // For multi-dim, use a subset of combinations
  const subVals = [1, 2, 5];
  for (const v1 of subVals) {
    for (const v2 of subVals) {
      if (dim === 2) {
        points.push([v1, v2]);
      } else if (dim === 3) {
        for (const v3 of subVals) {
          points.push([v1, v2, v3]);
        }
      }
    }
  }

  return points;
}

// ---------------------------------------------------------------------------
// Formula ID match (exact)
// ---------------------------------------------------------------------------

/**
 * Check if the predicted formula ID matches the target.
 * This is the strictest form of equivalence.
 */
export function formulaIdMatch(predictedId: string, targetId: string): boolean {
  return predictedId === targetId;
}

// ---------------------------------------------------------------------------
// Composite metrics
// ---------------------------------------------------------------------------

export interface P1Metrics {
  formulaId: string;
  baseline: string;
  noiseLevel: number;
  heldoutAccuracy: number;
  symbolicEquivalent: boolean;
  formulaIdMatch: boolean;
  complexity: number;
  queryCost: number;
  candidateSetSize: number;
}

export function computeP1Metrics(
  predictedFormula: FormulaEntry | null,
  targetFormula: FormulaEntry,
  heldout: DataPoint[],
  baseline: string,
  noiseLevel: number,
  queryCost: number,
  candidateSetSize: number,
): P1Metrics {
  if (!predictedFormula) {
    return {
      formulaId: targetFormula.id,
      baseline,
      noiseLevel,
      heldoutAccuracy: 0,
      symbolicEquivalent: false,
      formulaIdMatch: false,
      complexity: 0,
      queryCost,
      candidateSetSize,
    };
  }

  const r2 = heldoutAccuracy(predictedFormula.expr, heldout);
  const symEq = symbolicEquivalent(predictedFormula.expr, targetFormula.expr, targetFormula.inputDimension);
  const idMatch = formulaIdMatch(predictedFormula.id, targetFormula.id);

  return {
    formulaId: targetFormula.id,
    baseline,
    noiseLevel,
    heldoutAccuracy: r2,
    symbolicEquivalent: symEq,
    formulaIdMatch: idMatch,
    complexity: complexity(predictedFormula.expr),
    queryCost,
    candidateSetSize,
  };
}
