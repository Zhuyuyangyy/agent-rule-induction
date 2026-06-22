// P4 Verifier-Filtered Search
// Takes a list of candidate SymExprs and filters by dimensional validity
// using P2's inferDimension. Returns passed/rejected sets and rejection rate.

import type { SymExpr } from '../p1/symbolicExpr.js';
import { type DimVector, inferDimension, dimEqual } from '../p2/dimensionalConstraints.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VerifierResult {
  /** Candidates that passed dimensional check */
  passed: SymExpr[];
  /** Candidates that were rejected by the verifier */
  rejected: SymExpr[];
  /** Rejection details for each rejected candidate */
  rejectionDetails: RejectionDetail[];
  /** Fraction of candidates rejected */
  rejectionRate: number;
}

export interface RejectionDetail {
  expr: SymExpr;
  reason: string;
  inferredDim: DimVector | null;
  expectedDim: DimVector;
}

// ---------------------------------------------------------------------------
// Main verification function
// ---------------------------------------------------------------------------

/**
 * Filter a list of candidate SymExprs by dimensional validity.
 *
 * For each candidate, checks:
 * 1. Whether inferDimension returns a valid dimension (not null)
 * 2. Whether the inferred dimension matches the expected output dimension
 *
 * @param candidates - List of candidate SymExprs to verify
 * @param varDims - Dimension mapping for each variable name
 * @param expectedOutputDim - The expected output dimension of the target formula
 */
export function verifierFilter(
  candidates: SymExpr[],
  varDims: Record<string, DimVector>,
  expectedOutputDim: DimVector,
): VerifierResult {
  const passed: SymExpr[] = [];
  const rejected: SymExpr[] = [];
  const rejectionDetails: RejectionDetail[] = [];

  for (const expr of candidates) {
    const inferred = inferDimension(expr, varDims);

    if (inferred === null) {
      rejected.push(expr);
      rejectionDetails.push({
        expr,
        reason: 'Dimensionally inhomogeneous expression',
        inferredDim: null,
        expectedDim: expectedOutputDim,
      });
      continue;
    }

    if (!dimEqual(inferred, expectedOutputDim)) {
      rejected.push(expr);
      rejectionDetails.push({
        expr,
        reason: `Dimension mismatch: got [${inferred}], expected [${expectedOutputDim}]`,
        inferredDim: inferred,
        expectedDim: expectedOutputDim,
      });
      continue;
    }

    passed.push(expr);
  }

  const total = candidates.length;
  const rejectionRate = total > 0 ? rejected.length / total : 0;

  return { passed, rejected, rejectionDetails, rejectionRate };
}

/**
 * Quick check: is a single candidate dimensionally valid?
 */
export function isDimensionallyValid(
  expr: SymExpr,
  varDims: Record<string, DimVector>,
  expectedOutputDim: DimVector,
): boolean {
  const inferred = inferDimension(expr, varDims);
  if (inferred === null) return false;
  return dimEqual(inferred, expectedOutputDim);
}

/**
 * Compute the invalid-dimension rate among parsed candidates.
 * This is the fraction of successfully parsed candidates that have wrong dimensions.
 */
export function computeInvalidDimensionRate(
  candidates: SymExpr[],
  varDims: Record<string, DimVector>,
  expectedOutputDim: DimVector,
): number {
  if (candidates.length === 0) return 0;
  const result = verifierFilter(candidates, varDims, expectedOutputDim);
  return result.rejectionRate;
}
