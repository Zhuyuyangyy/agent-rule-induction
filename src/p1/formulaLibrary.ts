// P1 Formula Library
// 200+ synthetic formulas + 20 classic formulas across 6 categories.

import {
  type SymExpr, C, V, Add, Sub, Mul, Div, Pow, Neg,
  Sin, Cos, Sqrt, Log, Abs, Exp,
  inputDimension, toString,
} from './symbolicExpr.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormulaCategory =
  | 'linear' | 'polynomial' | 'rational'
  | 'trigonometric' | 'sqrt_log_abs' | 'physics_style'
  | 'classic';

export interface FormulaEntry {
  id: string;
  expr: SymExpr;
  category: FormulaCategory;
  inputDimension: number;
  description?: string;
}

// ---------------------------------------------------------------------------
// Synthetic formula generation
// ---------------------------------------------------------------------------

function makeLinear(): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let n = 0;

  // 1-variable: a*x1 + b
  for (const a of [1, 2, 3, -1, -2]) {
    for (const b of [0, 1, -1, 2, -2]) {
      if (a === 1 && b === 0) continue; // skip trivial x1
      n++;
      formulas.push({
        id: `syn_linear_${n}`,
        expr: b === 0 ? Mul(C(a), V('x1')) : Add(Mul(C(a), V('x1')), C(b)),
        category: 'linear',
        inputDimension: 1,
      });
    }
  }

  // 2-variable: a*x1 + b*x2 + c
  for (const a of [1, -1, 2]) {
    for (const b of [1, -1, 2]) {
      for (const c of [0, 1]) {
        n++;
        let expr: SymExpr = Add(Mul(C(a), V('x1')), Mul(C(b), V('x2')));
        if (c !== 0) expr = Add(expr, C(c));
        formulas.push({ id: `syn_linear_${n}`, expr, category: 'linear', inputDimension: 2 });
      }
    }
  }

  // 3-variable: a*x1 + b*x2 + c*x3
  for (const [a, b, c] of [[1, 1, 1], [1, 1, -1], [1, -1, 1], [-1, 1, 1], [1, -1, -1], [2, 1, 1], [1, 2, -1]] as [number, number, number][]) {
    n++;
    formulas.push({
      id: `syn_linear_${n}`,
      expr: Add(Add(Mul(C(a), V('x1')), Mul(C(b), V('x2'))), Mul(C(c), V('x3'))),
      category: 'linear',
      inputDimension: 3,
    });
  }

  return formulas;
}

