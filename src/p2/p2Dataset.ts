// P2 Dataset
// Generates input-output pairs from physics formulas, with noise support.

import { evaluate } from '../p1/symbolicExpr.js';
import type { PhysicsFormulaEntry } from './physicsExpr.js';

export interface DataPoint {
  inputs: Record<string, number>;
  output: number;
}

export interface PhysicsDataset {
  formulaId: string;
  formula: PhysicsFormulaEntry;
  train: DataPoint[];
  heldout: DataPoint[];
}

/**
 * Generate input space for a physics formula.
 * Uses ranges appropriate for physical variables.
 */
export function generatePhysicsInputSpace(
  formula: PhysicsFormulaEntry,
  gridSize: number = 10,
): Record<string, number>[] {
  const varNames = Object.keys(formula.variableDimensions);
  if (varNames.length === 0) return [{}];

  // Generate safe values for each variable
  const varValues: Record<string, number[]> = {};
  for (const name of varNames) {
    const dim = formula.variableDimensions[name];
    const values = generateSafeValues(dim, gridSize);
    varValues[name] = values;
  }

  // Cartesian product
  return cartesianProduct(varNames, varValues);
}

function generateSafeValues(dim: [number, number, number], gridSize: number): number[] {
  const values: number[] = [];
  // Use positive values that avoid singularities
  // Scale based on dimension type
  const isTime = dim[2] === 1 && dim[0] === 0 && dim[1] === 0;
  const isLength = dim[0] === 1 && dim[1] === 0 && dim[2] === 0;
  const isMass = dim[0] === 0 && dim[1] === 1 && dim[2] === 0;
  const isVelocity = dim[0] === 1 && dim[1] === 0 && dim[2] === -1;
  const isAccel = dim[0] === 1 && dim[1] === 0 && dim[2] === -2;
  const isForce = dim[0] === 1 && dim[1] === 1 && dim[2] === -2;
  const isEnergy = dim[0] === 2 && dim[1] === 1 && dim[2] === -2;
  const isFreq = dim[0] === 0 && dim[1] === 0 && dim[2] === -1;
  const isDimless = dim[0] === 0 && dim[1] === 0 && dim[2] === 0;

  const n = Math.min(gridSize, 8);
  if (isDimless) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isTime) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isLength) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isMass) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isVelocity) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isAccel) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isForce) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isEnergy) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else if (isFreq) {
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  } else {
    // Generic: positive values
    for (let i = 1; i <= n; i++) values.push(i * 0.5);
  }
  return values;
}

function cartesianProduct(
  varNames: string[],
  varValues: Record<string, number[]>,
): Record<string, number>[] {
  if (varNames.length === 0) return [{}];
  const [first, ...rest] = varNames;
  const firstVals = varValues[first];
  const restProducts = cartesianProduct(rest, varValues);
  const result: Record<string, number>[] = [];
  for (const v of firstVals) {
    for (const rp of restProducts) {
      result.push({ [first]: v, ...rp });
    }
  }
  return result;
}

/**
 * Generate dataset from a physics formula.
 */
export function generatePhysicsDataset(
  formula: PhysicsFormulaEntry,
  options?: {
    gridSize?: number;
    heldoutRatio?: number;
    seed?: number;
    noiseLevel?: number;
  },
): PhysicsDataset {
  const gridSize = options?.gridSize ?? 8;
  const heldoutRatio = options?.heldoutRatio ?? 0.2;
  const noiseLevel = options?.noiseLevel ?? 0;
  const rng = options?.seed !== undefined ? mulberry32(options.seed) : null;

  const inputSpace = generatePhysicsInputSpace(formula, gridSize);
  const varNames = Object.keys(formula.variableDimensions);

  const allPoints: DataPoint[] = [];
  for (const inputs of inputSpace) {
    let output = evaluate(formula.expr, inputs);
    if (!Number.isFinite(output)) continue;

    if (noiseLevel > 0 && rng) {
      output += gaussianNoise(rng, noiseLevel * Math.max(Math.abs(output), 1));
    }

    allPoints.push({ inputs, output });
  }

  if (rng) shuffleInPlace(allPoints, rng);

  const splitIdx = Math.floor(allPoints.length * (1 - heldoutRatio));
  const train = allPoints.slice(0, splitIdx);
  const heldout = allPoints.slice(splitIdx);

  return { formulaId: formula.id, formula, train, heldout };
}

// ---------------------------------------------------------------------------
// RNG helpers
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

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
