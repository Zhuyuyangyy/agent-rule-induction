/**
 * ReviewerAgent - Checks for overclaiming and forbidden claim boundaries.
 *
 * Scans candidate metadata, descriptions, and any textual output for
 * violations of the forbidden claim boundary. The reviewer does NOT
 * evaluate scientific validity — it only guards against overclaiming.
 *
 * Forbidden claims:
 * - "discovers new physical laws"
 * - "surpasses relativity"
 * - "complete AI scientist"
 * - "solves scientific discovery"
 */

import { BaseAgent } from "./baseAgent.js";
import type { AgentAction, WorkflowState } from "./types.js";
import { FORBIDDEN_CLAIMS } from "./types.js";

// ---------------------------------------------------------------------------
// ReviewerAgent
// ---------------------------------------------------------------------------

export class ReviewerAgent extends BaseAgent {
  constructor() {
    super("reviewer");
  }

  async act(state: WorkflowState): Promise<AgentAction[]> {
    const violations: string[] = [];

    // Scan all candidate metadata for forbidden claims
    for (const candidate of state.candidates) {
      const textToScan = this.extractScannableText(candidate);
      for (const forbidden of FORBIDDEN_CLAIMS) {
        if (textToScan.toLowerCase().includes(forbidden.toLowerCase())) {
          violations.push(
            `Candidate ${candidate.id} contains forbidden claim: "${forbidden}"`,
          );
        }
      }
    }

    // Scan audit log entries for forbidden claims
    for (const entry of state.auditLog) {
      const payloadStr = JSON.stringify(entry.payload);
      for (const forbidden of FORBIDDEN_CLAIMS) {
        if (payloadStr.toLowerCase().includes(forbidden.toLowerCase())) {
          violations.push(
            `Audit log entry by ${entry.role} contains forbidden claim: "${forbidden}"`,
          );
        }
      }
    }

    const approved = violations.length === 0;

    return [this.logAction("review_claims", { violations, approved })];
  }

  /**
   * Extract all scannable text from a candidate for forbidden-claim checking.
   */
  private extractScannableText(candidate: {
    expression: string;
    source: string;
    metadata: Record<string, unknown>;
  }): string {
    const parts: string[] = [candidate.expression, candidate.source];
    for (const value of Object.values(candidate.metadata)) {
      if (typeof value === "string") {
        parts.push(value);
      }
    }
    return parts.join(" ");
  }
}