function makePolynomial(): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let n = 0;

  const x1 = V('x1'), x2 = V('x2'), x3 = V('x3');

  // 1-var polynomials
  const p1: SymExpr[] = [
    Pow(x1, C(2)), Pow(x1, C(3)), Add(Pow(x1, C(2)), C(1)),
    Sub(Pow(x1, C(2)), Mul(C(3), x1)), Add(Pow(x1, C(3)), C(1)),
    Add(Mul(C(3), Pow(x1, C(2))), Mul(C(-2), x1)),
    Pow(x1, C(4)), Add(Pow(x1, C(2)), x1), Sub(Mul(C(2), Pow(x1, C(3))), x1),
    Mul(x1, Add(x1, C(1))), Mul(x1, Sub(x1, C(1))),
    Add(Pow(x1, C(4)), Pow(x1, C(2))), Pow(x1, C(5)),
    Sub(Pow(x1, C(4)), Pow(x1, C(2))),
  ];
  for (const expr of p1) {
    n++;
    formulas.push({ id: `syn_polynomial_${n}`, expr, category: 'polynomial', inputDimension: 1 });
  }

  // 2-var polynomials
  const p2: SymExpr[] = [
    Add(Pow(x1, C(2)), Pow(x2, C(2))),
    Sub(Pow(x1, C(2)), Pow(x2, C(2))),
    Mul(x1, x2),
    Add(Pow(x1, C(2)), x2),
    Add(x1, Pow(x2, C(2))),
    Mul(C(2), Mul(x1, x2)),
    Add(Add(Pow(x1, C(2)), Mul(C(2), Mul(x1, x2))), Pow(x2, C(2))),
    Sub(Sub(Pow(x1, C(2)), Mul(C(2), Mul(x1, x2))), Pow(x2, C(2))),
    Add(Pow(x1, C(3)), x2),
    Add(x1, Pow(x2, C(3))),
    Pow(Add(x1, C(1)), C(2)),
    Pow(Sub(x1, C(1)), C(2)),
    Pow(Add(x1, x2), C(2)),
    Pow(Sub(x1, x2), C(2)),
    Mul(Add(x1, C(1)), Add(x2, C(1))),
    Mul(Pow(x1, C(2)), x2),
    Mul(x1, Pow(x2, C(2))),
    Add(Mul(Pow(x1, C(2)), x2), Mul(x1, Pow(x2, C(2)))),
    Mul(C(3), Add(Pow(x1, C(2)), Pow(x2, C(2)))),
    Sub(Mul(C(2), Pow(x1, C(3))), Pow(x2, C(2))),
  ];
  for (const expr of p2) {
    n++;
    formulas.push({ id: `syn_polynomial_${n}`, expr, category: 'polynomial', inputDimension: 2 });
  }

  // 3-var polynomials
  const p3: SymExpr[] = [
    Add(Mul(x1, x2), x3),
    Add(Add(Pow(x1, C(2)), x2), x3),
    Mul(Mul(x1, x2), x3),
    Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), Pow(x3, C(2))),
    Add(Add(Mul(x1, x2), Mul(x2, x3)), Mul(x1, x3)),
    Add(Mul(Pow(x1, C(2)), x2), x3),
    Add(x1, Mul(Pow(x2, C(2)), x3)),
    Sub(Sub(Pow(x1, C(2)), Pow(x2, C(2))), Pow(x3, C(2))),
    Add(Add(x1, x2), Mul(x1, x3)),
    Mul(x1, Add(x2, x3)),
  ];
  for (const expr of p3) {
    n++;
    formulas.push({ id: `syn_polynomial_${n}`, expr, category: 'polynomial', inputDimension: 3 });
  }

  return formulas;
}

