// P3 Anomaly Dataset
// Generates synthetic datasets with a baseline model and a planted correction.
// Inspired by the Mercury perihelion anomaly (Newtonian gravity + GR-like correction),
// but uses simplified/synthetic versions — NOT real Mercury data.

import { evaluate, type SymExpr, C, V, Mul, Div, Pow, Add } from '../p1/symbolicExpr.js';
import type { DimVector } from '../p2/dimensionalConstraints.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnomalyDataPoint {
  inputs: Record<string, number>;
  /** Output from baseline model only */
  baselineOutput: number;
  /** Output from baseline + planted correction (the "true" observed value) */
  observedOutput: number;
  /** The residual anomaly = observedOutput - baselineOutput */
  anomaly: number;
}

export interface AnomalyDataset {
  id: string;
  description: string;
  /** Baseline model expression (e.g., Newtonian gravity F = GMm/r²) */
  baselineModel: SymExpr;
  /** Planted correction expression (added to baseline to produce anomaly) */
  plantedCorrection: SymExpr;
  /** Full model = baseline + planted correction */
  fullModel: SymExpr;
  /** Variable names and their dimensions */
  variableDimensions: Record<string, DimVector>;
  /** Expected output dimension */
  outputDimension: DimVector;
  /** Family name of the planted correction (for recovery scoring) */
  plantedFamily: string;
  /** Whether the null correction (no anomaly) is the correct answer */
  isNullCorrect: boolean;
  /** Training data */
  train: AnomalyDataPoint[];
  /** Held-out data */
  heldout: AnomalyDataPoint[];
}

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

// ---------------------------------------------------------------------------
// Scenario Definitions
// ---------------------------------------------------------------------------

export interface AnomalyScenario {
  id: string;
  description: string;
  baselineModel: SymExpr;
  plantedCorrection: SymExpr;
  variableDimensions: Record<string, DimVector>;
  outputDimension: DimVector;
  plantedFamily: string;
  isNullCorrect: boolean;
  /** Ranges for each variable [min, max] */
  variableRanges: Record<string, [number, number]>;
}

/**
 * Pre-defined anomaly scenarios inspired by historical physics anomalies.
 * These are simplified synthetic versions, NOT real physics data.
 */
