// P1 符号规律发现 benchmark。
//
// 本文件实现 P1 阶段的符号规律发现 benchmark，包含：
//   1. 合成公式生成器（防记忆污染，主要证据）
//   2. 经典公式库（附加 demo）
//   3. 数据生成（训练 + heldout，可选高斯噪声）
//   4. P1 评分（heldout 准确率 + 符号等价性 - 复杂度 - 查询成本）
//   5. 三个算法 baseline（random / greedy / oracle，本地可跑，无需 API）
//   6. benchmark 编排（区分合成/经典，显著性检验，支持无噪声/有噪声）
//   7. CLI 入口
//
// 用法：
//   npx tsx src/p1/p1Benchmark.ts --n 60 --seed 42 --noise 0 --output results/p1_report.json

import fs from 'fs';
import path from 'path';
import {
  type Expr,
  type BinOpKind,
  type FuncName,
  type SymbolicTheory,
  Const,
  Var,
  BinOp,
  Func,
  evaluate,
  complexity as exprComplexity,
  isSymbolicallyEquivalent,
  exprToString,
  makeTheory,
} from './symbolicExpr.js';

// ===========================================================================
// PRNG（mulberry32，与 P0 一致，可复现）
// ===========================================================================

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Box-Muller 高斯噪声（确定性，由 rng 驱动）
function gaussian(rng: () => number, mean: number, std: number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ===========================================================================
// 随机表达式生成器（共享工具）
// ===========================================================================

const ALL_FUNCS: FuncName[] = ['sin', 'cos', 'sqrt', 'abs', 'log'];
const SAFE_FUNCS: FuncName[] = ['sin', 'cos', 'abs']; // 处处有定义的函数

/**
 * 生成随机表达式树。
 *
 * @param depth  当前剩余深度
 * @param vars   可用变量名
 * @param rng    随机数生成器
 * @param safeOnly  若 true，仅使用处处有定义的函数（sin/cos/abs），避免 sqrt/log
 *                  在负数域产生 NaN。合成公式生成时用 safeOnly=true 保证鲁棒性。
 */
function genRandomExpr(
  rng: () => number,
  depth: number,
  vars: string[],
  safeOnly: boolean = false,
): Expr {
  if (depth <= 0 || rng() < 0.35) {
    // 叶子：变量或常量
    if (rng() < 0.5 && vars.length > 0) {
      return Var(pick(rng, vars));
    }
    return Const(randInt(rng, 1, 9));
  }

  const branch = rng();
  if (branch < 0.25) {
    // 函数节点
    const funcPool = safeOnly ? SAFE_FUNCS : ALL_FUNCS;
    const name = pick(rng, funcPool);
    let arg = genRandomExpr(rng, depth - 1, vars, safeOnly);
    // 对 sqrt/log 包裹 abs 以避免负数/零参数产生 NaN
    if (name === 'sqrt' || name === 'log') {
      arg = Func('abs', arg);
    }
    return Func(name, arg);
  }

  // 二元运算
  const ops: BinOpKind[] = ['+', '-', '*', '^'];
  const op = pick(rng, ops);
  if (op === '^') {
    // 幂运算：指数用小整数常量，避免数值爆炸
    const base = genRandomExpr(rng, depth - 1, vars, safeOnly);
    const exponent = Const(randInt(rng, 2, 3));
    return BinOp('^', base, exponent);
  }
  return BinOp(
    op,
    genRandomExpr(rng, depth - 1, vars, safeOnly),
    genRandomExpr(rng, depth - 1, vars, safeOnly),
  );
}

/**
 * 在给定变量域上测试表达式是否产生有限值（非 NaN、非 Infinity、幅度合理）。
 */
function isFiniteOnSample(expr: Expr, vars: string[], lo: number, hi: number): boolean {
  const testPoints: number[] = [lo, (lo + hi) / 2, hi, 1, -1, 0.5];
  const points = testPoints.slice(0, Math.min(4, testPoints.length));
  try {
    for (let i = 0; i < points.length; i++) {
      const env: Record<string, number> = {};
      for (let j = 0; j < vars.length; j++) {
        env[vars[j]] = points[(i + j) % points.length];
      }
      const v = evaluate(expr, env);
      if (!Number.isFinite(v) || Math.abs(v) > 1e6) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ===========================================================================
// 1. 合成公式生成器（防记忆污染，主要证据）
// ===========================================================================

/**
 * 随机生成 n 条合成公式（SymbolicTheory）。
 *
 * 特点：
 *   - 1-2 个变量（x 或 x,z）
 *   - 深度 2-4
 *   - 整数系数 1-9
 *   - 不产生恒为 NaN 的表达式（在采样点上验证）
 *   - 复杂度有分布（深度随机 + 结构随机）
 *   - LLM 不可能记忆（随机生成，确定性种子可复现）
 *
 * 默认 n=60，留余量保证 >= 50。
 */
export function generateSyntheticFormulas(n: number = 60, seed: number = 42): SymbolicTheory[] {
  const rng = mulberry32(seed);
  const out: SymbolicTheory[] = [];

  for (let i = 0; i < n; i++) {
    const numVars = 1 + Math.floor(rng() * 2); // 1 或 2
    const inputVars = numVars === 1 ? ['x'] : ['x', 'z'];
    const depth = 2 + Math.floor(rng() * 3); // 2..4

    let expr: Expr;
    let tries = 0;
    // 在正数域 [1, 5] 上验证，避免 sqrt/log 的 NaN 问题
    do {
      expr = genRandomExpr(rng, depth, inputVars, true);
      tries++;
    } while (tries < 8 && !isFiniteOnSample(expr, inputVars, 1, 5));

    const theory = makeTheory(`syn_${String(i).padStart(3, '0')}`, expr, 'y', inputVars);
    out.push(theory);
  }

  return out;
}

// ===========================================================================
// 2. 经典公式库（附加 demo）
// ===========================================================================

function classic(
  id: string,
  outputVar: string,
  inputVars: string[],
  expr: Expr,
): SymbolicTheory {
  return makeTheory(id, expr, outputVar, inputVars);
}

export const CLASSIC_FORMULAS: SymbolicTheory[] = [
  // y = 2*x + 1（线性）
  classic('classic_linear_001', 'y', ['x'], BinOp('+', BinOp('*', Const(2), Var('x')), Const(1))),
  // y = x^2（幂）
  classic('classic_power_002', 'y', ['x'], BinOp('^', Var('x'), Const(2))),
  // y = x^2 + 3*x - 2（多项式）
  classic(
    'classic_poly_003', 'y', ['x'],
    BinOp('-', BinOp('+', BinOp('^', Var('x'), Const(2)), BinOp('*', Const(3), Var('x'))), Const(2)),
  ),
  // E = m*c^2（质能方程）
  classic('classic_mass_energy_004', 'E', ['m', 'c'], BinOp('*', Var('m'), BinOp('^', Var('c'), Const(2)))),
  // F = m*a（牛顿第二定律）
  classic('classic_newton2_005', 'F', ['m', 'a'], BinOp('*', Var('m'), Var('a'))),
  // T2 = r^3（开普勒第三定律简化）
  classic('classic_kepler3_006', 'T2', ['r'], BinOp('^', Var('r'), Const(3))),
  // v = a*t（匀加速）
  classic('classic_uniform_accel_007', 'v', ['a', 't'], BinOp('*', Var('a'), Var('t'))),
  // Ek = 0.5*m*v^2（动能）
  classic(
    'classic_kinetic_008', 'Ek', ['m', 'v'],
    BinOp('*', Const(0.5), BinOp('*', Var('m'), BinOp('^', Var('v'), Const(2)))),
  ),
  // g = G*M/r^2（引力）
  classic(
    'classic_gravity_009', 'g', ['G', 'M', 'r'],
    BinOp('/', BinOp('*', Var('G'), Var('M')), BinOp('^', Var('r'), Const(2))),
  ),
  // p = m*v（动量）
  classic('classic_momentum_010', 'p', ['m', 'v'], BinOp('*', Var('m'), Var('v'))),
];

// ===========================================================================
// 3. 数据生成
// ===========================================================================

export interface Dataset {
  /** 训练集输入（n 条） */
  inputs: Record<string, number>[];
  /** 训练集输出（n 条） */
  outputs: number[];
  /** heldout 输入（n 条，对 Proposer 严格不可见） */
  heldoutInputs: Record<string, number>[];
  /** heldout 输出（n 条） */
  heldoutOutputs: number[];
}

/**
 * 为给定理论生成数据集。
 *
 * @param theory  目标理论
 * @param n       训练样本数（同时生成 n 个 heldout 样本）
 * @param noise   噪声水平：0 = 无噪声；>0 时输出加高斯噪声，
 *                标准差 = noise * |输出均值|（Box-Muller）
 * @param seed    随机种子
 *
 * 输入变量在 [-5, 5] 范围内随机；若公式在负数域产生 NaN（如 sqrt/log），
 * 则自动收缩到 [0.5, 5] 保证有效样本。
 */
export function generateDataset(
  theory: SymbolicTheory,
  n: number,
  noise: number,
  seed: number,
): Dataset {
  const rng = mulberry32(seed);
  const inputVars = theory.inputVars;

  // 探测安全域：先试 [-5, 5]，若产生过多 NaN 则收缩到 [0.5, 5]
  let lo = -5;
  let hi = 5;
  const probeEnv: Record<string, number> = {};
  for (const v of inputVars) probeEnv[v] = -3;
  let probeVal: number;
  try {
    probeVal = evaluate(theory.expr, probeEnv);
  } catch {
    probeVal = NaN;
  }
  if (!Number.isFinite(probeVal)) {
    lo = 0.5;
    hi = 5;
  }

  function sampleInput(): Record<string, number> {
    const env: Record<string, number> = {};
    for (const v of inputVars) {
      env[v] = lo + rng() * (hi - lo);
    }
    return env;
  }

  function makeSet(count: number): { inputs: Record<string, number>[]; outputs: number[] } {
    const inputs: Record<string, number>[] = [];
    const outputs: number[] = [];
    let attempts = 0;
    const maxAttempts = count * 20;
    while (inputs.length < count && attempts < maxAttempts) {
      attempts++;
      const inp = sampleInput();
      let out: number;
      try {
        out = evaluate(theory.expr, inp);
      } catch {
        out = NaN;
      }
      if (Number.isFinite(out)) {
        inputs.push(inp);
        outputs.push(out);
      }
    }
    // 极端情况：无法生成足够有效样本，用 0 填充
    while (inputs.length < count) {
      inputs.push(sampleInput());
      outputs.push(0);
    }
    return { inputs, outputs };
  }

  const train = makeSet(n);
  const heldout = makeSet(n);

  // 计算噪声标准差 = noise * |训练输出均值|
  let outputs = train.outputs;
  let heldoutOutputs = heldout.outputs;

  if (noise > 0) {
    const meanAbs = outputs.reduce((s, v) => s + Math.abs(v), 0) / (outputs.length || 1);
    const std = noise * meanAbs;
    outputs = outputs.map((v) => v + gaussian(rng, 0, std));
    // heldout 用相同的 std
    heldoutOutputs = heldoutOutputs.map((v) => v + gaussian(rng, 0, std));
  }

  return {
    inputs: train.inputs,
    outputs,
    heldoutInputs: heldout.inputs,
    heldoutOutputs,
  };
}

// ===========================================================================
// 4. P1 评分
// ===========================================================================

export interface P1ScoreResult {
  score: number;
  heldoutAccuracy: number;
  symbolicEquivalent: boolean;
  complexity: number;
  details: {
    heldoutAccuracy: number;
    symbolicEquivalent: number; // 1 或 0
    complexityPenalty: number; // 0.01 * complexity
    queryCostPenalty: number; // 0.001 * queryCost
    meanRelativeError: number;
    nHeldout: number;
  };
}

/**
 * 计算 P1 评分。
 *
 *   heldoutAccuracy = 1 - meanRelativeError（相对误差均值，clamp [0,1]）
 *   symbolicEquivalent = isSymbolicallyEquivalent(theory.expr, target.expr, target.inputVars)
 *   complexity = theory.complexity
 *   score = heldoutAccuracy + symbolicEquivalent - 0.01*complexity - 0.001*queryCost
 *         （symbolicEquivalent 作为 1/0 参与加法）
 */
export function p1Score(
  theory: SymbolicTheory,
  target: SymbolicTheory,
  heldoutInputs: Record<string, number>[],
  heldoutOutputs: number[],
  queryCost: number,
): P1ScoreResult {
  const n = heldoutInputs.length;

  // 计算 heldout 预测的相对误差
  let sumRelErr = 0;
  let validCount = 0;
  for (let i = 0; i < n; i++) {
    let pred: number;
    try {
      pred = evaluate(theory.expr, heldoutInputs[i]);
    } catch {
      pred = NaN;
    }
    const actual = heldoutOutputs[i];
    if (!Number.isFinite(pred) || !Number.isFinite(actual)) {
      // NaN 预测视为最大误差
      sumRelErr += 1;
      validCount++;
      continue;
    }
    const denom = Math.abs(actual) + 1e-9;
    const relErr = Math.abs(pred - actual) / denom;
    sumRelErr += Math.min(relErr, 1); // 单个样本 clamp 到 [0,1]
    validCount++;
  }
  const meanRelativeError = validCount > 0 ? sumRelErr / validCount : 1;
  const heldoutAccuracy = Math.max(0, Math.min(1, 1 - meanRelativeError));

  const symbolicEquivalent = isSymbolicallyEquivalent(
    theory.expr,
    target.expr,
    target.inputVars,
  );
  const eqScore = symbolicEquivalent ? 1 : 0;
  const cplx = theory.complexity;

  const complexityPenalty = 0.01 * cplx;
  const queryCostPenalty = 0.001 * queryCost;
  const score =
    heldoutAccuracy + eqScore - complexityPenalty - queryCostPenalty;

  return {
    score,
    heldoutAccuracy,
    symbolicEquivalent,
    complexity: cplx,
    details: {
      heldoutAccuracy,
      symbolicEquivalent: eqScore,
      complexityPenalty,
      queryCostPenalty,
      meanRelativeError,
      nHeldout: n,
    },
  };
}

// ===========================================================================
// 5. P1 算法 baseline（本地可跑，无需 API）
// ===========================================================================

export interface BaselineOutput {
  theory: SymbolicTheory;
  queryCost: number;
}

/**
 * 随机搜索：随机生成 budget 个表达式，在训练集上评估，返回最优。
 */
export function runRandomSearchP1(
  target: SymbolicTheory,
  dataset: Dataset,
  budget: number,
): BaselineOutput {
  const rng = mulberry32(12345);
  let bestExpr: Expr = Const(0);
  let bestMse = Infinity;

  for (let i = 0; i < budget; i++) {
    const depth = 1 + Math.floor(rng() * 3); // 1..3
    const expr = genRandomExpr(rng, depth, target.inputVars, true);
    const mse = trainingMse(expr, dataset);
    if (mse < bestMse) {
      bestMse = mse;
      bestExpr = expr;
    }
  }

  return {
    theory: makeTheory(`${target.id}_random`, bestExpr, target.outputVar, target.inputVars),
    queryCost: budget,
  };
}

/**
 * 贪心搜索（简化版）：基于残差的逐步加项。
 *
 * 流程：
 *   1. 候选基项集合：对每个输入变量 v，生成 v, v^2, sin(v), cos(v), abs(v)
 *   2. 从常数项（均值）开始
 *   3. 每一步：尝试将每个未选基项加入当前模型，用最小二乘拟合系数，
 *      选择使训练 MSE 下降最多的基项
 *   4. 重复直到 budget 步或无改善
 *
 * 系数拟合用最小二乘法（正规方程 + 高斯消元）。
 */
export function runGreedySearchP1(
  target: SymbolicTheory,
  dataset: Dataset,
  budget: number,
): BaselineOutput {
  const inputVars = target.inputVars;
  const n = dataset.inputs.length;

  // 生成候选基项
  const candidateTerms: { name: string; eval: (env: Record<string, number>) => number }[] = [];
  for (const v of inputVars) {
    candidateTerms.push({ name: `${v}`, eval: (e) => e[v] });
    candidateTerms.push({ name: `${v}^2`, eval: (e) => e[v] * e[v] });
    candidateTerms.push({ name: `sin(${v})`, eval: (e) => Math.sin(e[v]) });
    candidateTerms.push({ name: `cos(${v})`, eval: (e) => Math.cos(e[v]) });
    candidateTerms.push({ name: `abs(${v})`, eval: (e) => Math.abs(e[v]) });
  }

  // 常数项始终包含
  const selectedIndices: number[] = []; // 候选基项的索引（不含常数项）
  const targets = dataset.outputs;

  // 当前设计矩阵（第一列是常数 1）
  function buildDesignMatrix(indices: number[]): number[][] {
    return dataset.inputs.map((env) => {
      const row = [1]; // 常数项
      for (const idx of indices) {
        row.push(candidateTerms[idx].eval(env));
      }
      return row;
    });
  }

  function fitAndEval(indices: number[]): { mse: number; coefs: number[] } {
    const X = buildDesignMatrix(indices);
    const coefs = leastSquares(X, targets);
    if (!coefs) return { mse: Infinity, coefs: [] };
    let se = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < coefs.length; j++) {
        pred += coefs[j] * X[i][j];
      }
      se += (pred - targets[i]) ** 2;
    }
    return { mse: se / n, coefs };
  }

  // 初始：仅常数项
  let current = fitAndEval(selectedIndices);
  const used = new Set<number>();

  // 贪心加项
  const maxSteps = Math.min(budget, candidateTerms.length);
  for (let step = 0; step < maxSteps; step++) {
    let bestIdx = -1;
    let bestMse = current.mse;

    for (let ci = 0; ci < candidateTerms.length; ci++) {
      if (used.has(ci)) continue;
      const trial = fitAndEval([...selectedIndices, ci]);
      if (trial.mse < bestMse - 1e-12) {
        bestMse = trial.mse;
        bestIdx = ci;
      }
    }

    if (bestIdx < 0) break; // 无改善
    selectedIndices.push(bestIdx);
    used.add(bestIdx);
    current = fitAndEval(selectedIndices);
  }

  // 用最终系数构造 Expr
  const finalCoefs = current.coefs;
  const expr = buildSumExpr(finalCoefs, selectedIndices, candidateTerms);

  return {
    theory: makeTheory(`${target.id}_greedy`, expr, target.outputVar, inputVars),
    queryCost: selectedIndices.length + 1, // 选中项数 + 初始拟合
  };
}

/**
 * Oracle：直接返回 target（理论上限）。
 */
export function runOracleP1(target: SymbolicTheory, _dataset: Dataset): BaselineOutput {
  return {
    theory: makeTheory(`${target.id}_oracle`, target.expr, target.outputVar, target.inputVars),
    queryCost: 0,
  };
}

// ---------------------------------------------------------------------------
// baseline 辅助函数
// ---------------------------------------------------------------------------

/** 计算表达式在训练集上的 MSE */
function trainingMse(expr: Expr, dataset: Dataset): number {
  const n = dataset.inputs.length;
  let se = 0;
  for (let i = 0; i < n; i++) {
    let pred: number;
    try {
      pred = evaluate(expr, dataset.inputs[i]);
    } catch {
      pred = NaN;
    }
    if (!Number.isFinite(pred)) {
      se += (dataset.outputs[i]) ** 2 + 1e6; // 重罚 NaN
    } else {
      se += (pred - dataset.outputs[i]) ** 2;
    }
  }
  return se / n;
}

/** 最小二乘法：解 X^T X β = X^T y，返回系数向量（含截距） */
function leastSquares(design: number[][], targets: number[]): number[] | null {
  const n = design.length;
  if (n === 0) return null;
  const k = design[0].length;
  if (k === 0) return [];

  // X^T X (k×k) 和 X^T y (k×1)
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += design[i][a] * targets[i];
      for (let b = 0; b < k; b++) {
        XtX[a][b] += design[i][a] * design[i][b];
      }
    }
  }
  return solveLinearSystem(XtX, Xty);
}

