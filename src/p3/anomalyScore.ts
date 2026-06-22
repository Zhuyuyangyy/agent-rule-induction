// P3 Anomaly Scoring
// Metrics for evaluating anomaly-driven theory refinement.

import { evaluate, complexity, type SymExpr } from '../p1/symbolicExpr.js';
import { inferDimension, dimEqual, type DimVector } from '../p2/dimensionalConstraints.js';
import type { AnomalyDataPoint, AnomalyDataset } from './anomalyDataset.js';
import type { CorrectionCandidate } from './candidateCorrections.js';

// ---------------------------------------------------------------------------
// Residual computation
// ---------------------------------------------------------------------------

/**
 * Compute mean squared residual of a correction against anomaly data.
 * The correction is added to the baseline model; the residual is the
 * difference between (baseline + correction) and the observed output.
 */
export function computeResidual(
  correction: SymExpr,
  dataset: AnomalyDataset,
  dataPoints: AnomalyDataPoint[],
): number {
  const fullModel = { type: 'binop' as const, op: '+' as const, left: dataset.baselineModel, right: correction };

  let totalResidual = 0;
  let count = 0;

  for (const dp of dataPoints) {
    const predicted = evaluate(fullModel, dp.inputs);
    if (!Number.isFinite(predicted)) continue;
    totalResidual += (predicted - dp.observedOutput) ** 2;
    count++;
  }

  return count > 0 ? totalResidual / count : Infinity;
}

/**
 * Compute the baseline residual (no correction applied).
 */
export function computeBaselineResidual(
  dataset: AnomalyDataset,
  dataPoints: AnomalyDataPoint[],
): number {
  let totalResidual = 0;
  let count = 0;

  for (const dp of dataPoints) {
    totalResidual += dp.anomaly ** 2;
    count++;
  }

  return count > 0 ? totalResidual / count : 0;
}

// ---------------------------------------------------------------------------
// Core Metrics
// ---------------------------------------------------------------------------

/**
 * Fraction of anomaly resolved: residual reduction > 90%.
 * Returns 1 if the correction reduces the residual by more than 90% vs baseline.
 */
export function anomalyResolutionRate(
  correction: SymExpr,
  dataset: AnomalyDataset,
  dataPoints: AnomalyDataPoint[],
): number {
  const baselineRes = computeBaselineResidual(dataset, dataPoints);
  if (baselineRes === 0) return 1; // No anomaly to resolve

  const correctedRes = computeResidual(correction, dataset, dataPoints);
  const reduction = 1 - correctedRes / baselineRes;

  return reduction > 0.9 ? 1 : 0;
}

/**
 * Held-out residual reduction: 1 - (heldout_residual / baseline_residual).
 * Continuous measure of how much the correction reduces the anomaly.
 */
export function heldoutResidualReduction(
  correction: SymExpr,
  dataset: AnomalyDataset,
): number {
  const baselineRes = computeBaselineResidual(dataset, dataset.heldout);
  if (baselineRes === 0) return 1;

  const correctedRes = computeResidual(correction, dataset, dataset.heldout);
  const reduction = 1 - correctedRes / baselineRes;

  return Math.max(0, reduction);
}

/**
 * Whether the planted correction family is identified.
 * Compares the family of the selected correction with the planted family.
 */
export function correctionRecoveryRate(
  selectedFamily: string,
  plantedFamily: string,
): boolean {
  return selectedFamily === plantedFamily;
}

/**
 * False positive correction rate: rate of selecting a non-null correction
 * when the null correction is correct (i.e., no anomaly exists).
 */
export function falsePositiveCorrectionRate(
  selectedCorrection: CorrectionCandidate,
  dataset: AnomalyDataset,
): number {
  if (!dataset.isNullCorrect) return 0; // Only applies when null is correct
  return selectedCorrection.isNull ? 0 : 1;
}

/**
 * Dimensional validity: whether the correction expression has the correct
 * output dimension given the variable dimensions.
 */
export function dimensionalValidityRate(
  correction: SymExpr,
  variableDimensions: Record<string, DimVector>,
  outputDimension: DimVector,
): boolean {
  const inferred = inferDimension(correction, variableDimensions);
  if (inferred === null) return false;
  // For null correction (C(0)), dimension is dimensionless — always valid
  if (correction.type === 'const' && correction.value === 0) return true;
  return dimEqual(inferred, outputDimension);
}

// ---------------------------------------------------------------------------
// Composite P3 Metrics
// ---------------------------------------------------------------------------

export interface P3Metrics {
  scenarioId: string;
  baseline: string;
  noiseLevel: number;
  seed: number;
  /** Fraction of anomaly resolved (binary: >90% reduction) */
  anomalyResolutionRate: number;
  /** Continuous held-out residual reduction */
  heldoutResidualReduction: number;
  /** Whether the planted correction family was identified */
  correctionRecoveryRate: boolean;
  /** False positive rate (selecting non-null when null is correct) */
  falsePositiveCorrectionRate: number;
  /** Whether the correction is dimensionally valid */
  dimensionalValidity: boolean;
  /** AST complexity of the selected correction */
  complexity: number;
  /** Number of queries used */
  queryCost: number;
  /** Gap from oracle performance */
  oracleGap: number;
  /** Family of the selected correction */
  selectedFamily: string;
  /** Family of the planted correction */
  plantedFamily: string;
}

export function computeP3Metrics(
  selectedCorrection: CorrectionCandidate | null,
  dataset: AnomalyDataset,
  baseline: string,
  noiseLevel: number,
  seed: number,
  queryCost: number,
  oracleReduction: number,
): P3Metrics {
  if (!selectedCorrection) {
    return {
      scenarioId: dataset.id,
      baseline,
      noiseLevel,
      seed,
      anomalyResolutionRate: 0,
      heldoutResidualReduction: 0,
      correctionRecoveryRate: false,
      falsePositiveCorrectionRate: dataset.isNullCorrect ? 1 : 0,
      dimensionalValidity: false,
      complexity: 0,
      queryCost,
      oracleGap: oracleReduction,
      selectedFamily: 'none',
      plantedFamily: dataset.plantedFamily,
    };
  }

  const reduction = heldoutResidualReduction(selectedCorrection.expr, dataset);
  const resolved = anomalyResolutionRate(selectedCorrection.expr, dataset, dataset.heldout);
  const recovered = correctionRecoveryRate(selectedCorrection.family, dataset.plantedFamily);
  const fpRate = falsePositiveCorrectionRate(selectedCorrection, dataset);
  const dimValid = dimensionalValidityRate(
    selectedCorrection.expr,
    dataset.variableDimensions,
    dataset.outputDimension,
  );
  const comp = complexity(selectedCorrection.expr);
  const oracleGap = Math.max(0, oracleReduction - reduction);

  return {
    scenarioId: dataset.id,
    baseline,
    noiseLevel,
    seed,
    anomalyResolutionRate: resolved,
    heldoutResidualReduction: reduction,
    correctionRecoveryRate: recovered,
    falsePositiveCorrectionRate: fpRate,
    dimensionalValidity: dimValid,
    complexity: comp,
    queryCost,
    oracleGap,
    selectedFamily: selectedCorrection.family,
    plantedFamily: dataset.plantedFamily,
  };
}
