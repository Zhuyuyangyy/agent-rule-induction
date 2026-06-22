// P2 Physics Formula Library
// Controlled physics-style formulas with dimensional annotations.
// These are KNOWN formulas used for rediscovery benchmarks, not new discoveries.

import {
  C, V, Add, Sub, Mul, Div, Pow, Sin, Cos, Sqrt, Neg,
} from '../p1/symbolicExpr.js';
import { type DimVector, DIM } from './dimensionalConstraints.js';
import type { PhysicsFormulaEntry } from './physicsExpr.js';

// ---------------------------------------------------------------------------
// Newtonian Mechanics
// ---------------------------------------------------------------------------

const newtonian: PhysicsFormulaEntry[] = [
  {
    id: 'newton_F_ma',
    expr: Mul(V('m'), V('a')),
    category: 'newtonian',
    description: 'F = m*a (Newton second law)',
    inputDimension: 2,
    variableDimensions: { m: DIM.mass, a: DIM.acceleration },
    outputDimension: DIM.force,
  },
  {
    id: 'newton_p_mv',
    expr: Mul(V('m'), V('v')),
    category: 'newtonian',
    description: 'p = m*v (momentum)',
    inputDimension: 2,
    variableDimensions: { m: DIM.mass, v: DIM.velocity },
    outputDimension: [1, 1, -1], // L M T^-1
  },
  {
    id: 'newton_F_mg',
    expr: Mul(V('m'), V('g')),
    category: 'newtonian',
    description: 'F = m*g (weight)',
    inputDimension: 2,
    variableDimensions: { m: DIM.mass, g: DIM.acceleration },
    outputDimension: DIM.force,
  },
  {
    id: 'newton_a_F_m',
    expr: Div(V('F'), V('m')),
    category: 'newtonian',
    description: 'a = F/m (acceleration from force)',
    inputDimension: 2,
    variableDimensions: { F: DIM.force, m: DIM.mass },
    outputDimension: DIM.acceleration,
  },
  {
    id: 'newton_v_at',
    expr: Add(V('v0'), Mul(V('a'), V('t'))),
    category: 'newtonian',
    description: 'v = v0 + a*t (velocity under constant acceleration)',
    inputDimension: 3,
    variableDimensions: { v0: DIM.velocity, a: DIM.acceleration, t: DIM.time },
    outputDimension: DIM.velocity,
  },
  {
    id: 'newton_x_v0t_half_at2',
    expr: Add(Mul(V('v0'), V('t')), Mul(C(0.5), Mul(V('a'), Pow(V('t'), C(2))))),
    category: 'newtonian',
    description: 'x = v0*t + 0.5*a*t^2 (displacement)',
    inputDimension: 3,
    variableDimensions: { v0: DIM.velocity, a: DIM.acceleration, t: DIM.time },
    outputDimension: DIM.length,
  },
];

// ---------------------------------------------------------------------------
// Energy Formulas
// ---------------------------------------------------------------------------

const energy: PhysicsFormulaEntry[] = [
  {
    id: 'energy_KE_half_mv2',
    expr: Mul(C(0.5), Mul(V('m'), Pow(V('v'), C(2)))),
    category: 'energy',
    description: 'KE = 0.5*m*v^2 (kinetic energy)',
    inputDimension: 2,
    variableDimensions: { m: DIM.mass, v: DIM.velocity },
    outputDimension: DIM.energy,
  },
  {
    id: 'energy_PE_mgh',
    expr: Mul(Mul(V('m'), V('g')), V('h')),
    category: 'energy',
    description: 'PE = m*g*h (gravitational potential energy)',
    inputDimension: 3,
    variableDimensions: { m: DIM.mass, g: DIM.acceleration, h: DIM.length },
    outputDimension: DIM.energy,
  },
  {
    id: 'energy_E_mc2',
    expr: Mul(V('m'), Pow(V('c'), C(2))),
    category: 'energy',
    description: 'E = m*c^2 (mass-energy equivalence)',
    inputDimension: 2,
    variableDimensions: { m: DIM.mass, c: DIM.velocity },
    outputDimension: DIM.energy,
  },
  {
    id: 'energy_work_Fd',
    expr: Mul(V('F'), V('d')),
    category: 'energy',
    description: 'W = F*d (work)',
    inputDimension: 2,
    variableDimensions: { F: DIM.force, d: DIM.length },
    outputDimension: DIM.energy,
  },
  {
    id: 'energy_P_Fv',
    expr: Mul(V('F'), V('v')),
    category: 'energy',
    description: 'P = F*v (power)',
    inputDimension: 2,
    variableDimensions: { F: DIM.force, v: DIM.velocity },
    outputDimension: DIM.power,
  },
];