/** 高斯消元解线性方程组 A x = b（带部分主元选取） */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  if (n === 0) return [];
  // 增广矩阵
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // 部分主元
    let maxRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) maxRow = r;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null; // 奇异

    for (let r = i + 1; r < n; r++) {
      const factor = M[r][i] / M[i][i];
      for (let c = i; c <= n; c++) {
        M[r][c] -= factor * M[i][c];
      }
    }
  }

  // 回代
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }
  return x;
}

/** 根据系数和选中的基项构造求和表达式：c0 + c1*term1 + c2*term2 + ... */
function buildSumExpr(
  coefs: number[],
  selectedIndices: number[],
  candidateTerms: { name: string; eval: (env: Record<string, number>) => number }[],
): Expr {
  // 解析基项名为 Expr
  function termToExpr(name: string): Expr {
    // 形如 "x", "x^2", "sin(x)", "cos(x)", "abs(x)"
    const varMatch = name.match(/^([a-zA-Z])\^2$/);
    if (varMatch) return BinOp('^', Var(varMatch[1]), Const(2));
    const funcMatch = name.match(/^(\w+)\((\w+)\)$/);
    if (funcMatch) {
      const fn = funcMatch[1] as FuncName;
      return Func(fn, Var(funcMatch[2]));
    }
    return Var(name); // 单变量
  }

  const terms: Expr[] = [];
  // coefs[0] 是常数项
  if (coefs.length > 0 && Math.abs(coefs[0]) > 1e-10) {
    terms.push(Const(roundNum(coefs[0])));
  }
  for (let i = 0; i < selectedIndices.length; i++) {
    const c = coefs[i + 1];
    if (c === undefined || Math.abs(c) < 1e-10) continue;
    const termExpr = termToExpr(candidateTerms[selectedIndices[i]].name);
    if (Math.abs(c - 1) < 1e-10) {
      terms.push(termExpr);
    } else if (Math.abs(c + 1) < 1e-10) {
      // -1 * term => 用 0 - term
      terms.push(BinOp('-', Const(0), termExpr));
    } else {
      terms.push(BinOp('*', Const(roundNum(c)), termExpr));
    }
  }

  if (terms.length === 0) return Const(0);
  let result = terms[0];
  for (let i = 1; i < terms.length; i++) {
    result = BinOp('+', result, terms[i]);
  }
  return result;
}