function makeRational(): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let n = 0;
  const x1 = V('x1'), x2 = V('x2'), x3 = V('x3');

  // 1-var rational
  const r1: SymExpr[] = [
    Div(C(1), x1),
    Div(C(1), Add(x1, C(1))),
    Div(x1, Add(x1, C(1))),
    Div(Add(x1, C(1)), Sub(x1, C(1))),
    Div(C(1), Pow(x1, C(2))),
    Div(C(1), Add(Pow(x1, C(2)), C(1))),
    Div(x1, Add(Pow(x1, C(2)), C(1))),
    Div(Add(Mul(C(2), x1), C(1)), Add(x1, C(2))),
    Div(Add(Pow(x1, C(2)), C(1)), Add(x1, C(1))),
    Div(Add(x1, C(1)), Add(Pow(x1, C(2)), C(1))),
  ];
  for (const expr of r1) {
    n++;
    formulas.push({ id: `syn_rational_${n}`, expr, category: 'rational', inputDimension: 1 });
  }

  // 2-var rational
  const r2: SymExpr[] = [
    Div(x1, x2),
    Div(Add(x1, x2), Sub(x1, x2)),
    Div(C(1), Mul(x1, x2)),
    Div(Mul(x1, x2), Add(x1, x2)),
    Div(Add(Pow(x1, C(2)), Pow(x2, C(2))), Add(x1, x2)),
    Div(Add(x1, x2), Add(Pow(x1, C(2)), Pow(x2, C(2)))),
    Div(x1, Add(x2, C(1))),
    Div(Add(x1, C(1)), x2),
    Div(Mul(C(2), x1), Add(Pow(x1, C(2)), C(1))),
    Div(Pow(x1, C(2)), Add(x1, C(1))),
    Div(Add(Pow(x1, C(2)), C(1)), Add(x2, C(1))),
    Div(Add(x1, C(1)), Add(x2, C(1))),
    Div(Mul(x1, x2), Add(Pow(x1, C(2)), Pow(x2, C(2)))),
    Div(Add(x1, x2), Add(Mul(x1, x2), C(1))),
    Div(Sub(x1, x2), Add(x1, x2)),
    Div(Mul(C(2), Mul(x1, x2)), Add(Pow(x1, C(2)), Pow(x2, C(2)))),
    Div(Pow(x1, C(3)), Add(Pow(x2, C(2)), C(1))),
    Div(Add(Pow(x1, C(2)), x2), Add(x1, C(1))),
    Div(Add(x1, Pow(x2, C(2))), Add(x2, C(1))),
    Div(Sub(Pow(x1, C(2)), x2), Add(x1, C(1))),
  ];
  for (const expr of r2) {
    n++;
    formulas.push({ id: `syn_rational_${n}`, expr, category: 'rational', inputDimension: 2 });
  }

  // 3-var rational
  const r3: SymExpr[] = [
    Div(C(1), Add(Add(x1, x2), x3)),
    Div(x1, Add(x2, x3)),
    Div(Add(x1, x2), Add(x3, C(1))),
    Div(Mul(x1, x2), Add(Add(x1, x2), C(1))),
    Div(C(1), Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), C(1))),
    Div(x1, Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), C(1))),
    Div(Add(x1, Add(x2, C(1))), Add(Sub(x1, x2), C(1))),
    Div(Mul(x1, x3), Add(x2, C(1))),
    Div(Add(Mul(x1, x2), x3), Add(x1, C(1))),
    Div(Add(x1, x2), Add(x3, Mul(x1, x2))),
  ];
  for (const expr of r3) {
    n++;
    formulas.push({ id: `syn_rational_${n}`, expr, category: 'rational', inputDimension: 3 });
  }

  return formulas;
}

function makeTrigonometric(): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let n = 0;
  const x1 = V('x1'), x2 = V('x2'), x3 = V('x3');

  // 1-var trig
  const t1: SymExpr[] = [
    Sin(x1), Cos(x1), Sin(Mul(C(2), x1)), Cos(Mul(C(2), x1)),
    Mul(Sin(x1), Cos(x1)), Pow(Sin(x1), C(2)), Pow(Cos(x1), C(2)),
    Add(Sin(x1), Cos(x1)), Sub(Sin(x1), Cos(x1)),
    Mul(C(2), Mul(Sin(x1), Cos(x1))),
    Add(Pow(Sin(x1), C(2)), Pow(Cos(x1), C(2))),
    Sin(Pow(x1, C(2))), Cos(Pow(x1, C(2))),
    Mul(C(3), Sin(x1)), Add(Sin(x1), C(1)),
  ];
  for (const expr of t1) {
    n++;
    formulas.push({ id: `syn_trigonometric_${n}`, expr, category: 'trigonometric', inputDimension: 1 });
  }

  // 2-var trig
  const t2: SymExpr[] = [
    Sin(Add(x1, x2)), Cos(Add(x1, x2)),
    Mul(Sin(x1), Cos(x2)), Mul(Sin(x1), Sin(x2)),
    Mul(Cos(x1), Cos(x2)), Add(Sin(x1), Sin(x2)),
    Sub(Sin(x1), Sin(x2)), Add(Cos(x1), Cos(x2)),
    Mul(Sin(x1), x2), Mul(Cos(x1), x2),
    Mul(x1, Sin(x2)), Mul(x1, Cos(x2)),
    Add(Sin(x1), x2), Add(Cos(x1), x2),
    Sin(Sqrt(Add(Pow(x1, C(2)), Pow(x2, C(2))))),
    Add(Mul(Sin(x1), Cos(x1)), Cos(x2)),
    Mul(Sin(Add(x1, x2)), Cos(Sub(x1, x2))),
  ];
  for (const expr of t2) {
    n++;
    formulas.push({ id: `syn_trigonometric_${n}`, expr, category: 'trigonometric', inputDimension: 2 });
  }

  // 3-var trig
  const t3: SymExpr[] = [
    Sin(Add(Add(x1, x2), x3)),
    Mul(Mul(Sin(x1), Cos(x2)), Sin(x3)),
    Add(Add(Sin(x1), Sin(x2)), Sin(x3)),
    Add(Mul(Sin(x1), x2), x3),
    Add(Sin(x1), Mul(Cos(x2), x3)),
    Mul(Sin(x1), Add(x2, x3)),
    Add(Mul(Sin(x1), Cos(x2)), Sin(x3)),
    Cos(Add(Add(x1, x2), x3)),
    Mul(Cos(x1), Add(Sin(x2), x3)),
    Add(Mul(x1, Sin(x2)), Cos(x3)),
  ];
  for (const expr of t3) {
    n++;
    formulas.push({ id: `syn_trigonometric_${n}`, expr, category: 'trigonometric', inputDimension: 3 });
  }

  return formulas;
}