// ---------------------------------------------------------------------------
// Harmonic Oscillator
// ---------------------------------------------------------------------------

const harmonic: PhysicsFormulaEntry[] = [
  {
    id: 'harmonic_T_2pi_sqrt_m_k',
    expr: Mul(C(6.2832), Sqrt(Div(V('m'), V('k')))),
    category: 'harmonic',
    description: 'T = 2*pi*sqrt(m/k) (period of spring-mass)',
    inputDimension: 2,
    variableDimensions: { m: DIM.mass, k: [0, 1, -2] }, // k = M T^-2
    outputDimension: DIM.time,
  },
  {
    id: 'harmonic_f_1_T',
    expr: Div(C(1), V('T')),
    category: 'harmonic',
    description: 'f = 1/T (frequency from period)',
    inputDimension: 1,
    variableDimensions: { T: DIM.time },
    outputDimension: DIM.frequency,
  },
  {
    id: 'harmonic_omega_sqrt_k_m',
    expr: Sqrt(Div(V('k'), V('m'))),
    category: 'harmonic',
    description: 'omega = sqrt(k/m) (angular frequency)',
    inputDimension: 2,
    variableDimensions: { k: [0, 1, -2], m: DIM.mass },
    outputDimension: DIM.frequency,
  },
  {
    id: 'harmonic_x_A_sin_omega_t',
    expr: Mul(V('A'), Sin(Mul(V('omega'), V('t')))),
    category: 'harmonic',
    description: 'x = A*sin(omega*t) (simple harmonic motion)',
    inputDimension: 3,
    variableDimensions: { A: DIM.length, omega: DIM.frequency, t: DIM.time },
    outputDimension: DIM.length,
  },
];

// ---------------------------------------------------------------------------
// Inverse-Square Law
// ---------------------------------------------------------------------------

const inverseSquare: PhysicsFormulaEntry[] = [
  {
    id: 'inv_sq_F_Gm1m2_r2',
    expr: Div(Mul(Mul(V('G'), V('m1')), V('m2')), Pow(V('r'), C(2))),
    category: 'inverse_square',
    description: 'F = G*m1*m2/r^2 (gravitational force)',
    inputDimension: 4,
    variableDimensions: { G: [3, -1, -2], m1: DIM.mass, m2: DIM.mass, r: DIM.length },
    outputDimension: DIM.force,
  },
  {
    id: 'inv_sq_F_kq1q2_r2',
    expr: Div(Mul(Mul(V('k'), V('q1')), V('q2')), Pow(V('r'), C(2))),
    category: 'inverse_square',
    description: 'F = k*q1*q2/r^2 (Coulomb force)',
    inputDimension: 4,
    variableDimensions: { k: [3, 1, -2], q1: DIM.dimensionless, q2: DIM.dimensionless, r: DIM.length },
    outputDimension: DIM.force,
  },
  {
    id: 'inv_sq_I_P_4pi_r2',
    expr: Div(V('P'), Mul(C(12.566), Pow(V('r'), C(2)))),
    category: 'inverse_square',
    description: 'I = P/(4*pi*r^2) (intensity at distance r)',
    inputDimension: 2,
    variableDimensions: { P: DIM.power, r: DIM.length },
    outputDimension: [0, 1, -3], // M T^-3
  },
  {
    id: 'inv_sq_g_GM_r2',
    expr: Div(Mul(V('G'), V('M')), Pow(V('r'), C(2))),
    category: 'inverse_square',
    description: 'g = G*M/r^2 (gravitational acceleration)',
    inputDimension: 3,
    variableDimensions: { G: [3, -1, -2], M: DIM.mass, r: DIM.length },
    outputDimension: DIM.acceleration,
  },
];

// ---------------------------------------------------------------------------
// Pendulum Approximation
// ---------------------------------------------------------------------------