function roundNum(v: number): number {
  return Math.round(v * 1000) / 1000;
}

// ===========================================================================
// 6. P1 benchmark 编排
// ===========================================================================

export interface RunP1BenchmarkOpts {
  /** 合成公式数量（默认 60，留余量保证 >= 50） */
  n?: number;
  /** 随机种子 */
  seed?: number;
  /** 噪声水平：0 = 无噪声，0.05 = 有噪声 */
  noise?: number;
  /** 每个公式的训练样本数 */
  nTrain?: number;
  /** 每个公式的 heldout 样本数 */
  nHeldout?: number;
  /** 随机搜索预算（候选表达式数） */
  randomBudget?: number;
  /** 贪心搜索预算（最大加项步数） */
  greedyBudget?: number;
  /** 输出文件路径（可选） */
  output?: string;
}

export interface PerFormulaBaselineResult {
  baseline: string;
  predictedExprStr: string;
  heldoutAccuracy: number;
  symbolicEquivalent: boolean;
  complexity: number;
  score: number;
  queryCost: number;
}

export interface PerFormulaResult {
  formulaId: string;
  category: 'synthetic' | 'classic';
  targetExprStr: string;
  targetComplexity: number;
  results: Record<string, PerFormulaBaselineResult>;
}

export interface AggregatedMetrics {
  count: number;
  avgAccuracy: number;
  avgScore: number;
  eqRate: number;
  avgComplexity: number;
  avgQueryCost: number;
}

