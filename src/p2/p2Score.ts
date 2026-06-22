// P2 Scoring
// Metrics for physics-constrained law rediscovery.

import { evaluate, complexity } from '../p1/symbolicExpr.js';
import { inferDimension, dimEqual, type DimVector } from './dimensionalConstraints.js';
import type { PhysicsFormulaEntry } from './physicsExpr.js';
import type { DataPoint } from './p2Dataset.js';

// ---------------------------------------------------------------------------
// Heldout accuracy (R²)
// ---------------------------------------------------------------------------

export function heldoutAccuracy(
  predicted: PhysicsFormulaEntry,
  heldout: DataPoint[],
): number {
  if (heldout.length === 0) return 0;

  const predictedOutputs = heldout.map(dp => evaluate(predicted.expr, dp.inputs));
  const actualOutputs = heldout.map(dp => dp.output);

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
  return Math.max(0, 1 - ssRes / ssTot);
}

// ---------------------------------------------------------------------------
// Symbolic equivalence (numerical test)
// ---------------------------------------------------------------------------

export function symbolicEquivalent(
  predicted: PhysicsFormulaEntry,
  target: PhysicsFormulaEntry,
  tolerance: number = 1e-6,
): boolean {
  const pVars = Object.keys(predicted.variableDimensions);
  const tVars = Object.keys(target.variableDimensions);

  // Must have same variables
  if (pVars.length !== tVars.length) return false;

  // Test on a grid of points
  const testVals = [0.5, 1, 2, 3, 5, 7, 10];
  const varNames = Object.keys(target.variableDimensions);

  for (const vals of generateTestCombinations(varNames.length, testVals)) {
    const inputMap: Record<string, number> = {};
    for (let i = 0; i < varNames.length; i++) {
      inputMap[varNames[i]] = vals[i];
    }

    const pVal = evaluate(predicted.expr, inputMap);
    const tVal = evaluate(target.expr, inputMap);

    if (!Number.isFinite(pVal) && !Number.isFinite(tVal)) continue;
    if (!Number.isFinite(pVal) || !Number.isFinite(tVal)) return false;

    const scale = Math.max(Math.abs(tVal), 1);
    if (Math.abs(pVal - tVal) > tolerance * scale) return false;
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

// ---------------------------------------------------------------------------
// Dimensional validity
// ---------------------------------------------------------------------------

export function dimensionalValidity(
  predicted: PhysicsFormulaEntry,
): boolean {
  const inferred = inferDimension(predicted.expr, predicted.variableDimensions);
  if (inferred === null) return false;
  return dimEqual(inferred, predicted.outputDimension);
}

/**
 * Check if a candidate formula is dimensionally valid for a given target's
 * variable dimensions and output dimension.
 */
export function candidateDimensionalValidity(
  candidateExpr: import('../p1/symbolicExpr.js').SymExpr,
  targetVarDims: Record<string, DimVector>,
  targetOutputDim: DimVector,
): boolean {
  const inferred = inferDimension(candidateExpr, targetVarDims);
  if (inferred === null) return false;
  return dimEqual(inferred, targetOutputDim);
}

// ---------------------------------------------------------------------------
// Composite P2 Metrics
// ---------------------------------------------------------------------------

export interface P2Metrics {
  formulaId: string;
  baseline: string;
  noiseLevel: number;
  heldoutAccuracy: number;
  symbolicEquivalent: boolean;
  dimensionalValidity: boolean;
  verifierRejectionRate: number;
  complexity: number;
  queryCost: number;
  oracleGap: number;
  candidateSetSize: number;
}

export function computeP2Metrics(
  predicted: PhysicsFormulaEntry | null,
  target: PhysicsFormulaEntry,
  heldout: DataPoint[],
  baseline: string,
  noiseLevel: number,
  queryCost: number,
  candidateSetSize: number,
  verifierRejectionRate: number = 0,
): P2Metrics {
  if (!predicted) {
    return {
      formulaId: target.id,
      baseline,
      noiseLevel,
      heldoutAccuracy: 0,
      symbolicEquivalent: false,
      dimensionalValidity: false,
      verifierRejectionRate,
      complexity: 0,
      queryCost,
      oracleGap: 1,
      candidateSetSize,
    };
  }

  const r2 = heldoutAccuracy(predicted, heldout);
  const symEq = symbolicEquivalent(predicted, target);
  const dimValid = candidateDimensionalValidity(
    predicted.expr,
    target.variableDimensions,
    target.outputDimension,
  );

  return {
    formulaId: target.id,
    baseline,
    noiseLevel,
    heldoutAccuracy: r2,
    symbolicEquivalent: symEq,
    dimensionalValidity: dimValid,
    verifierRejectionRate,
    complexity: complexity(predicted.expr),
    queryCost,
    oracleGap: 1 - r2,
    candidateSetSize,
  };
}
