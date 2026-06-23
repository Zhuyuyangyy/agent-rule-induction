/**
 * Workflow - Orchestrates the multi-agent scientific discovery loop.
 *
 * The workflow runs a bounded loop where agents PROPOSE, VERIFY, CHALLENGE,
 * and RECORD — but no agent ever serves as the final judge. The system
 * does NOT claim discovery of new physical laws.
 *
 * Loop:
 *  1. ProposerAgent generates candidates
 *  2. VerifierAgent checks constraints
 *  3. ExperimentDesignerAgent selects queries
 *  4. Observe (simulated or real)
 *  5. Update candidate pool (eliminate inconsistent)
 *  6. SkepticAgent challenges remaining candidates
 *  7. ReviewerAgent checks for overclaiming
 *  8. ArchivistAgent records state
 *  9. Repeat until budget exhausted or only one candidate remains
 */

import type {
  AgentAction,
  Candidate,
  Observation,
  VerificationResult,
  Challenge,
  WorkflowConfig,
  WorkflowState,
  WorkflowMetrics,
} from "./types.js";
import { ProposerAgent, type ProposerConfig } from "./proposerAgent.js";
import { ExperimentDesignerAgent, type ExperimentDesignerConfig } from "./experimentDesignerAgent.js";
import { VerifierAgent, type VerifierAgentConfig } from "./verifierAgent.js";
import { SkepticAgent, type SkepticConfig } from "./skepticAgent.js";
import { ReviewerAgent } from "./reviewerAgent.js";
import { ArchivistAgent, type ArchivistConfig } from "./archivistAgent.js";

// ---------------------------------------------------------------------------
// Oracle interface (for simulated or real observations)
// ---------------------------------------------------------------------------

export interface Oracle {
  observe(queryPoint: Record<string, number>): Promise<{ value: number; noise: number }>;
}

/** A simple simulated oracle that evaluates a known expression. */
export class SimulatedOracle implements Oracle {
  private expression: string;
  private noiseLevel: number;
  private rng: () => number;

  constructor(expression: string, noiseLevel: number, rng: () => number) {
    this.expression = expression;
    this.noiseLevel = noiseLevel;
    this.rng = rng;
  }

  async observe(queryPoint: Record<string, number>): Promise<{ value: number; noise: number }> {
    const value = this.evaluate(queryPoint);
    const noise = this.noiseLevel * (this.rng() - 0.5) * 2;
    return { value: value + noise, noise: this.noiseLevel };
  }

  private evaluate(queryPoint: Record<string, number>): number {
    try {
      const keys = Object.keys(queryPoint);
      const values = Object.values(queryPoint);
      const mathExpr = this.expression
        .replace(/\bsqrt\b/g, "Math.sqrt")
        .replace(/\bexp\b/g, "Math.exp")
        .replace(/\blog\b/g, "Math.log")
        .replace(/\bsin\b/g, "Math.sin")
        .replace(/\bcos\b/g, "Math.cos")
        .replace(/\babs\b/g, "Math.abs")
        .replace(/\^/g, "**");
      const fn = new Function(...keys, `"use strict"; return (${mathExpr});`);
      return fn(...values);
    } catch {
      return NaN;
    }
  }
}

// ---------------------------------------------------------------------------
// Workflow configuration (full)
// ---------------------------------------------------------------------------

export interface WorkflowFullConfig extends WorkflowConfig {
  proposerConfig: ProposerConfig;
  experimentDesignerConfig: ExperimentDesignerConfig;
  verifierAgentConfig?: VerifierAgentConfig;
  skepticConfig: SkepticConfig;
  archivistConfig: ArchivistConfig;
  /** Oracle for obtaining observations. If not provided, a no-op oracle is used. */
  oracle?: Oracle;
  /** Tolerance for consistency check (how close a candidate prediction must be to observation). */
  consistencyTolerance: number;
}

// ---------------------------------------------------------------------------
// Main workflow
// ---------------------------------------------------------------------------

/**
 * Run the multi-agent scientific workflow.
 *
 * Returns the final candidate set and audit trail.
 * This function NEVER claims discovery. It returns the surviving candidates
 * and a complete audit log for external review.
 */