function makeSqrtLogAbs(): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let n = 0;
  const x1 = V('x1'), x2 = V('x2'), x3 = V('x3');

  // 1-var
  const s1: SymExpr[] = [
    Sqrt(Abs(x1)), Sqrt(Add(Pow(x1, C(2)), C(1))),
    Log(Add(Abs(x1), C(1))), Log(Add(Pow(x1, C(2)), C(1))),
    Abs(x1), Abs(Sub(x1, C(1))),
    Sqrt(Add(x1, C(1))), Log(Add(x1, C(2))),
    Add(Sqrt(Abs(x1)), C(1)), Mul(C(2), Sqrt(Add(Pow(x1, C(2)), C(1)))),
  ];
  for (const expr of s1) {
    n++;
    formulas.push({ id: `syn_sqrt_log_abs_${n}`, expr, category: 'sqrt_log_abs', inputDimension: 1 });
  }

  // 2-var
  const s2: SymExpr[] = [
    Sqrt(Add(Pow(x1, C(2)), Pow(x2, C(2)))),
    Log(Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), C(1))),
    Sqrt(Mul(Abs(x1), Abs(x2))),
    Abs(Sub(x1, x2)),
    Add(Abs(x1), Abs(x2)),
    Add(Sqrt(Abs(x1)), Sqrt(Abs(x2))),
    Log(Add(Add(Abs(x1), Abs(x2)), C(1))),
    Sqrt(Add(Mul(x1, x2), C(1))),
    Log(Add(Mul(x1, x2), C(1))),
    Mul(Abs(x1), x2),
    Mul(x1, Abs(x2)),
    Mul(Sqrt(Add(Pow(x1, C(2)), C(1))), x2),
    Mul(Log(Add(Pow(x1, C(2)), C(1))), x2),
    Abs(Add(x1, x2)),
    Add(Sqrt(Add(Pow(x1, C(2)), C(1))), Sqrt(Add(Pow(x2, C(2)), C(1)))),
    Mul(Log(Add(x1, C(1))), Log(Add(x2, C(1)))),
    Mul(Abs(x1), Abs(x2)),
    Sqrt(Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), C(1))),
    Log(Add(Abs(Mul(x1, x2)), C(1))),
    Add(Sqrt(Abs(x1)), Log(Add(Abs(x2), C(1)))),
  ];
  for (const expr of s2) {
    n++;
    formulas.push({ id: `syn_sqrt_log_abs_${n}`, expr, category: 'sqrt_log_abs', inputDimension: 2 });
  }

  // 3-var
  const s3: SymExpr[] = [
    Sqrt(Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), Pow(x3, C(2)))),
    Log(Add(Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), Pow(x3, C(2))), C(1))),
    Add(Add(Abs(x1), Abs(x2)), Abs(x3)),
    Add(Add(Sqrt(Abs(x1)), Sqrt(Abs(x2))), Sqrt(Abs(x3))),
    Mul(Sqrt(Add(Pow(x1, C(2)), Pow(x2, C(2)))), x3),
    Log(Add(Add(Mul(x1, x2), x3), C(1))),
    Add(Abs(Mul(x1, x2)), Abs(x3)),
    Sqrt(Add(Add(Pow(x1, C(2)), Pow(x2, C(2))), C(1))),
    Mul(Abs(x1), Add(Abs(x2), Abs(x3))),
    Add(Sqrt(Add(Pow(x1, C(2)), C(1))), Mul(x2, x3)),
  ];
  for (const expr of s3) {
    n++;
    formulas.push({ id: `syn_sqrt_log_abs_${n}`, expr, category: 'sqrt_log_abs', inputDimension: 3 });
  }

  return formulas;
}

