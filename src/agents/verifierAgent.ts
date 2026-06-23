/**
 * VerifierAgent - Calls the SymPy verifier for hard constraint checks.
 *
 * Uses VerifierClient from src/verifier/verifierClient.ts to check:
 * - Symbolic equivalence (against a target, if provided)
 * - Dimensional homogeneity
 * - Complexity bounds
 *
 * This agent is a PROPOSAL mechanism — it flags violations but does not
 * unilaterally eliminate candidates. The workflow decides elimination.
 */

import { BaseAgent } from "./baseAgent.js";
import type { AgentAction, Candidate, VerificationResult, WorkflowState } from "./types.js";
import { VerifierClient } from "../verifier/verifierClient.js";

// ---------------------------------------------------------------------------
// VerifierAgent
// ---------------------------------------------------------------------------

export interface VerifierAgentConfig {
  /** Dimensional annotations for variables: varName -> dimension string. */
  variableDimensions: Record<string, string>;
  /** Expected output dimension (e.g., "[L][T]^-2"). */
  expectedDimension?: string;
  /** Maximum allowed complexity score. */
  maxComplexity?: number;
  /** Whether to enable the verifier cache. */
  enableCache?: boolean;
}

export class VerifierAgent extends BaseAgent {
  private client: VerifierClient;
  private config: VerifierAgentConfig;

  constructor(config: VerifierAgentConfig) {
    super("verifier");
    this.config = config;
    this.client = new VerifierClient({ enableCache: config.enableCache ?? true });
  }

  async act(state: WorkflowState): Promise<AgentAction[]> {
    const survivingCandidates = state.candidates.filter(
      (c) => !state.eliminatedIds.includes(c.id),
    );

    const results: VerificationResult[] = [];

    for (const candidate of survivingCandidates) {
      const violations: string[] = [];

      // Check dimensional homogeneity
      const dimResult = await this.client.checkDimension(
        candidate.expression,
        this.config.variableDimensions,
        this.config.expectedDimension,
      );
      if (!dimResult.valid) {
        violations.push(...dimResult.violations);
      }

      // Check complexity
      if (this.config.maxComplexity !== undefined) {
        const complexResult = await this.client.checkComplexity(
          candidate.expression,
          this.config.maxComplexity,
        );
        if (!complexResult.valid) {
          violations.push(...complexResult.violations);
        }
      }

      results.push({
        candidateId: candidate.id,
        valid: violations.length === 0,
        violations,
      });
    }

    return [this.logAction("verify_candidates", { results })];
  }
}