const pendulum: PhysicsFormulaEntry[] = [
  {
    id: 'pendulum_T_2pi_sqrt_L_g',
    expr: Mul(C(6.2832), Sqrt(Div(V('L'), V('g')))),
    category: 'pendulum',
    description: 'T = 2*pi*sqrt(L/g) (pendulum period)',
    inputDimension: 2,
    variableDimensions: { L: DIM.length, g: DIM.acceleration },
    outputDimension: DIM.time,
  },
  {
    id: 'pendulum_v_sqrt_2gh',
    expr: Sqrt(Mul(C(2), Mul(V('g'), V('h')))),
    category: 'pendulum',
    description: 'v = sqrt(2*g*h) (speed from height)',
    inputDimension: 2,
    variableDimensions: { g: DIM.acceleration, h: DIM.length },
    outputDimension: DIM.velocity,
  },
  {
    id: 'pendulum_v_max_sqrt_2gL',
    expr: Sqrt(Mul(C(2), Mul(V('g'), V('L')))),
    category: 'pendulum',
    description: 'v_max = sqrt(2*g*L) (max pendulum speed)',
    inputDimension: 2,
    variableDimensions: { g: DIM.acceleration, L: DIM.length },
    outputDimension: DIM.velocity,
  },
];

// ---------------------------------------------------------------------------
// Simple Electromagnetism
// ---------------------------------------------------------------------------

const electromagnetism: PhysicsFormulaEntry[] = [
  {
    id: 'em_V_IR',
    expr: Mul(V('I'), V('R')),
    category: 'electromagnetism',
    description: 'V = I*R (Ohm law)',
    inputDimension: 2,
    variableDimensions: { I: DIM.current, R: DIM.resistance },
    outputDimension: DIM.voltage,
  },
  {
    id: 'em_P_IV',
    expr: Mul(V('I'), V('V')),
    category: 'electromagnetism',
    description: 'P = I*V (electrical power)',
    inputDimension: 2,
    variableDimensions: { I: DIM.current, V: DIM.voltage },
    outputDimension: DIM.power,
  },
  {
    id: 'em_P_I2R',
    expr: Mul(Pow(V('I'), C(2)), V('R')),
    category: 'electromagnetism',
    description: 'P = I^2*R (Joule heating)',
    inputDimension: 2,
    variableDimensions: { I: DIM.current, R: DIM.resistance },
    outputDimension: DIM.power,
  },
  {
    id: 'em_F_qvB',
    expr: Mul(Mul(V('q'), V('v')), V('B')),
    category: 'electromagnetism',
    description: 'F = q*v*B (Lorentz force)',
    inputDimension: 3,
    variableDimensions: { q: DIM.dimensionless, v: DIM.velocity, B: [0, 1, -2] },
    outputDimension: DIM.force,
  },
];

// ---------------------------------------------------------------------------
// Thermodynamic Toy Formulas
// ---------------------------------------------------------------------------

const thermodynamic: PhysicsFormulaEntry[] = [
  {
    id: 'thermo_PV_nRT',
    expr: Div(Mul(V('n'), Mul(V('R'), V('T'))), V('V')),
    category: 'thermodynamic',
    description: 'P = n*R*T/V (ideal gas law)',
    inputDimension: 4,
    variableDimensions: { n: DIM.dimensionless, R: [2, 1, -2], T: DIM.temperature, V: [3, 0, 0] },
    outputDimension: DIM.pressure,
  },
  {
    id: 'thermo_Q_mc_dT',
    expr: Mul(Mul(V('m'), V('c')), V('dT')),
    category: 'thermodynamic',
    description: 'Q = m*c*dT (heat transfer)',
    inputDimension: 3,
    variableDimensions: { m: DIM.mass, c: [2, 0, -2], dT: DIM.temperature },
    outputDimension: DIM.energy,
  },
  {
    id: 'thermo_W_PdV',
    expr: Mul(V('P'), V('dV')),
    category: 'thermodynamic',
    description: 'W = P*dV (pressure-volume work)',
    inputDimension: 2,
    variableDimensions: { P: DIM.pressure, dV: [3, 0, 0] },
    outputDimension: DIM.energy,
  },
];

// ---------------------------------------------------------------------------
// Full Library
// ---------------------------------------------------------------------------

export const PHYSICS_FORMULAS: PhysicsFormulaEntry[] = [
  ...newtonian,
  ...energy,
  ...harmonic,
  ...inverseSquare,
  ...pendulum,
  ...electromagnetism,
  ...thermodynamic,
];

export const PHYSICS_CATEGORIES = [
  'newtonian',
  'energy',
  'harmonic',
  'inverse_square',
  'pendulum',
  'electromagnetism',
  'thermodynamic',
] as const;

export type PhysicsCategory = typeof PHYSICS_CATEGORIES[number];

/** Get formulas by category */
export function getFormulasByCategory(category: string): PhysicsFormulaEntry[] {
  return PHYSICS_FORMULAS.filter(f => f.category === category);
}

/** Get formula by ID */
export function getFormulaById(id: string): PhysicsFormulaEntry | undefined {
  return PHYSICS_FORMULAS.find(f => f.id === id);
}