export interface P1Report {
  generatedAt: string;
  opts: {
    n: number;
    seed: number;
    noise: number;
    nTrain: number;
    nHeldout: number;
    randomBudget: number;
    greedyBudget: number;
  };
  syntheticCount: number;
  classicCount: number;
  baselines: string[];
  perFormulaResults: PerFormulaResult[];
  aggregated: {
    synthetic: Record<string, AggregatedMetrics>;
    classic: Record<string, AggregatedMetrics>;
    overall: Record<string, AggregatedMetrics>;
  };
  significanceTest: {
    method: string;
    randomVsGreedy: {
      nPairs: number;
      meanScoreDiff: number; // greedy - random
      winsGreedy: number;
      winsRandom: number;
      ties: number;
      pValueApprox: number;
    };
  };
}

/**
 * 运行 P1 benchmark。
 *
 * 对合成公式（>= 50）和经典公式（>= 10）分别跑 random / greedy / oracle 三个 baseline，
 * 区分两类任务的准确率，必测 heldout prediction 与 symbolic equivalence，
 * 并做 random vs greedy 的配对显著性检验。
 */
export function runP1Benchmark(opts: RunP1BenchmarkOpts = {}): P1Report {
  const n = opts.n ?? 60;
  const seed = opts.seed ?? 42;
  const noise = opts.noise ?? 0;
  const nTrain = opts.nTrain ?? 20;
  const nHeldout = opts.nHeldout ?? 30;
  const randomBudget = opts.randomBudget ?? 30;
  const greedyBudget = opts.greedyBudget ?? 8;

  // 生成公式
  const syntheticFormulas = generateSyntheticFormulas(n, seed);
  const allFormulas: { theory: SymbolicTheory; category: 'synthetic' | 'classic' }[] = [
    ...syntheticFormulas.map((t) => ({ theory: t, category: 'synthetic' as const })),
    ...CLASSIC_FORMULAS.map((t) => ({ theory: t, category: 'classic' as const })),
  ];

  const baselines = ['random', 'greedy', 'oracle'];
  const perFormulaResults: PerFormulaResult[] = [];

  // 收集 random vs greedy 的配对分数（用于显著性检验）
  const randomScores: number[] = [];
  const greedyScores: number[] = [];

  for (let fi = 0; fi < allFormulas.length; fi++) {
    const { theory: target, category } = allFormulas[fi];
    const dataset = generateDataset(target, nTrain, noise, seed + fi * 1000 + 7);

    const randomOut = runRandomSearchP1(target, dataset, randomBudget);
    const greedyOut = runGreedySearchP1(target, dataset, greedyBudget);
    const oracleOut = runOracleP1(target, dataset);

    const baselineOutputs: Record<string, BaselineOutput> = {
      random: randomOut,
      greedy: greedyOut,
      oracle: oracleOut,
    };

    const results: Record<string, PerFormulaBaselineResult> = {};
    for (const b of baselines) {
      const out = baselineOutputs[b];
      const scoreResult = p1Score(
        out.theory,
        target,
        dataset.heldoutInputs,
        dataset.heldoutOutputs,
        out.queryCost,
      );
      results[b] = {
        baseline: b,
        predictedExprStr: exprToString(out.theory.expr),
        heldoutAccuracy: scoreResult.heldoutAccuracy,
        symbolicEquivalent: scoreResult.symbolicEquivalent,
        complexity: scoreResult.complexity,
        score: scoreResult.score,
        queryCost: out.queryCost,
      };
    }

    perFormulaResults.push({
      formulaId: target.id,
      category,
      targetExprStr: exprToString(target.expr),
      targetComplexity: target.complexity,
      results,
    });

    randomScores.push(results['random'].score);
    greedyScores.push(results['greedy'].score);
  }

  // 聚合（按合成/经典/整体分组）
  const aggregated: P1Report['aggregated'] = {
    synthetic: {},
    classic: {},
    overall: {},
  };
  for (const b of baselines) {
    aggregated.synthetic[b] = aggregateMetrics(
      perFormulaResults.filter((r) => r.category === 'synthetic'),
      b,
    );
    aggregated.classic[b] = aggregateMetrics(
      perFormulaResults.filter((r) => r.category === 'classic'),
      b,
    );
    aggregated.overall[b] = aggregateMetrics(perFormulaResults, b);
  }

  // 显著性检验：random vs greedy 配对比较
  const sigTest = pairedSignTest(greedyScores, randomScores);

  const report: P1Report = {
    generatedAt: new Date().toISOString(),
    opts: { n, seed, noise, nTrain, nHeldout, randomBudget, greedyBudget },
    syntheticCount: syntheticFormulas.length,
    classicCount: CLASSIC_FORMULAS.length,
    baselines,
    perFormulaResults,
    aggregated,
    significanceTest: {
      method: 'paired_sign_test (greedy vs random, two-sided)',
      randomVsGreedy: sigTest,
    },
  };

  // 写入文件
  if (opts.output) {
    const dir = path.dirname(opts.output);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(opts.output, JSON.stringify(report, null, 2));
  }

  return report;
}

