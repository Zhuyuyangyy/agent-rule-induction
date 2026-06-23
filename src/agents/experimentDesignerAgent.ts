/**
 * ExperimentDesignerAgent - Selects high-information query points.
 *
 * Implements active infogain query selection using variance-based strategy.
 * Given current candidates, selects the query point that maximizes
 * variance across candidate predictions (max-discrepancy sampling).
 */

import { BaseAgent } from "./baseAgent.js";
import type { AgentAction, Candidate, WorkflowState } from "./types.js";

// ---------------------------------------------------------------------------
// Safe expression evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate a candidate expression at a given query point.
 * Returns NaN if evaluation fails (syntax error, undefined variable, etc.).
 */
function safeEvaluate(
  expression: string,
  queryPoint: Record<string, number>,
): number {
  try {
    const keys = Object.keys(queryPoint);
    const values = Object.values(queryPoint);

    // Build a function from the expression using Math functions
    const mathExpr = expression
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\bexp\b/g, "Math.exp")
      .replace(/\blog\b/g, "Math.log")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\^/g, "**");

    const fn = new Function(...keys, `"use strict"; return (${mathExpr});`);
    const result = fn(...values);

    if (typeof result !== "number" || !isFinite(result)) {
      return NaN;
    }
    return result;
  } catch {
    return NaN;
  }
}

// ---------------------------------------------------------------------------
// ExperimentDesignerAgent
// ---------------------------------------------------------------------------

export interface ExperimentDesignerConfig {
  /** Variable names and their search ranges [min, max]. */
  variableRanges: Record<string, [number, number]>;
  /** Number of candidate query points to sample per round. */
  sampleSize: number;
  /** Seeded RNG function. */
  rng: () => number;
}

export class ExperimentDesignerAgent extends BaseAgent {
  private config: ExperimentDesignerConfig;

  constructor(config: ExperimentDesignerConfig) {
    super("experiment_designer");
    this.config = config;
  }

  async act(state: WorkflowState): Promise<AgentAction[]> {
    const survivingCandidates = state.candidates.filter(
      (c) => !state.eliminatedIds.includes(c.id),
    );

    if (survivingCandidates.length === 0) {
      return [
        this.logAction("design_experiment", {
          queryPoint: this.randomQueryPoint(),
          expectedInfoGain: 0,
        }),
      ];
    }

    // Generate candidate query points and score them by variance
    let bestPoint = this.randomQueryPoint();
    let bestVariance = -1;

    for (let i = 0; i < this.config.sampleSize; i++) {
      const point = this.randomQueryPoint();
      const variance = this.computePredictionVariance(survivingCandidates, point);

      if (variance > bestVariance) {
        bestVariance = variance;
        bestPoint = point;
      }
    }

    return [
      this.logAction("design_experiment", {
        queryPoint: bestPoint,
        expectedInfoGain: bestVariance,
      }),
    ];
  }

  /**
   * Compute the variance of candidate predictions at a query point.
   * Higher variance = more information gain from observing at that point.
   */
  private computePredictionVariance(
    candidates: Candidate[],
    queryPoint: Record<string, number>,
  ): number {
    const predictions = candidates
      .map((c) => safeEvaluate(c.expression, queryPoint))
      .filter((v) => !isNaN(v) && isFinite(v));

    if (predictions.length < 2) return 0;

    const mean =
      predictions.reduce((sum, v) => sum + v, 0) / predictions.length;
    const variance =
      predictions.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
      (predictions.length - 1);

    return variance;
  }

  /**
   * Generate a random query point within the configured variable ranges.
   */
  private randomQueryPoint(): Record<string, number> {
    const point: Record<string, number> = {};
    for (const [varName, [min, max]] of Object.entries(
      this.config.variableRanges,
    )) {
      point[varName] = min + this.config.rng() * (max - min);
    }
    return point;
  }
}