export const ANOMALY_SCENARIOS: AnomalyScenario[] = [
  // Scenario 1: Newtonian gravity with GR-like angular momentum correction
  // Baseline: F = G*M*m / r^2
  // Planted: + 3*G*M*L^2 / (c^2 * r^4)  (simplified GR-like term)
  {
    id: 'gravity_angular_momentum',
    description: 'Gravitational force with angular-momentum-like correction',
    baselineModel: Div(Mul(Mul(V('G'), V('M')), V('m')), Pow(V('r'), C(2))),
    plantedCorrection: Div(
      Mul(Mul(C(3), Mul(V('G'), V('M'))), Pow(V('L'), C(2))),
      Mul(Pow(V('c'), C(2)), Pow(V('r'), C(4)))
    ),
    variableDimensions: {
      G: [3, 1, -2],   // L^3 M T^-2 (gravitational constant)
      M: [0, 1, 0],    // M
      m: [0, 1, 0],    // M
      r: [1, 0, 0],    // L
      L: [2, 1, -1],   // L^2 M T^-1 (angular momentum)
      c: [1, 0, -1],   // L T^-1 (speed)
    },
    outputDimension: [1, 1, -2], // Force: L M T^-2
    plantedFamily: 'angular_momentum_like',
    isNullCorrect: false,
    variableRanges: {
      G: [0.5, 2],
      M: [1, 5],
      m: [0.5, 3],
      r: [1, 6],
      L: [0.5, 4],
      c: [5, 15],
    },
  },

  // Scenario 2: Inverse-square force with inverse-cube perturbation
  // Baseline: F = k / r^2
  // Planted: + beta / r^3
  {
    id: 'inverse_cube_perturbation',
    description: 'Inverse-square force with inverse-cube perturbation',
    baselineModel: Div(V('k'), Pow(V('r'), C(2))),
    plantedCorrection: Div(V('beta'), Pow(V('r'), C(3))),
    variableDimensions: {
      k: [3, 1, -2],   // L^3 M T^-2 (force * r^2)
      r: [1, 0, 0],    // L
      beta: [4, 1, -2], // L^4 M T^-2 (force * r^3)
    },
    outputDimension: [1, 1, -2], // Force
    plantedFamily: 'inverse_cube_perturbation',
    isNullCorrect: false,
    variableRanges: {
      k: [1, 5],
      r: [1, 6],
      beta: [0.1, 2],
    },
  },

  // Scenario 3: Force with velocity-dependent correction
  // Baseline: F = k / r^2
  // Planted: + gamma * v^2 / r
  {
    id: 'velocity_dependent_correction',
    description: 'Force with velocity-dependent correction',
    baselineModel: Div(V('k'), Pow(V('r'), C(2))),
    plantedCorrection: Div(Mul(V('gamma'), Pow(V('v'), C(2))), V('r')),
    variableDimensions: {
      k: [3, 1, -2],   // L^3 M T^-2
      r: [1, 0, 0],    // L
      gamma: [0, 1, 0], // M (dimensionless coefficient with mass)
      v: [1, 0, -1],   // L T^-1
    },
    outputDimension: [1, 1, -2], // Force
    plantedFamily: 'velocity_dependent',
    isNullCorrect: false,
    variableRanges: {
      k: [1, 5],
      r: [1, 6],
      gamma: [0.1, 1],
      v: [0.5, 4],
    },
  },

  // Scenario 4: Inverse-square with inverse-square perturbation (same form)
  // Baseline: F = k / r^2
  // Planted: + alpha / r^2 (same family, different coefficient)
  {
    id: 'inverse_square_perturbation',
    description: 'Inverse-square force with additional inverse-square term',
    baselineModel: Div(V('k'), Pow(V('r'), C(2))),
    plantedCorrection: Div(V('alpha'), Pow(V('r'), C(2))),
    variableDimensions: {
      k: [3, 1, -2],   // L^3 M T^-2
      r: [1, 0, 0],    // L
      alpha: [3, 1, -2], // L^3 M T^-2
    },
    outputDimension: [1, 1, -2], // Force
    plantedFamily: 'inverse_square_perturbation',
    isNullCorrect: false,
    variableRanges: {
      k: [1, 5],
      r: [1, 6],
      alpha: [0.5, 3],
    },
  },

  // Scenario 5: Force with polynomial residual
  // Baseline: F = k / r^2
  // Planted: + epsilon * r^n  (n=1 for simplicity)
  {
    id: 'polynomial_residual',
    description: 'Force with polynomial residual correction',
    baselineModel: Div(V('k'), Pow(V('r'), C(2))),
    plantedCorrection: Mul(V('epsilon'), V('r')),
    variableDimensions: {
      k: [3, 1, -2],   // L^3 M T^-2
      r: [1, 0, 0],    // L
      epsilon: [0, 1, -2], // M T^-2
    },
    outputDimension: [1, 1, -2], // Force
    plantedFamily: 'polynomial_residual',
    isNullCorrect: false,
    variableRanges: {
      k: [1, 5],
      r: [1, 6],
      epsilon: [0.05, 0.5],
    },
  },

  // Scenario 6: Null correction — no anomaly present
  // Baseline: F = k / r^2
  // Planted: 0 (no correction needed)
  {
    id: 'null_no_anomaly',
    description: 'Inverse-square force with no anomaly (null correction)',
    baselineModel: Div(V('k'), Pow(V('r'), C(2))),
    plantedCorrection: C(0),
    variableDimensions: {
      k: [3, 1, -2],
      r: [1, 0, 0],
    },
    outputDimension: [1, 1, -2], // Force
    plantedFamily: 'null_correction',
    isNullCorrect: true,
    variableRanges: {
      k: [1, 5],
      r: [1, 6],
    },
  },

  // Scenario 7: Another null scenario with different baseline
  // Baseline: E = m * g * h
  // Planted: 0 (no correction needed)
  {
    id: 'null_potential_energy',
    description: 'Potential energy with no anomaly (null correction)',
    baselineModel: Mul(Mul(V('m'), V('g')), V('h')),
    plantedCorrection: C(0),
    variableDimensions: {
      m: [0, 1, 0],    // M
      g: [1, 0, -2],   // L T^-2
      h: [1, 0, 0],    // L
    },
    outputDimension: [2, 1, -2], // Energy: L^2 M T^-2
    plantedFamily: 'null_correction',
    isNullCorrect: true,
    variableRanges: {
      m: [1, 5],
      g: [1, 10],
      h: [0.5, 5],
    },
  },

  // Scenario 8: Angular momentum correction on a different baseline
  // Baseline: F = k * m / r^2
  // Planted: + delta * L^2 / r^3
  {
    id: 'angular_momentum_orbital',
    description: 'Orbital force with angular momentum correction',
    baselineModel: Div(Mul(V('k'), V('m')), Pow(V('r'), C(2))),
    plantedCorrection: Div(Mul(V('delta'), Pow(V('L'), C(2))), Pow(V('r'), C(3))),
    variableDimensions: {
      k: [3, 0, -2],   // L^3 T^-2 (k = GM in orbital context)
      m: [0, 1, 0],    // M
      r: [1, 0, 0],    // L
      delta: [-1, 0, 0], // L^-1 (dimensionless-like coefficient)
      L: [2, 0, -1],   // L^2 T^-1 (specific angular momentum, per unit mass)
    },
    outputDimension: [1, 1, -2], // Force
    plantedFamily: 'angular_momentum_like',
    isNullCorrect: false,
    variableRanges: {
      k: [1, 5],
      m: [1, 4],
      r: [1, 6],
      delta: [0.01, 0.5],
      L: [0.5, 3],
    },
  },
];