function aggregateMetrics(results: PerFormulaResult[], baseline: string): AggregatedMetrics {
  const n = results.length;
  if (n === 0) {
    return { count: 0, avgAccuracy: 0, avgScore: 0, eqRate: 0, avgComplexity: 0, avgQueryCost: 0 };
  }
  let sumAcc = 0, sumScore = 0, eqCount = 0, sumCplx = 0, sumCost = 0;
  for (const r of results) {
    const b = r.results[baseline];
    sumAcc += b.heldoutAccuracy;
    sumScore += b.score;
    if (b.symbolicEquivalent) eqCount++;
    sumCplx += b.complexity;
    sumCost += b.queryCost;
  }
  return {
    count: n,
    avgAccuracy: sumAcc / n,
    avgScore: sumScore / n,
    eqRate: eqCount / n,
    avgComplexity: sumCplx / n,
    avgQueryCost: sumCost / n,
  };
}

/**
 * 配对符号检验（sign test）。
 *
 * 对每对 (scoreA[i], scoreB[i])，若差值 > 0 记 A 胜，< 0 记 B 胜，= 0 记平局。
 * 在零假设（A 与 B 无差异）下，非平局对数中 A 胜数 ~ Binomial(n, 0.5)。
 * 双侧 p 值 = 2 * min(P(X <= winsA), P(X >= winsA))。
 */
