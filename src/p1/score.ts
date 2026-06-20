/** @deprecated Use p1Benchmark.ts instead. Kept temporarily for backward compatibility. */
// P1 symbolic-expression TheoryScore.
//
// Per docs/theory-score.md §3, P1 score is the *only* allowed score form for
// this stage (the full 7-term vision formula is explicitly forbidden in P0/P1):
//
//   P1Score(T) =
//       heldout_prediction_accuracy(T)    // expression T's prediction accuracy on heldout
//     + symbolic_equivalence_score(T)     // is T symbolically equivalent to target formula
//     - expression_complexity(T)          // AST node count / depth penalty
//     - query_cost(T)                     // query + token cost (same as P0)
//
// Every score MUST also emit Score + Confidence + EvidenceLevel + known_failures
// (docs/theory-score.md §4). P1 evidence_level is `P1_symbolic_benchmark`.

export interface P1ScoreInput {
  /** Heldout prediction accuracy in [0,1] (e.g. 1 - normalized_mse). */
  heldoutAccuracy: number;
  /** Symbolic equivalence score in [0,1] (1 = exactly equivalent, 0 = not). */
  symbolicEqScore: number;
  /** Expression complexity penalty (e.g. node count, normalized if needed). */
  exprComplexity: number;
  /** Query cost penalty (queries + token cost, already normalized). */
  queryCost: number;
  /** Optional: number of heldout samples used (drives confidence). */
  heldoutN?: number;
  /** Optional: known failure patterns to surface in the audit output. */
  knownFailures?: string[];
}

export interface P1ScoreOutput {
  /** P1Score numerical value. */
  score: number;
  /** Confidence in [0,1], based on heldout sample size and variance. */
  confidence: number;
  /** Evidence level label — always `P1_symbolic_benchmark` for this scorer. */
  evidenceLevel: string;
  /** Known failure cases (auditable). */
  knownFailures: string[];
  /** Component breakdown for transparency / debugging. */
  components: {
    heldoutAccuracy: number;
    symbolicEqScore: number;
    exprComplexity: number;
    queryCost: number;
  };
}

/**
 * Compute the P1 TheoryScore.
 *
 * Weights are fixed constants written into the output for reproducibility
 * (no empirical calibration in P1 — see docs/theory-score.md §1.2).
 *   w_acc = 1.0   w_eq = 0.5   w_cplx = 0.05   w_q = 0.1
 * The penalty terms (exprComplexity, queryCost) are expected to already be
 * non-negative numbers; the scorer multiplies them by their weights.
 */
export function p1Score(opts: P1ScoreInput): P1ScoreOutput {
  const wAcc = 1.0;
  const wEq = 0.5;
  const wCplx = 0.05;
  const wQ = 0.1;

  const heldoutAccuracy = clamp01(opts.heldoutAccuracy);
  const symbolicEqScore = clamp01(opts.symbolicEqScore);
  const exprComplexity = Math.max(0, opts.exprComplexity);
  const queryCost = Math.max(0, opts.queryCost);

  const score =
    wAcc * heldoutAccuracy +
    wEq * symbolicEqScore -
    wCplx * exprComplexity -
    wQ * queryCost;

  // Confidence: simple function of heldout sample size, capped at 0.95.
  // With <5 samples we are very unsure; with >=50 we are near the cap.
  const n = opts.heldoutN ?? 0;
  const confidence = clamp01(n <= 0 ? 0 : Math.min(0.95, 0.5 + 0.45 * (1 - Math.exp(-n / 20))));

  return {
    score: round(score, 6),
    confidence: round(confidence, 4),
    evidenceLevel: 'P1_symbolic_benchmark',
    knownFailures: opts.knownFailures ?? [],
    components: {
      heldoutAccuracy,
      symbolicEqScore,
      exprComplexity,
      queryCost,
    },
  };
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}
