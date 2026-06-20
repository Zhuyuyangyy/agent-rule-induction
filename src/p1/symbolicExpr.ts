// P1 符号表达式 Theory DSL。
//
// 本文件定义 P1 阶段的符号表达式 AST、求值、复杂度、符号等价性近似判断、
// 序列化以及 SymbolicTheory 接口。不依赖任何外部 CAS 库（无 mathjs/sympy），
// 全部手写实现。
//
// 设计说明：
//   - Expr 是判别联合类型，用 `kind` 字段区分 Const / Var / BinOp / Func。
//   - 复杂度返回单个 number（节点数 + 深度惩罚的简化形式）。
//   - 符号等价性用「数值采样等价性」近似，详见 isSymbolicallyEquivalent 注释。

// ---------------------------------------------------------------------------
// 表达式 AST
// ---------------------------------------------------------------------------

export type BinOpKind = '+' | '-' | '*' | '/' | '^';
export type FuncName = 'sin' | 'cos' | 'sqrt' | 'abs' | 'log';

export interface ConstNode {
  kind: 'Const';
  value: number;
}
export interface VarNode {
  kind: 'Var';
  name: string;
}
export interface BinOpNode {
  kind: 'BinOp';
  op: BinOpKind;
  left: Expr;
  right: Expr;
}
export interface FuncNode {
  kind: 'Func';
  name: FuncName;
  arg: Expr;
}

export type Expr = ConstNode | VarNode | BinOpNode | FuncNode;

// 构造器（与接口同名，TypeScript 允许值/类型同名空间）
export function Const(value: number): ConstNode {
  return { kind: 'Const', value };
}
export function Var(name: string): VarNode {
  return { kind: 'Var', name };
}
export function BinOp(op: BinOpKind, left: Expr, right: Expr): BinOpNode {
  return { kind: 'BinOp', op, left, right };
}
export function Func(name: FuncName, arg: Expr): FuncNode {
  return { kind: 'Func', name, arg };
}

// ---------------------------------------------------------------------------
// 求值
// ---------------------------------------------------------------------------

/**
 * 对表达式在给定变量绑定下求值。
 *
 * 边界处理：
 *   - 除零（right === 0）返回 NaN（而非 JS 默认的 ±Infinity）
 *   - 负数开方返回 NaN（Math.sqrt 本身如此，这里显式保持）
 *   - log 非正参数返回 NaN（Math.log(0) = -Infinity，这里显式返回 NaN）
 *   - 0^0 返回 1（与 Math.pow 一致）；负底数非整数幂返回 NaN
 *   - 变量未绑定时抛错（编程错误，应在上游避免）
 */