function pairedSignTest(scoresA: number[], scoresB: number[]): {
  nPairs: number;
  meanScoreDiff: number;
  winsGreedy: number;
  winsRandom: number;
  ties: number;
  pValueApprox: number;
} {
  const n = Math.min(scoresA.length, scoresB.length);
  let winsA = 0, winsB = 0, ties = 0, sumDiff = 0;
  for (let i = 0; i < n; i++) {
    const diff = scoresA[i] - scoresB[i];
    sumDiff += diff;
    if (Math.abs(diff) < 1e-9) ties++;
    else if (diff > 0) winsA++;
    else winsB++;
  }
  const nonTies = winsA + winsB;
  // 双侧 p 值
  let pValue: number;
  if (nonTies === 0) {
    pValue = 1.0;
  } else {
    // P(X >= max(winsA, winsB)) 的两倍（双侧）
    const k = Math.max(winsA, winsB);
    pValue = 2 * binomialSurvival(k, nonTies, 0.5);
    pValue = Math.min(1, pValue);
  }
  return {
    nPairs: n,
    meanScoreDiff: n > 0 ? sumDiff / n : 0,
    winsGreedy: winsA,
    winsRandom: winsB,
    ties,
    pValueApprox: pValue,
  };
}

/** 二项分布生存函数 P(X >= k)，X ~ Binomial(n, p)。直接求和（n 不大）。 */
function binomialSurvival(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let sum = 0;
  for (let i = k; i <= n; i++) {
    sum += binomialPmf(i, n, p);
  }
  return sum;
}

