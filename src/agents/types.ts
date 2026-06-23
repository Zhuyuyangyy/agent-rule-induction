/**
 * Agent type definitions for the Active Theory Discovery multi-agent workflow.
 *
 * Key principle: LLM agents can only PROPOSE, never be the final judge.
 * No agent can self-certify discovery. The system does NOT discover new physical laws.
 */

/** The role each agent plays in the workflow. */
export type AgentRole =
  | "proposer"
  | "experiment_designer"
  | "verifier"
  | "skeptic"
  | "reviewer"
  | "archivist";

/** A single action taken by an agent, recorded in the audit log. */
export interface AgentAction {
  role: AgentRole;
  action: string;
  payload: unknown;
  timestamp: number;
}

/** A candidate expression proposed by the ProposerAgent. */
export interface Candidate {
  id: string;
  expression: string;
  source: string;
  metadata: Record<string, unknown>;
}

/** An observation from a query point. */
export interface Observation {
  queryPoint: Record<string, number>;
  value: number;
  noise: number;
}

/** The mutable state carried through the workflow loop. */
export interface WorkflowState {
  candidates: Candidate[];
  observations: Observation[];
  eliminatedIds: string[];
  auditLog: AgentAction[];
  round: number;
  budgetRemaining: number;
}

/** Configuration for the workflow run. */
export interface WorkflowConfig {
  maxRounds: number;
  budgetPerRound: number;
  proposerConfig: unknown;
  verifierEnabled: boolean;
  reviewerEnabled: boolean;
}

/** Template types available to the ProposerAgent. */
export type TemplateType =
  | "linear"
  | "quadratic"
  | "product"
  | "ratio"
  | "power"
  | "sqrt"
  | "exp"
  | "log"
  | "sin"
  | "cos"
  | "mixed1"
  | "mixed2"
  | "rational"
  | "polynomial"
  | "correction";

/** Verification result for a single candidate. */
export interface VerificationResult {
  candidateId: string;
  valid: boolean;
  violations: string[];
}

/** A challenge raised by the SkepticAgent against a candidate. */
export interface Challenge {
  candidateId: string;
  issue: string;
  severity: "low" | "medium" | "high";
}

/** Forbidden claim phrases that must never appear in outputs. */
export const FORBIDDEN_CLAIMS = [
  "discovers new physical laws",
  "surpasses relativity",
  "complete AI scientist",
  "solves scientific discovery",
] as const;

export type ForbiddenClaim = (typeof FORBIDDEN_CLAIMS)[number];

/** Metrics tracked across the workflow. */
export interface WorkflowMetrics {
  proposalValidityRate: number;
  verifierRejectionRate: number;
  activeQueryGain: number;
  hallucinationRate: number;
  claimViolationRate: number;
}
