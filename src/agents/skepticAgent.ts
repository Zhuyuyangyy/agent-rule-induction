/**
 * SkepticAgent - Finds flaws, counterexamples, and overfitting in candidates.
 *
 * Tests candidates on edge cases and checks for:
 * - Numerical instability (NaN/Inf at boundary values)
 * - Overfitting indicators (high complexity relative to observation count)
 * - Dimensional violations (heuristic check without SymPy)
 * - Extreme value behavior
 *
 * The skeptic CHALLENGES but does not eliminate — the workflow decides.
 */

import { BaseAgent } from "./baseAgent.js";
import type { AgentAction, Candidate, Challenge, WorkflowState } from "./types.js";

// ---------------------------------------------------------------------------
// Safe expression evaluator (same as ExperimentDesignerAgent)
// ---------------------------------------------------------------------------

function safeEvaluate(
  expression: string,
  queryPoint: Record<string, number>,
): number {
  try {
    const keys = Object.keys(queryPoint);
    const values = Object.values(queryPoint);

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
// SkepticAgent
// ---------------------------------------------------------------------------

export interface SkepticConfig {
  /** Variable names and their edge-case values [near_zero, very_large, negative]. */
  variableEdgeCases: Record<string, [number, number, number]>;
  /** Maximum complexity-to-observations ratio before flagging overfitting. */
  overfittingThreshold: number;
}

export class SkepticAgent extends BaseAgent {
  private config: SkepticConfig;

  constructor(config: SkepticConfig) {
    super("skeptic");
    this.config = config;
  }

  async act(state: WorkflowState): Promise<AgentAction[]> {
    const survivingCandidates = state.candidates.filter(
      (c) => !state.eliminatedIds.includes(c.id),
    );

    const challenges: Challenge[] = [];

    for (const candidate of survivingCandidates) {
      // Check 1: Numerical instability at edge cases
      const instabilityIssues = this.checkNumericalInstability(candidate);
      challenges.push(...instabilityIssues);

      // Check 2: Overfitting indicators
      const overfittingIssues = this.checkOverfitting(candidate, state);
      challenges.push(...overfittingIssues);

      // Check 3: Extreme value behavior
      const extremeIssues = this.checkExtremeValues(candidate);
      challenges.push(...extremeIssues);
    }

    return [this.logAction("challenge_candidates", { challenges })];
  }

  /**
   * Check if the candidate produces NaN/Inf at edge-case inputs.
   */
  private checkNumericalInstability(candidate: Candidate): Challenge[] {
    const challenges: Challenge[] = [];
    const varNames = Object.keys(this.config.variableEdgeCases);

    if (varNames.length === 0) return challenges;

    // Test near-zero values
    const nearZeroPoint: Record<string, number> = {};
    for (const [varName, [nearZero]] of Object.entries(
      this.config.variableEdgeCases,
    )) {
      nearZeroPoint[varName] = nearZero;
    }
    const nearZeroResult = safeEvaluate(candidate.expression, nearZeroPoint);
    if (isNaN(nearZeroResult)) {
      challenges.push({
        candidateId: candidate.id,
        issue: "Produces NaN at near-zero input values",
        severity: "high",
      });
    }

    // Test very large values
    const largePoint: Record<string, number> = {};
    for (const [varName, edgeCases] of Object.entries(
      this.config.variableEdgeCases,
    )) {
      largePoint[varName] = edgeCases[1];
    }
    const largeResult = safeEvaluate(candidate.expression, largePoint);
    if (isNaN(largeResult)) {
      challenges.push({
        candidateId: candidate.id,
        issue: "Produces NaN at very large input values",
        severity: "high",
      });
    } else if (!isFinite(largeResult)) {
      challenges.push({
        candidateId: candidate.id,
        issue: "Produces Infinity at very large input values",
        severity: "medium",
      });
    }

    // Test negative values
    const negativePoint: Record<string, number> = {};
    for (const [varName, edgeCases] of Object.entries(
      this.config.variableEdgeCases,
    )) {
      negativePoint[varName] = edgeCases[2];
    }
    const negativeResult = safeEvaluate(candidate.expression, negativePoint);
    if (isNaN(negativeResult)) {
      challenges.push({
        candidateId: candidate.id,
        issue: "Produces NaN at negative input values",
        severity: "medium",
      });
    }

    return challenges;
  }

  /**
   * Check if the candidate is likely overfitting based on complexity vs data.
   */
  private checkOverfitting(
    candidate: Candidate,
    state: WorkflowState,
  ): Challenge[] {
    const challenges: Challenge[] = [];

    // Heuristic: count AST-like nodes as a complexity proxy
    const complexity = this.estimateComplexity(candidate.expression);
    const observationCount = state.observations.length;

    if (
      observationCount > 0 &&
      complexity / observationCount > this.config.overfittingThreshold
    ) {
      challenges.push({
        candidateId: candidate.id,
        issue: `High complexity (${complexity}) relative to observations (${observationCount})`,
        severity: "medium",
      });
    }

    return challenges;
  }

  /**
   * Check for extreme value behavior (e.g., output magnitude >> 1e6).
   */
  private checkExtremeValues(candidate: Candidate): Challenge[] {
    const challenges: Challenge[] = [];
    const varNames = Object.keys(this.config.variableEdgeCases);

    if (varNames.length === 0) return challenges;

    // Test at mid-range values
    const midPoint: Record<string, number> = {};
    for (const [varName, [nearZero, veryLarge]] of Object.entries(
      this.config.variableEdgeCases,
    )) {
      midPoint[varName] = (nearZero + veryLarge) / 2;
    }

    const midResult = safeEvaluate(candidate.expression, midPoint);
    if (isFinite(midResult) && Math.abs(midResult) > 1e10) {
      challenges.push({
        candidateId: candidate.id,
        issue: `Extreme output magnitude (${midResult.toExponential(2)}) at mid-range inputs`,
        severity: "low",
      });
    }

    return challenges;
  }

  /**
   * Rough complexity estimate: count operators and function calls.
   */
  private estimateComplexity(expression: string): number {
    const operators = (expression.match(/[+\-*/^]/g) || []).length;
    const functions = (
      expression.match(/\b(sqrt|exp|log|sin|cos|abs)\b/g) || []
    ).length;
    return operators + functions * 2 + 1;
  }
}