function binomialPmf(i: number, n: number, p: number): number {
  // C(n, i) * p^i * (1-p)^(n-i)
  const logC = logBinomial(n, i);
  const logP = i * Math.log(p) + (n - i) * Math.log(1 - p);
  return Math.exp(logC + logP);
}

function logBinomial(n: number, k: number): number {
  // log(n!) - log(k!) - log((n-k)!)
  let r = 0;
  for (let i = 1; i <= n; i++) r += Math.log(i);
  for (let i = 1; i <= k; i++) r -= Math.log(i);
  for (let i = 1; i <= n - k; i++) r -= Math.log(i);
  return r;
}

// ===========================================================================
// 7. CLI 入口
// ===========================================================================

function parseArgs(argv: string[]): RunP1BenchmarkOpts {
  const opts: RunP1BenchmarkOpts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`缺少参数值: ${a}`);
      return v;
    };
    if (a === '--n') opts.n = parseInt(next());
    else if (a === '--seed') opts.seed = parseInt(next());
    else if (a === '--noise') opts.noise = parseFloat(next());
    else if (a === '--n-train') opts.nTrain = parseInt(next());
    else if (a === '--n-heldout') opts.nHeldout = parseInt(next());
    else if (a === '--random-budget') opts.randomBudget = parseInt(next());
    else if (a === '--greedy-budget') opts.greedyBudget = parseInt(next());
    else if (a === '--output') opts.output = next();
  }
  return opts;
}