export function evaluate(expr: Expr, vars: Record<string, number>): number {
  switch (expr.kind) {
    case 'Const':
      return expr.value;
    case 'Var': {
      if (!(expr.name in vars)) {
        throw new Error(`evaluate: 变量 "${expr.name}" 未绑定`);
      }
      return vars[expr.name];
    }
    case 'BinOp': {
      const l = evaluate(expr.left, vars);
      const r = evaluate(expr.right, vars);
      switch (expr.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          // 除零返回 NaN（JS 默认 1/0=Infinity，这里按任务要求返回 NaN）
          if (r === 0) return NaN;
          return l / r;
        case '^': {
          // 0^0 = 1（Math.pow 约定）；负底数非整数幂 -> NaN
          const result = Math.pow(l, r);
          return Number.isNaN(result) ? NaN : result;
        }
      }
    }
    case 'Func': {
      const a = evaluate(expr.arg, vars);
      switch (expr.name) {
        case 'sin':
          return Math.sin(a);
        case 'cos':
          return Math.cos(a);
        case 'sqrt':
          // 负数开方返回 NaN（Math.sqrt 本身如此）
          return a < 0 ? NaN : Math.sqrt(a);
        case 'abs':
          return Math.abs(a);
        case 'log':
          // log 非正参数返回 NaN
          return a <= 0 ? NaN : Math.log(a);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 复杂度计算
// ---------------------------------------------------------------------------

/**
 * 计算表达式复杂度（单个 number）。
 *
 * 定义：
 *   - Const / Var  => 1
 *   - BinOp        => 1 + complexity(left) + complexity(right)
 *   - Func         => 2 + complexity(arg)
 *
 * 该值用于 P1Score 的 expression_complexity 惩罚项。
 */
export function complexity(expr: Expr): number {
  switch (expr.kind) {
    case 'Const':
      return 1;
    case 'Var':
      return 1;
    case 'BinOp':
      return 1 + complexity(expr.left) + complexity(expr.right);
    case 'Func':
      return 2 + complexity(expr.arg);
  }
}

// ---------------------------------------------------------------------------
// 符号等价性判断（数值采样近似）
// ---------------------------------------------------------------------------

/**
 * 判断两个表达式是否符号等价（数值采样近似）。
 *
 * 方法：在 varNames 的若干随机取值点上，对两个表达式求值，若所有采样点
 * 上差值绝对值 < tolerance，则判定等价。
 *
 * NaN 处理：若两者都 NaN 视为等价；一者 NaN 一者非 NaN 视为不等价。
 *
 * 局限性（重要）：
 *   - 这不是严格的符号等价。对于在某些区域恒等但在采样区域恰好接近的表达式
 *     （如 sin(x) 与 x 在 x≈0 附近），可能误判为等价。
 *   - 对于周期性函数的相位差（如 sin(x) 与 sin(x+2π)），在采样点恰好对齐时
 *     可能误判。
 *   - 采样点有限，无法覆盖所有边界情况。
 *   - 作为 P1 的可操作近似足够，但不应作为严格的数学等价证明。
 *
 * 参数：
 *   - varNames: 参与采样的变量名列表
 *   - 采样点数 >= 20，tolerance = 1e-6
 */
export function isSymbolicallyEquivalent(
  a: Expr,
  b: Expr,
  varNames: string[],
): boolean {
  const tolerance = 1e-6;
  const numSamples = 24; // >= 20

  // 使用固定种子的 PRNG 保证可复现性
  const rng = mulberry32(0x57e5a1);
  const sampleRange = 5; // 采样范围 [-5, 5]

  for (let i = 0; i < numSamples; i++) {
    const env: Record<string, number> = {};
    for (const name of varNames) {
      // 在 [-sampleRange, sampleRange] 内随机取值，避开 0 附近以减少
      // sin(x)≈x 类误判；同时加入一些接近 0 的点
      let v: number;
      if (i < 4) {
        // 前几个点用固定典型值：1, 2, -1, 0.5
        v = [1, 2, -1, 0.5][i];
      } else {
        v = (rng() * 2 - 1) * sampleRange;
        // 避免恰好为 0
        if (Math.abs(v) < 0.01) v = v < 0 ? -0.5 : 0.5;
      }
      env[name] = v;
    }

    let va: number;
    let vb: number;
    try {
      va = evaluate(a, env);
    } catch {
      va = NaN;
    }
    try {
      vb = evaluate(b, env);
    } catch {
      vb = NaN;
    }

    const aIsNaN = Number.isNaN(va);
    const bIsNaN = Number.isNaN(vb);

    if (aIsNaN && bIsNaN) {
      // 两者都 NaN，视为等价，继续下一个采样点
      continue;
    }
    if (aIsNaN || bIsNaN) {
      // 一者 NaN 一者非 NaN，不等价
      return false;
    }
    // 两者都有限值（或 ±Infinity），比较差值
    if (!Number.isFinite(va) || !Number.isFinite(vb)) {
      // 两者都 ±Infinity：同号视为等价
      if (!Number.isFinite(va) && !Number.isFinite(vb)) {
        if (Math.sign(va) !== Math.sign(vb)) return false;
        continue;
      }
      // 一者有限一者无限，不等价
      return false;
    }
    if (Math.abs(va - vb) >= tolerance) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// 表达式序列化
// ---------------------------------------------------------------------------

function precedence(op: BinOpKind): number {
  switch (op) {
    case '+':
    case '-':
      return 1;
    case '*':
    case '/':
      return 2;
    case '^':
      return 3;
  }
}

function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  // 保留有限小数位，避免浮点噪声
  const s = v.toFixed(6).replace(/\.?0+$/, '');
  return s;
}

function exprToStringWithPrec(expr: Expr, parentPrec: number): string {
  switch (expr.kind) {
    case 'Const':
      return formatNumber(expr.value);
    case 'Var':
      return expr.name;
    case 'Func':
      return `${expr.name}(${exprToStringWithPrec(expr.arg, 0)})`;
    case 'BinOp': {
      const p = precedence(expr.op);
      const ls = exprToStringWithPrec(expr.left, p);
      // ^ 右结合：右子节点用 p-1 使同级时加括号
      const rs = exprToStringWithPrec(
        expr.right,
        expr.op === '^' ? p - 1 : p,
      );
      const s = `${ls}${expr.op}${rs}`;
      return p < parentPrec ? `(${s})` : s;
    }
  }
}

/**
 * 将表达式序列化为字符串，如 `2*x+1`、`x^2`、`sin(x)+x^2`。
 */
export function exprToString(expr: Expr): string {
  return exprToStringWithPrec(expr, 0);
}

// ---------------------------------------------------------------------------
// P1 Theory DSL 接口
// ---------------------------------------------------------------------------

/**
 * P1 符号理论：一个符号表达式 + 输入/输出变量 + 预计算复杂度 + 自然语言描述。
 */
export interface SymbolicTheory {
  id: string;
  /** 符号表达式（等式右侧） */
  expr: Expr;
  /** 输出变量名，如 "y" */
  outputVar: string;
  /** 输入变量名列表，如 ["x"] 或 ["x","z"] */
  inputVars: string[];
  /** 预计算的 complexity(expr) */
  complexity: number;
  /** 自然语言描述，如 "y = 2*x + 1" */
  naturalLanguage: () => string;
}

/**
 * 构造一个 SymbolicTheory，自动计算 complexity 和 naturalLanguage。
 */
export function makeTheory(
  id: string,
  expr: Expr,
  outputVar: string,
  inputVars: string[],
): SymbolicTheory {
  return {
    id,
    expr,
    outputVar,
    inputVars,
    complexity: complexity(expr),
    naturalLanguage: () => `${outputVar} = ${exprToString(expr)}`,
  };
}

// ---------------------------------------------------------------------------
// 内部工具：mulberry32 PRNG（与 P0 一致，可复现）
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