export async function runWorkflow(
  config: WorkflowFullConfig,
): Promise<{ finalState: WorkflowState; metrics: WorkflowMetrics }> {
  // Initialize agents
  const proposer = new ProposerAgent(config.proposerConfig);
  const experimentDesigner = new ExperimentDesignerAgent(
    config.experimentDesignerConfig,
  );
  const verifier = config.verifierEnabled && config.verifierAgentConfig
    ? new VerifierAgent(config.verifierAgentConfig)
    : null;
  const skeptic = new SkepticAgent(config.skepticConfig);
  const reviewer = config.reviewerEnabled
    ? new ReviewerAgent()
    : null;
  const archivist = new ArchivistAgent(config.archivistConfig);

  // Initialize state
  const state: WorkflowState = {
    candidates: [],
    observations: [],
    eliminatedIds: [],
    auditLog: [],
    round: 0,
    budgetRemaining: config.maxRounds * config.budgetPerRound,
  };

  // Metrics accumulators
  let totalProposed = 0;
  let totalValid = 0;
  let totalVerifierRejected = 0;
  let totalVerifierChecked = 0;
  let totalInfoGain = 0;
  let totalHallucinated = 0;
  let totalClaimViolations = 0;

  // Main loop
  while (
    state.round < config.maxRounds &&
    state.budgetRemaining > 0 &&
    countSurviving(state) !== 1
  ) {
    state.round++;

    // Step 1: ProposerAgent generates candidates
    const proposeActions = await proposer.act(state);
    for (const action of proposeActions) {
      state.auditLog.push(action);
      const payload = action.payload as { candidates: Candidate[] };
      state.candidates.push(...payload.candidates);
      totalProposed += payload.candidates.length;
    }

    // Step 2: VerifierAgent checks constraints (if enabled)
    if (verifier) {
      const verifyActions = await verifier.act(state);
      for (const action of verifyActions) {
        state.auditLog.push(action);
        const payload = action.payload as { results: VerificationResult[] };
        for (const result of payload.results) {
          totalVerifierChecked++;
          if (result.valid) {
            totalValid++;
          } else {
            totalVerifierRejected++;
            state.eliminatedIds.push(result.candidateId);
          }
        }
      }
    }

    // Step 3: ExperimentDesignerAgent selects queries
    const experimentActions = await experimentDesigner.act(state);
    for (const action of experimentActions) {
      state.auditLog.push(action);
      const payload = action.payload as {
        queryPoint: Record<string, number>;
        expectedInfoGain: number;
      };
      totalInfoGain += payload.expectedInfoGain;

      // Step 4: Observe (using oracle or no-op)
      if (config.oracle && state.budgetRemaining > 0) {
        const observation = await config.oracle.observe(payload.queryPoint);
        state.observations.push({
          queryPoint: payload.queryPoint,
          value: observation.value,
          noise: observation.noise,
        });
        state.budgetRemaining--;

        // Step 5: Update candidate pool — eliminate inconsistent
        eliminateInconsistent(state, config.consistencyTolerance);
      }
    }

    // Step 6: SkepticAgent challenges remaining candidates
    const skepticActions = await skeptic.act(state);
    for (const action of skepticActions) {
      state.auditLog.push(action);
      const payload = action.payload as { challenges: Challenge[] };
      // Eliminate candidates with high-severity challenges
      for (const challenge of payload.challenges) {
        if (challenge.severity === "high") {
          if (!state.eliminatedIds.includes(challenge.candidateId)) {
            state.eliminatedIds.push(challenge.candidateId);
          }
        }
      }
    }

    // Step 7: ReviewerAgent checks for overclaiming
    if (reviewer) {
      const reviewActions = await reviewer.act(state);
      for (const action of reviewActions) {
        state.auditLog.push(action);
        const payload = action.payload as {
          violations: string[];
          approved: boolean;
        };
        totalClaimViolations += payload.violations.length;
        // If not approved, flag but do NOT auto-eliminate candidates.
        // The reviewer guards language, not scientific validity.
      }
    }

    // Step 8: ArchivistAgent records state
    const archiveActions = await archivist.act(state);
    for (const action of archiveActions) {
      state.auditLog.push(action);
    }

    // Count hallucinated candidates (those that produce NaN on all observations)
    for (const candidate of state.candidates) {
      if (!state.eliminatedIds.includes(candidate.id)) {
        if (isHallucinated(candidate, state.observations)) {
          totalHallucinated++;
        }
      }
    }
  }

  // Compute final metrics
  const metrics: WorkflowMetrics = {
    proposalValidityRate:
      totalProposed > 0 ? totalValid / totalProposed : 0,
    verifierRejectionRate:
      totalVerifierChecked > 0
        ? totalVerifierRejected / totalVerifierChecked
        : 0,
    activeQueryGain: state.observations.length > 0
      ? totalInfoGain / state.observations.length
      : 0,
    hallucinationRate:
      totalProposed > 0 ? totalHallucinated / totalProposed : 0,
    claimViolationRate:
      state.round > 0 ? totalClaimViolations / state.round : 0,
  };

  return { finalState: state, metrics };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countSurviving(state: WorkflowState): number {
  const eliminatedSet = new Set(state.eliminatedIds);
  return state.candidates.filter((c) => !eliminatedSet.has(c.id)).length;
}

/**
 * Eliminate candidates whose predictions are inconsistent with observations.
 * A candidate is eliminated if its prediction differs from any observation
 * by more than the tolerance (accounting for noise).
 */
function eliminateInconsistent(
  state: WorkflowState,
  tolerance: number,
): void {
  const eliminatedSet = new Set(state.eliminatedIds);

  for (const candidate of state.candidates) {
    if (eliminatedSet.has(candidate.id)) continue;

    for (const obs of state.observations) {
      const predicted = safeEvaluate(candidate.expression, obs.queryPoint);
      if (isNaN(predicted)) {
        state.eliminatedIds.push(candidate.id);
        break;
      }
      const error = Math.abs(predicted - obs.value);
      if (error > tolerance + obs.noise * 3) {
        state.eliminatedIds.push(candidate.id);
        break;
      }
    }
  }
}

/**
 * Check if a candidate is hallucinated (produces NaN on all observations).
 */
function isHallucinated(
  candidate: Candidate,
  observations: Observation[],
): boolean {
  if (observations.length === 0) return false;

  for (const obs of observations) {
    const value = safeEvaluate(candidate.expression, obs.queryPoint);
    if (!isNaN(value)) return false;
  }
  return true;
}

/**
 * Safe expression evaluator.
 */
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
    if (typeof result !== "number" || !isFinite(result)) return NaN;
    return result;
  } catch {
    return NaN;
  }
}
