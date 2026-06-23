/**
 * VerifierTypes - Type definitions for the SymPy verifier IPC protocol.
 */

/** Result returned by the SymPy verifier. */
export interface VerifierResult {
  valid: boolean;
  canonical_expr: string | null;
  violations: string[];
  computed_limit?: string;
  checked_invariants?: InvariantCheckResult[];
  complexity?: number;
}

export interface InvariantCheckResult {
  type: string;
  variables: string[];
  passed: boolean;
  detail: string;
}

/** Options for the verifier client. */
export interface VerifierClientOptions {
  verifierPath?: string;
  timeoutMs?: number;
  pythonPath?: string;
  enableCache?: boolean;
  maxCacheSize?: number;
}

/** Equivalence check request. */
export interface EquivalenceCheckRequest {
  task: "equivalence_check";
  expr: string;
  target_expr: string;
  variables?: Record<string, string>;
  options?: { simplify?: boolean; tolerance?: number };
}

/** Dimension check request. */
export interface DimensionCheckRequest {
  task: "dimension_check";
  expr: string;
  variables: Record<string, string>;
  expected_dimension?: string;
}

/** Canonicalize request. */
export interface CanonicalizeRequest {
  task: "canonicalize";
  expr: string;
}

/** Limit check request. */
export interface LimitCheckRequest {
  task: "limit_check";
  expr: string;
  test_point: Record<string, string | number>;
  expected_limit?: string;
  direction?: "+" | "-";
}

/** Invariant check request. */
export interface InvariantCheckRequest {
  task: "invariant_check";
  expr: string;
  invariants: Array<{
    type: "conservation" | "symmetry" | "positivity";
    variables: string[];
  }>;
}

/** Complexity check request. */
export interface ComplexityCheckRequest {
  task: "complexity_check";
  expr: string;
  max_complexity?: number;
}

export type VerifierRequest =
  | EquivalenceCheckRequest
  | DimensionCheckRequest
  | CanonicalizeRequest
  | LimitCheckRequest
  | InvariantCheckRequest
  | ComplexityCheckRequest;

/** All supported task types. */
export const VERIFIER_TASKS = [
  "equivalence_check",
  "dimension_check",
  "canonicalize",
  "limit_check",
  "invariant_check",
  "complexity_check",
] as const;

export type VerifierTask = (typeof VERIFIER_TASKS)[number];
