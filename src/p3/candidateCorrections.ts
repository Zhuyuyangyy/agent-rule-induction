// P3 Candidate Corrections
// Defines correction candidate families for anomaly-driven theory refinement.
// Each family represents a structurally distinct type of correction term.

import {
  type SymExpr, C, V, Add, Sub, Mul, Div, Pow,
} from '../p1/symbolicExpr.js';
import type { DimVector } from '../p2/dimensionalConstraints.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CorrectionCandidate {
  /** Unique identifier for this candidate */
  id: string;
  /** Family name */
  family: string;
  /** Symbolic expression for the correction term */
  expr: SymExpr;
  /** Human-readable description */
  description: string;
  /** Dimensional annotation: what dimension this correction should have */
  expectedDimension: DimVector;
  /** Complexity (AST node count) */
  complexity: number;
  /** Whether this is the null (no correction) candidate */
  isNull: boolean;
  /** Whether this is a spurious/overfitting candidate */
  isSpurious: boolean;
}

// ---------------------------------------------------------------------------
// Correction Family Generators
// ---------------------------------------------------------------------------

/**
 * Generate all candidate corrections for a given scenario's variable set
 * and output dimension.
 */
export function generateCandidateCorrections(
  variableDimensions: Record<string, DimVector>,
  outputDimension: DimVector,
): CorrectionCandidate[] {
  const candidates: CorrectionCandidate[] = [];
  const varNames = Object.keys(variableDimensions);

  // Family 1: inverse_square_perturbation: alpha / r^2
  if (varNames.includes('r')) {
    candidates.push({
      id: 'inv_sq_pert',
      family: 'inverse_square_perturbation',
      expr: Div(V('alpha'), Pow(V('r'), C(2))),
      description: 'α/r² perturbation',
      expectedDimension: outputDimension,
      complexity: 4,
      isNull: false,
      isSpurious: false,
    });
  }

  // Family 2: inverse_cube_perturbation: beta / r^3
  if (varNames.includes('r')) {
    candidates.push({
      id: 'inv_cube_pert',
      family: 'inverse_cube_perturbation',
      expr: Div(V('beta'), Pow(V('r'), C(3))),
      description: 'β/r³ perturbation',
      expectedDimension: outputDimension,
      complexity: 4,
      isNull: false,
      isSpurious: false,
    });
  }

  // Family 3: velocity_dependent: gamma * v^2 / r
  if (varNames.includes('v') && varNames.includes('r')) {
    candidates.push({
      id: 'vel_dep',
      family: 'velocity_dependent',
      expr: Div(Mul(V('gamma'), Pow(V('v'), C(2))), V('r')),
      description: 'γv²/r correction',
      expectedDimension: outputDimension,
      complexity: 5,
      isNull: false,
      isSpurious: false,
    });
  }

  // Family 4: angular_momentum_like: delta * L^2 / r^3
  if (varNames.includes('L') && varNames.includes('r')) {
    candidates.push({
      id: 'ang_mom_like',
      family: 'angular_momentum_like',
      expr: Div(Mul(V('delta'), Pow(V('L'), C(2))), Pow(V('r'), C(3))),
      description: 'δL²/r³ correction',
      expectedDimension: outputDimension,
      complexity: 5,
      isNull: false,
      isSpurious: false,
    });
  }

  // Family 4b: angular_momentum_like with c^2: delta * L^2 / (c^2 * r^4)
  if (varNames.includes('L') && varNames.includes('r') && varNames.includes('c')) {
    candidates.push({
      id: 'ang_mom_gr_like',
      family: 'angular_momentum_like',
      expr: Div(Mul(V('delta'), Pow(V('L'), C(2))), Mul(Pow(V('c'), C(2)), Pow(V('r'), C(4)))),
      description: 'δL²/(c²r⁴) GR-like correction',
      expectedDimension: outputDimension,
      complexity: 7,
      isNull: false,
      isSpurious: false,
    });
  }

  // Family 5: polynomial_residual: epsilon * r^n
  if (varNames.includes('r')) {
    // n=1 linear
    candidates.push({
      id: 'poly_res_lin',
      family: 'polynomial_residual',
      expr: Mul(V('epsilon'), V('r')),
      description: 'εr polynomial residual',
      expectedDimension: outputDimension,
      complexity: 3,
      isNull: false,
      isSpurious: false,
    });
    // n=2 quadratic
    candidates.push({
      id: 'poly_res_quad',
      family: 'polynomial_residual',
      expr: Mul(V('epsilon'), Pow(V('r'), C(2))),
      description: 'εr² polynomial residual',
      expectedDimension: outputDimension,
      complexity: 4,
      isNull: false,
      isSpurious: false,
    });
  }

  // Family 6: spurious_overfit — high-order polynomial
  if (varNames.includes('r')) {
    candidates.push({
      id: 'spurious_poly',
      family: 'spurious_overfit',
      expr: Add(
        Add(
          Mul(V('a0'), Pow(V('r'), C(5))),
          Mul(V('a1'), Pow(V('r'), C(4)))
        ),
        Add(
          Mul(V('a2'), Pow(V('r'), C(3))),
          Mul(V('a3'), Pow(V('r'), C(2)))
        )
      ),
      description: 'High-order polynomial (spurious overfit)',
      expectedDimension: outputDimension,
      complexity: 15,
      isNull: false,
      isSpurious: true,
    });
  }

  // Family 7: null_correction — no correction needed
  candidates.push({
    id: 'null_corr',
    family: 'null_correction',
    expr: C(0),
    description: 'No correction (null)',
    expectedDimension: [0, 0, 0], // dimensionless zero
    complexity: 1,
    isNull: true,
    isSpurious: false,
  });

  return candidates;
}

/**
 * Get the list of unique correction family names.
 */
export function getCorrectionFamilies(): string[] {
  return [
    'inverse_square_perturbation',
    'inverse_cube_perturbation',
    'velocity_dependent',
    'angular_momentum_like',
    'polynomial_residual',
    'spurious_overfit',
    'null_correction',
  ];
}
