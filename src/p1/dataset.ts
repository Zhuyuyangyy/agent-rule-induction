// P1 Dataset
// Generates input-output pairs from formulas, with noise support.

import { type SymExpr, evaluateArray } from './symbolicExpr.js';
import type { FormulaEntry } from './formulaLibrary.js';

export interface DataPoint {
  inputs: number[];
  output: number;
}

export interface Dataset {
  formulaId: string;
  formula: FormulaEntry;
  train: DataPoint[];
  heldout: DataPoint[];
  inputSpace: number[][];
}

/**
 * Generate a grid of input values for a given dimension.
 * Uses a fixed range that avoids singularities for common expressions.
 */
export function generateInputSpace(
  dimension: number,
  gridSize: number = 20,
): number[][] {
  if (dimension === 0) return [[]];

  // Use a safe range: [0.5, 10] with some negative values
  // Avoid 0 for denominators
  const baseValues = [];
  for (let i = 1; i <= gridSize; i++) {
    baseValues.push(i * 0.5); // 0.5, 1.0, 1.5, ..., 10.0
  }

  if (dimension === 1) {
    return baseValues.map(v => [v]);
  }

  // For higher dimensions, use cartesian product of a subset
  const subSize = Math.max(3, Math.floor(Math.pow(gridSize, 1 / dimension)));
  const vals: number[] = [];
  for (let i = 1; i <= subSize * 2; i++) vals.push(i * 0.5);

  return cartesianProduct(vals, dimension);
}

function cartesianProduct(values: number[], dim: number): number[][] {
  if (dim === 1) return values.map(v => [v]);
  const rest = cartesianProduct(values, dim - 1);
  const result: number[][] = [];
  for (const v of values) {
    for (const r of rest) {
      result.push([v, ...r]);
    }
  }
  return result;
}

/**
 * Generate dataset from a formula.
 */
export function generateDataset(
  formula: FormulaEntry,
  options?: {
    gridSize?: number;
    heldoutRatio?: number;
    seed?: number;
    noiseLevel?: number;
  },
): Dataset {
  const gridSize = options?.gridSize ?? 15;
  const heldoutRatio = options?.heldoutRatio ?? 0.2;
  const noiseLevel = options?.noiseLevel ?? 0;

  const inputSpace = generateInputSpace(formula.inputDimension, gridSize);
  const rng = options?.seed !== undefined ? mulberry32(options.seed) : null;

  // Evaluate all points, filter NaN/Inf
  const allPoints: DataPoint[] = [];
  for (const inputs of inputSpace) {
    let output = evaluateArray(formula.expr, inputs);
    if (!Number.isFinite(output)) continue;

    // Add Gaussian noise if requested
    if (noiseLevel > 0 && rng) {
      output += gaussianNoise(rng, noiseLevel);
    }

    allPoints.push({ inputs, output });
  }

  // Shuffle and split into train/heldout
  if (rng) {
    shuffleInPlace(allPoints, rng);
  }

  const splitIdx = Math.floor(allPoints.length * (1 - heldoutRatio));
  const train = allPoints.slice(0, splitIdx);
  const heldout = allPoints.slice(splitIdx);

  return {
    formulaId: formula.id,
    formula,
    train,
    heldout,
    inputSpace,
  };
}

/** Generate dataset for all formulas in the library */
export function generateAllDatasets(
  formulas: FormulaEntry[],
  options?: {
    gridSize?: number;
    heldoutRatio?: number;
    seed?: number;
    noiseLevel?: number;
  },
): Dataset[] {
  return formulas.map((f, i) =>
    generateDataset(f, { ...options, seed: options?.seed ?? 42 + i }),
  );
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
  // Box-Muller transform
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