function makePhysicsStyle(): FormulaEntry[] {
  const formulas: FormulaEntry[] = [];
  let n = 0;
  const m = V('x1'), v = V('x2'), r = V('x3');

  // Using x1=m, x2=v, x3=r as physics variables
  const phys: [SymExpr, number, string][] = [
    // momentum, KE, centripetal
    [Mul(m, v), 2, 'm*v'],
    [Mul(C(0.5), Mul(m, Pow(v, C(2)))), 2, '0.5*m*v^2'],
    [Div(Mul(m, Pow(v, C(2))), r), 3, 'm*v^2/r'],
    // gravity, PE, work
    [Div(Mul(m, Mul(m, v)), Pow(r, C(2))), 3, 'G*m1*m2/r^2'],
    [Mul(m, Mul(C(9.8), r)), 2, 'm*g*h'],
    [Mul(m, v), 2, 'F*d'],
    // density, pressure
    [Div(m, r), 2, 'm/V'],
    [Div(Pow(v, C(2)), r), 2, 'v^2/r'],
    [Mul(m, v), 2, 'a*t'],
    // spring, force
    [Mul(C(0.5), Mul(m, Pow(v, C(2)))), 2, '0.5*k*x^2'],
    [Mul(m, v), 2, 'm*a'],
    [Add(Mul(m, Pow(v, C(2))), Mul(C(0.5), Mul(m, Pow(r, C(2))))), 3, 'v0*t+0.5*a*t^2'],
    [Add(m, Mul(v, r)), 3, 'v0+a*t'],
    [Div(m, Mul(v, r)), 3, 'E/h'],
    [Div(m, v), 2, 'F/A'],
    [Mul(m, Pow(v, C(2))), 2, 'm*v^2'],
    [Mul(m, v), 2, 'q*V'],
    [Mul(m, v), 2, 'I*V'],
    [Div(Mul(m, r), v), 3, 'R*A/L'],
    // trig-based physics
    [Mul(m, Sin(v)), 2, 'm*g*sin(theta)'],
    [Mul(v, Cos(r)), 3, 'v*cos(theta)'],
    [Mul(v, Sin(r)), 3, 'v*sin(theta)'],
    [Mul(m, Cos(r)), 3, 'F*cos(theta)'],
    [Add(Mul(C(0.5), Mul(m, Pow(v, C(2)))), Mul(m, Mul(C(9.8), r))), 3, '0.5*m*v^2+m*g*h'],
    [Sub(Mul(m, v), Mul(C(9.8), r)), 3, 'k*x-m*g'],
    [Div(Mul(m, v), Mul(r, m)), 3, 'p*V/(n*T)'],
    [Div(m, v), 2, 'E/m'],
    [Div(Mul(m, r), v), 3, 'F*L/(A*Y)'],
    [Div(v, Sqrt(Mul(C(9.8), r))), 2, 'v/sqrt(g*L)'],
    [Mul(C(2), Mul(C(3.14159), Sqrt(Div(r, C(9.8))))), 2, '2*pi*sqrt(L/g)'],
  ];

  for (const [expr, dim, desc] of phys) {
    n++;
    formulas.push({
      id: `syn_physics_${n}`,
      expr,
      category: 'physics_style',
      inputDimension: dim,
      description: desc,
    });
  }

  return formulas;
}

