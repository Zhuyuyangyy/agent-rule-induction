/** @deprecated Use p1Benchmark.ts instead. Kept temporarily for backward compatibility. */
// P1 formula library.
//
// SYNTHETIC_FORMULAS: >= 50 randomly-generated expression trees (depth 2-4,
//   integer coefficients 1-9) that an LLM cannot have memorized. Generated
//   with a deterministic mulberry32 seed so the library is reproducible.
//
// CLASSIC_FORMULAS: >= 10 named scientific formulas (linear, quadratic,
//   E=m*c^2, F=m*a, Kepler T~r^1.5, kinetic/potential energy, P=I*V, f=1/T).
//
// Each entry exposes the parsed ExprNode plus variable list, per-variable
// domain, noise level (0 or 0.05), and category.

import {
  type ExprNode,
  type FuncName,
  parseExpr,
  evaluate,
  complexity,
} from './expr.js';

export type FormulaCategory = 'synthetic' | 'classic';

export interface Formula {
  id: string;
  /** Parsed expression for the right-hand side (LHS is the dependent variable). */
  expr: ExprNode;
  /** Variable names (excluding the implicit output variable). */
  variables: string[];
  /** Per-variable domain [low, high] (inclusive), aligned with `variables`. */
  domain: [number, number][];
  /** Noise standard deviation. 0 = clean, 0.05 = small Gaussian-ish jitter. */
  noise: 0 | 0.05;
  category: FormulaCategory;
  /** Optional human-readable name (mostly for classic formulas). */
  name?: string;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — same as P0 src/taskGenerator.ts
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Synthetic formula generator
// ---------------------------------------------------------------------------

const SYNTH_VARS = ['x', 'y', 'z'];
const SYNTH_FUNCS: FuncName[] = ['sin', 'cos', 'log', 'exp', 'sqrt'];
const SYNTH_DOMAIN: [number, number][] = [[1, 5], [1, 5], [1, 5]]; // keep positive for log/sqrt

function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a random expression tree of the requested depth using the given
 * variable pool. Depth >= 1 always produces a non-trivial tree (no leaves at
 * the root). Coefficients are integers in [1,9].
 *
 * To keep all sub-expressions real-valued on the positive domain we avoid
 * generating `log(<non-positive>)` and `sqrt(<non-positive>)` by always
 * wrapping their arguments in `abs(...)` — implemented here as
 * `sqrt(x*x)` / `log(exp(x))` patterns. For simplicity we just avoid log/sqrt
 * in synthetic generation and only use sin/cos/exp which are defined everywhere.
 */
function genExpr(rng: () => number, depth: number, vars: string[]): ExprNode {
  if (depth <= 0) {
    // Leaf: variable or constant
    if (rng() < 0.5) {
      return { type: 'var', name: pick(rng, vars) };
    }
    return { type: 'num', value: randInt(rng, 1, 9) };
  }
  const branch = Math.floor(rng() * 3);
  if (branch === 0) {
    // Function node (sin/cos/exp only — safe everywhere)
    const name = pick(rng, ['sin', 'cos', 'exp'] as FuncName[]);
    return { type: 'func', name, arg: genExpr(rng, depth - 1, vars) };
  }
  // Binary op
  const op = pick(rng, ['+', '-', '*', '^'] as const);
  // For ^, force exponent to a small integer constant to avoid huge values
  if (op === '^') {
    const base = genExpr(rng, depth - 1, vars);
    const exponent = randInt(rng, 2, 3);
    return { type: 'binop', op: '^', left: base, right: { type: 'num', value: exponent } };
  }
  return {
    type: 'binop',
    op,
    left: genExpr(rng, depth - 1, vars),
    right: genExpr(rng, depth - 1, vars),
  };
}

/**
 * Generate `count` synthetic formulas. Deterministic for a given seed.
 * Each formula uses 1-3 variables from SYNTH_VARS, depth in [2,4], and a
 * random noise level (0 or 0.05). We cap the depth and exponent range to keep
 * values numerically stable on the domain [1,5].
 */
export function generateSyntheticFormulas(count: number, seed: number = 42): Formula[] {
  const rng = mulberry32(seed);
  const out: Formula[] = [];
  for (let i = 0; i < count; i++) {
    const numVars = 1 + Math.floor(rng() * 3); // 1..3
    const vars: string[] = [];
    for (let v = 0; v < numVars; v++) vars.push(SYNTH_VARS[v]);
    const depth = 2 + Math.floor(rng() * 3); // 2..4
    let expr = genExpr(rng, depth, vars);
    // Sanity: if expression explodes (NaN / Infinity) on a sample point,
    // regenerate with smaller depth.
    let tries = 0;
    while (tries < 5 && !isFiniteOnSample(expr, vars)) {
      expr = genExpr(rng, Math.max(2, depth - 1), vars);
      tries++;
    }
    const noise: 0 | 0.05 = rng() < 0.5 ? 0 : 0.05;
    out.push({
      id: `syn_${i.toString().padStart(3, '0')}`,
      expr,
      variables: vars,
      domain: vars.map(() => [SYNTH_DOMAIN[0][0], SYNTH_DOMAIN[0][1]] as [number, number]),
      noise,
      category: 'synthetic',
    });
  }
  return out;
}

function isFiniteOnSample(expr: ExprNode, vars: string[]): boolean {
  // Test a small grid of points
  const points: number[] = [1, 2, 3, 5];
  try {
    for (const combo of cartesian(vars.length, points)) {
      const env: Record<string, number> = {};
      vars.forEach((v, i) => { env[v] = combo[i]; });
      const v = evaluate(expr, env);
      if (!Number.isFinite(v) || Math.abs(v) > 1e6) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function cartesian(n: number, vals: number[]): number[][] {
  if (n === 0) return [[]];
  const sub = cartesian(n - 1, vals);
  const out: number[][] = [];
  for (const v of vals) for (const s of sub) out.push([v, ...s]);
  return out;
}

// ---------------------------------------------------------------------------
// Classic formulas
// ---------------------------------------------------------------------------

function classic(
  id: string,
  name: string,
  exprStr: string,
  variables: string[],
  domain: [number, number][],
  noise: 0 | 0.05 = 0,
): Formula {
  const expr = parseExpr(exprStr);
  return { id, name, expr, variables, domain, noise, category: 'classic' };
}

export const CLASSIC_FORMULAS: Formula[] = [
  classic('cls_linear', 'Linear: y=2x+1', '2*x+1', ['x'], [[0, 10]]),
  classic('cls_quadratic', 'Quadratic: y=x^2', 'x^2', ['x'], [[0, 10]]),
  classic('cls_mass_energy', 'Mass-energy: E=m*c^2', 'm*c^2', ['m', 'c'], [[1, 5], [1, 5]]),
  classic('cls_newton2', "Newton's 2nd: F=m*a", 'm*a', ['m', 'a'], [[1, 5], [1, 5]]),
  classic('cls_kepler3', "Kepler's 3rd: T=r^1.5", 'r^1.5', ['r'], [[1, 5]]),
  classic('cls_uniform_accel', 'Uniform accel: v=v0+a*t', 'v0+a*t', ['v0', 'a', 't'], [[1, 5], [1, 5], [1, 5]]),
  classic('cls_kinetic', 'Kinetic energy: KE=0.5*m*v^2', '0.5*m*v^2', ['m', 'v'], [[1, 5], [1, 5]]),
  classic('cls_potential', 'Potential energy: PE=m*g*h', 'm*g*h', ['m', 'g', 'h'], [[1, 5], [1, 5], [1, 5]]),
  classic('cls_power', 'Electric power: P=I*V', 'I*V', ['I', 'V'], [[1, 5], [1, 5]]),
  classic('cls_frequency', 'Frequency: f=1/T', '1/T', ['T'], [[1, 5]]),
];

// ---------------------------------------------------------------------------
// Library (lazily computed so import-time cost is bounded)
// ---------------------------------------------------------------------------

export const SYNTHETIC_FORMULAS: Formula[] = generateSyntheticFormulas(60, 42);

export const ALL_FORMULAS: Formula[] = [...SYNTHETIC_FORMULAS, ...CLASSIC_FORMULAS];

// Convenience: complexity stats for the library (used by tests / reports).
export function libraryStats(): {
  syntheticCount: number;
  classicCount: number;
  avgSyntheticComplexity: { nodes: number; depth: number };
} {
  const synComp = SYNTHETIC_FORMULAS.map(f => complexity(f.expr));
  const avgNodes = synComp.reduce((s, c) => s + c.nodes, 0) / (synComp.length || 1);
  const avgDepth = synComp.reduce((s, c) => s + c.depth, 0) / (synComp.length || 1);
  return {
    syntheticCount: SYNTHETIC_FORMULAS.length,
    classicCount: CLASSIC_FORMULAS.length,
    avgSyntheticComplexity: { nodes: avgNodes, depth: avgDepth },
  };
}