// ---------------------------------------------------------------------------
// Dataset Generation
// ---------------------------------------------------------------------------

export function generateAnomalyDataset(
  scenario: AnomalyScenario,
  options?: {
    gridSize?: number;
    heldoutRatio?: number;
    seed?: number;
    noiseLevel?: number;
  },
): AnomalyDataset {
  const gridSize = options?.gridSize ?? 6;
  const heldoutRatio = options?.heldoutRatio ?? 0.2;
  const noiseLevel = options?.noiseLevel ?? 0;
  const rng = options?.seed !== undefined ? mulberry32(options.seed) : mulberry32(42);

  const varNames = Object.keys(scenario.variableDimensions);
  const fullModel = Add(scenario.baselineModel, scenario.plantedCorrection);

  // Generate input grid
  const inputSpace = generateInputGrid(varNames, scenario.variableRanges, gridSize);

  const allPoints: AnomalyDataPoint[] = [];
  for (const inputs of inputSpace) {
    const baselineOutput = evaluate(scenario.baselineModel, inputs);
    const observedOutput = evaluate(fullModel, inputs);

    if (!Number.isFinite(baselineOutput) || !Number.isFinite(observedOutput)) continue;

    let noisyObserved = observedOutput;
    if (noiseLevel > 0) {
      noisyObserved += gaussianNoise(rng, noiseLevel * Math.max(Math.abs(observedOutput), 1));
    }

    const anomaly = noisyObserved - baselineOutput;

    allPoints.push({
      inputs,
      baselineOutput,
      observedOutput: noisyObserved,
      anomaly,
    });
  }

  shuffleInPlace(allPoints, rng);

  const splitIdx = Math.floor(allPoints.length * (1 - heldoutRatio));
  const train = allPoints.slice(0, splitIdx);
  const heldout = allPoints.slice(splitIdx);

  return {
    id: scenario.id,
    description: scenario.description,
    baselineModel: scenario.baselineModel,
    plantedCorrection: scenario.plantedCorrection,
    fullModel,
    variableDimensions: scenario.variableDimensions,
    outputDimension: scenario.outputDimension,
    plantedFamily: scenario.plantedFamily,
    isNullCorrect: scenario.isNullCorrect,
    train,
    heldout,
  };
}

function generateInputGrid(
  varNames: string[],
  ranges: Record<string, [number, number]>,
  gridSize: number,
): Record<string, number>[] {
  if (varNames.length === 0) return [{}];

  const n = Math.min(gridSize, 6);
  const varValues: Record<string, number[]> = {};
  for (const name of varNames) {
    const [lo, hi] = ranges[name] ?? [0.5, 5];
    const values: number[] = [];
    for (let i = 0; i < n; i++) {
      values.push(lo + (hi - lo) * (i + 1) / (n + 1));
    }
    varValues[name] = values;
  }

  return cartesianProduct(varNames, varValues);
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