// ---------------------------------------------------------------------------
// Classic formulas (20)
// ---------------------------------------------------------------------------

function makeClassic(): FormulaEntry[] {
  const m = V('x1'), v = V('x2'), r = V('x3');
  const classic: [string, SymExpr, number, string][] = [
    ['classic_e_mc2', Mul(m, Pow(v, C(2))), 2, 'E = m*c^2'],
    ['classic_f_ma', Mul(m, v), 2, 'F = m*a'],
    ['classic_ke', Mul(C(0.5), Mul(m, Pow(v, C(2)))), 2, 'KE = 0.5*m*v^2'],
    ['classic_pe', Mul(m, Mul(C(9.8), r)), 2, 'PE = m*g*h'],
    ['classic_w_fd', Mul(m, v), 2, 'W = F*d'],
    ['classic_p_fv', Mul(m, v), 2, 'P = F*v'],
    ['classic_momentum', Mul(m, v), 2, 'p = m*v'],
    ['classic_density', Div(m, v), 2, 'rho = m/V'],
    ['classic_vel', Add(m, Mul(v, r)), 3, 'v = v0 + a*t'],
    ['classic_disp', Add(Mul(m, v), Mul(C(0.5), Mul(m, Pow(r, C(2))))), 3, 's = v0*t + 0.5*a*t^2'],
    ['classic_gravity', Div(Mul(m, Mul(v, v)), Pow(r, C(2))), 3, 'F = G*m1*m2/r^2'],
    ['classic_coulomb', Div(Mul(m, v), Pow(r, C(2))), 3, 'F = k*q1*q2/r^2'],
    ['classic_photon', Mul(m, v), 2, 'E = h*f'],
    ['classic_wavelength', Div(m, v), 2, 'lambda = v/f'],
    ['classic_elec_power', Mul(m, v), 2, 'P = I*V'],
    ['classic_ohm', Mul(m, v), 2, 'V = I*R'],
    ['classic_thermal', Mul(C(1.5), Mul(m, v)), 2, 'KE = 3/2*k*T'],
    ['classic_pendulum', Mul(C(6.28318), Sqrt(Div(r, C(9.8)))), 2, 'T = 2*pi*sqrt(L/g)'],
    ['classic_hooke', Mul(C(-1), m), 1, 'F = -k*x'],
    ['classic_centripetal', Div(Pow(v, C(2)), r), 2, 'a = v^2/r'],
  ];

  return classic.map(([id, expr, dim, desc]) => ({
    id, expr, category: 'classic' as FormulaCategory, inputDimension: dim, description: desc,
  }));
}

// ---------------------------------------------------------------------------
// Assemble library
// ---------------------------------------------------------------------------

export const SYNTHETIC_FORMULAS: FormulaEntry[] = [
  ...makeLinear(),
  ...makePolynomial(),
  ...makeRational(),
  ...makeTrigonometric(),
  ...makeSqrtLogAbs(),
  ...makePhysicsStyle(),
];

export const CLASSIC_FORMULAS: FormulaEntry[] = makeClassic();

export const ALL_FORMULAS: FormulaEntry[] = [...SYNTHETIC_FORMULAS, ...CLASSIC_FORMULAS];

export const FORMULA_BY_ID: Map<string, FormulaEntry> = new Map(ALL_FORMULAS.map(f => [f.id, f]));

export const FORMULA_CATEGORIES: FormulaCategory[] = [
  'linear', 'polynomial', 'rational', 'trigonometric', 'sqrt_log_abs', 'physics_style', 'classic',
];
