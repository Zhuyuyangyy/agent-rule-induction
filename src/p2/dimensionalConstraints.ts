// P2 Dimensional Constraints
// Lightweight dimensional analysis for physics-constrained discovery.
// Uses [L, M, T] dimension vectors for fast TypeScript-native checking.

import type { SymExpr } from '../p1/symbolicExpr.js';

export type DimVector = [number, number, number]; // [L, M, T]

/** Dimension constants */
export const DIM: Record<string, DimVector> = {
  length:       [1, 0, 0],   // L
  mass:         [0, 1, 0],   // M
  time:         [0, 0, 1],   // T
  velocity:     [1, 0, -1],  // L T^-1
  acceleration: [1, 0, -2],  // L T^-2
  force:        [1, 1, -2],  // L M T^-2
  energy:       [2, 1, -2],  // L^2 M T^-2
  power:        [2, 1, -3],  // L^2 M T^-3
  pressure:     [-1, 1, -2], // L^-1 M T^-2
  frequency:    [0, 0, -1],  // T^-1
  angle:        [0, 0, 0],   // dimensionless
  dimensionless:[0, 0, 0],
  charge:       [0, 0, 0],   // treat as dimensionless for simplicity
  voltage:      [2, 1, -3],  // L^2 M T^-3 (same as power/charge, simplified)
  current:      [0, 0, -1],  // T^-1 (simplified)
  resistance:   [2, 1, -3],  // simplified
  temperature:  [0, 1, 0],   // treat as M-equivalent for thermodynamic formulas
  entropy:      [2, 1, -2],  // same as energy for simplified model
};

/** Multiply two dimension vectors (add exponents) */
export function dimMultiply(a: DimVector, b: DimVector): DimVector {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Divide two dimension vectors (subtract exponents) */
export function dimDivide(a: DimVector, b: DimVector): DimVector {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Raise a dimension vector to a power */
export function dimPower(a: DimVector, n: number): DimVector {
  return [a[0] * n, a[1] * n, a[2] * n];
}

/** Check if two dimension vectors are equal */
export function dimEqual(a: DimVector, b: DimVector): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/** Check if a dimension vector is dimensionless */
export function isDimensionless(d: DimVector): boolean {
  return d[0] === 0 && d[1] === 0 && d[2] === 0;
}

/** Format a dimension vector as a string */
export function dimToString(d: DimVector): string {
  const parts: string[] = [];
  const names = ['L', 'M', 'T'];
  for (let i = 0; i < 3; i++) {
    if (d[i] === 1) parts.push(names[i]);
    else if (d[i] !== 0) parts.push(`${names[i]}^${d[i]}`);
  }
  return parts.length === 0 ? '1' : parts.join(' ');
}

/**
 * Infer the dimension of a SymExpr given variable dimensions.
 * Returns null if the expression has dimensional inhomogeneity
 * (e.g., adding length + mass).
 */
export function inferDimension(
  expr: SymExpr,
  varDims: Record<string, DimVector>,
): DimVector | null {
  switch (expr.type) {
    case 'const':
      return [0, 0, 0]; // dimensionless constant

    case 'var':
      return varDims[expr.name] ?? null;

    case 'binop': {
      const leftDim = inferDimension(expr.left, varDims);
      const rightDim = inferDimension(expr.right, varDims);
      if (!leftDim || !rightDim) return null;

      switch (expr.op) {
        case '+':
        case '-':
          // Additive: dimensions must match
          if (!dimEqual(leftDim, rightDim)) return null;
          return leftDim;

        case '*':
          return dimMultiply(leftDim, rightDim);

        case '/':
          return dimDivide(leftDim, rightDim);

        case '^': {
          // Exponent must be a constant for dimensional analysis
          if (expr.right.type !== 'const') return null;
          const exp = expr.right.value;
          if (!Number.isInteger(exp)) return null;
          return dimPower(leftDim, exp);
        }
      }
      return null; // Unknown binop
    }

    case 'unop': {
      const argDim = inferDimension(expr.arg, varDims);
      if (!argDim) return null;

      switch (expr.op) {
        case 'neg':
          return argDim;
        case 'sin':
        case 'cos':
          // Trig functions require dimensionless argument
          if (!isDimensionless(argDim)) return null;
          return [0, 0, 0]; // dimensionless output
        case 'sqrt':
          // sqrt: each dimension exponent halved (only if all even)
          const halved: DimVector = [argDim[0] / 2, argDim[1] / 2, argDim[2] / 2];
          if (halved.some(v => !Number.isInteger(v))) return null;
          return halved;
        case 'log':
        case 'exp':
          // log/exp require dimensionless argument
          if (!isDimensionless(argDim)) return null;
          return [0, 0, 0];
        case 'abs':
          return argDim;
      }
      return null; // Unknown unop
    }
  }
  return null; // Unknown expr type
}

/**
 * Check if an expression is dimensionally valid given variable dimensions
 * and an expected output dimension.
 */
export function checkDimensionalValidity(
  expr: SymExpr,
  varDims: Record<string, DimVector>,
  expectedDim: DimVector,
): { valid: boolean; inferredDim: DimVector | null; violations: string[] } {
  const violations: string[] = [];
  const inferred = inferDimension(expr, varDims);

  if (inferred === null) {
    violations.push('Expression has dimensionally inhomogeneous terms');
    return { valid: false, inferredDim: null, violations };
  }

  if (!dimEqual(inferred, expectedDim)) {
    violations.push(
      `Dimension mismatch: got ${dimToString(inferred)}, expected ${dimToString(expectedDim)}`,
    );
    return { valid: false, inferredDim: inferred, violations };
  }

  return { valid: true, inferredDim: inferred, violations: [] };
}