function printSummary(report: P1Report): void {
  const lines: string[] = [];
  lines.push('=== P1 符号规律发现 Benchmark ===');
  lines.push(`  生成时间: ${report.generatedAt}`);
  lines.push(`  参数: n=${report.opts.n} seed=${report.opts.seed} noise=${report.opts.noise} nTrain=${report.opts.nTrain} nHeldout=${report.opts.nHeldout}`);
  lines.push(`  公式数: 合成=${report.syntheticCount} 经典=${report.classicCount} 总计=${report.syntheticCount + report.classicCount}`);
  lines.push('');
  lines.push('--- 按 baseline 汇总（整体）---');
  lines.push(formatRow(['baseline', 'count', 'acc', 'score', 'eqRate', 'cplx', 'cost']));
  for (const b of report.baselines) {
    const m = report.aggregated.overall[b];
    lines.push(formatRow([
      b, String(m.count),
      m.avgAccuracy.toFixed(4),
      m.avgScore.toFixed(4),
      m.eqRate.toFixed(4),
      m.avgComplexity.toFixed(2),
      m.avgQueryCost.toFixed(1),
    ]));
  }
  lines.push('');
  lines.push('--- 按类别 × baseline（准确率 / 等价率 / 平均分）---');
  for (const b of report.baselines) {
    const syn = report.aggregated.synthetic[b];
    const cls = report.aggregated.classic[b];
    lines.push(`  ${b}:`);
    lines.push(`    合成 (n=${syn.count}): acc=${syn.avgAccuracy.toFixed(4)} eqRate=${syn.eqRate.toFixed(4)} score=${syn.avgScore.toFixed(4)}`);
    lines.push(`    经典 (n=${cls.count}): acc=${cls.avgAccuracy.toFixed(4)} eqRate=${cls.eqRate.toFixed(4)} score=${cls.avgScore.toFixed(4)}`);
  }
  lines.push('');
  lines.push('--- 显著性检验（greedy vs random，配对符号检验）---');
  const st = report.significanceTest.randomVsGreedy;
  lines.push(`  方法: ${report.significanceTest.method}`);
  lines.push(`  配对数: ${st.nPairs}`);
  lines.push(`  平均分差 (greedy - random): ${st.meanScoreDiff.toFixed(6)}`);
  lines.push(`  greedy 胜: ${st.winsGreedy}  random 胜: ${st.winsRandom}  平局: ${st.ties}`);
  lines.push(`  双侧 p 值近似: ${st.pValueApprox.toFixed(6)}`);
  lines.push('');
  if (report.opts.noise === 0) {
    lines.push('  条件: 无噪声');
  } else {
    lines.push(`  条件: 有噪声 (noise=${report.opts.noise})`);
  }
  console.log(lines.join('\n'));
}

function formatRow(cols: string[]): string {
  return cols.map((c) => c.padEnd(12)).join('');
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  console.log('=== P1 Benchmark 编排启动 ===');
  console.log(`  参数: ${JSON.stringify(opts)}`);

  const report = runP1Benchmark(opts);

  printSummary(report);

  if (opts.output) {
    console.log(`\n  报告已写入: ${opts.output}`);
  }
  console.log('\n=== P1 Benchmark 完成 ===');
}

// ESM CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`P1 benchmark 失败: ${e.message}`);
    process.exit(1);
  });
}
