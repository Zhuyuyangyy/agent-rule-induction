// P1 Symbolic Expression DSL
// Core type system for representing and evaluating symbolic expressions.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BinOp = '+' | '-' | '*' | '/' | '^';
export type UnOp = 'sin' | 'cos' | 'sqrt' | 'log' | 'abs' | 'exp' | 'neg';

export interface ConstExpr { type: 'const'; value: number; }
export interface VarExpr { type: 'var'; name: string; }
export interface BinOpExpr { type: 'binop'; op: BinOp; left: SymExpr; right: SymExpr; }
export interface UnOpExpr { type: 'unop'; op: UnOp; arg: SymExpr; }

export type SymExpr = ConstExpr | VarExpr | BinOpExpr | UnOpExpr;

// ---------------------------------------------------------------------------
// Constructors (shorthand)
// ---------------------------------------------------------------------------

export const C = (value: number): ConstExpr => ({ type: 'const', value });
export const V = (name: string): VarExpr => ({ type: 'var', name });
export const Add = (l: SymExpr, r: SymExpr): BinOpExpr => ({ type: 'binop', op: '+', left: l, right: r });
export const Sub = (l: SymExpr, r: SymExpr): BinOpExpr => ({ type: 'binop', op: '-', left: l, right: r });
export const Mul = (l: SymExpr, r: SymExpr): BinOpExpr => ({ type: 'binop', op: '*', left: l, right: r });
export const Div = (l: SymExpr, r: SymExpr): BinOpExpr => ({ type: 'binop', op: '/', left: l, right: r });
export const Pow = (l: SymExpr, r: SymExpr): BinOpExpr => ({ type: 'binop', op: '^', left: l, right: r });
export const Neg = (arg: SymExpr): UnOpExpr => ({ type: 'unop', op: 'neg', arg });
export const Sin = (arg: SymExpr): UnOpExpr => ({ type: 'unop', op: 'sin', arg });
export const Cos = (arg: SymExpr): UnOpExpr => ({ type: 'unop', op: 'cos', arg });
export const Sqrt = (arg: SymExpr): UnOpExpr => ({ type: 'unop', op: 'sqrt', arg });
export const Log = (arg: SymExpr): UnOpExpr => ({ type: 'unop', op: 'log', arg });
export const Abs = (arg: SymExpr): UnOpExpr => ({ type: 'unop', op: 'abs', arg });
export const Exp = (arg: SymExpr): UnOpExpr => ({ type: 'unop', op: 'exp', arg });

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export function evaluate(expr: SymExpr, inputs: Record<string, number>): number {
  switch (expr.type) {
    case 'const': return expr.value;
    case 'var': return inputs[expr.name] ?? 0;
    case 'binop': {
      const l = evaluate(expr.left, inputs);
      const r = evaluate(expr.right, inputs);
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? NaN : l / r;
        case '^': return Math.pow(l, r);
      }
    }
    case 'unop': {
      const a = evaluate(expr.arg, inputs);
      switch (expr.op) {
        case 'neg': return -a;
        case 'sin': return Math.sin(a);
        case 'cos': return Math.cos(a);
        case 'sqrt': return a < 0 ? NaN : Math.sqrt(a);
        case 'log': return a <= 0 ? NaN : Math.log(a);
        case 'abs': return Math.abs(a);
        case 'exp': return Math.exp(a);
      }
    }
  }
}

/** Evaluate on an array of input values mapped to x1, x2, x3, ... */
export function evaluateArray(expr: SymExpr, xs: number[]): number {
  const inputs: Record<string, number> = {};
  for (let i = 0; i < xs.length; i++) inputs[`x${i + 1}`] = xs[i];
  return evaluate(expr, inputs);
}

// ---------------------------------------------------------------------------
// String representation
// ---------------------------------------------------------------------------

export function toString(expr: SymExpr): string {
  switch (expr.type) {
    case 'const':
      return Number.isInteger(expr.value) ? String(expr.value) : expr.value.toFixed(4);
    case 'var':
      return expr.name;
    case 'binop': {
      const l = needsParens(expr.left, expr.op, 'left') ? `(${toString(expr.left)})` : toString(expr.left);
      const r = needsParens(expr.right, expr.op, 'right') ? `(${toString(expr.right)})` : toString(expr.right);
      return `${l} ${expr.op} ${r}`;
    }
    case 'unop': {
      const a = toString(expr.arg);
      switch (expr.op) {
        case 'neg': return expr.arg.type === 'binop' ? `-(${a})` : `-${a}`;
        case 'sin': case 'cos': case 'sqrt': case 'log': case 'abs': case 'exp':
          return `${expr.op}(${a})`;
      }
    }
  }
}

function needsParens(child: SymExpr, parentOp: BinOp, side: 'left' | 'right'): boolean {
  if (child.type !== 'binop') return false;
  const prec: Record<BinOp, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const childPrec = prec[child.op];
  const parentPrec = prec[parentOp];
  if (childPrec < parentPrec) return true;
  if (childPrec === parentPrec && side === 'right' && (parentOp === '-' || parentOp === '/')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Complexity (AST node count)
// ---------------------------------------------------------------------------

export function complexity(expr: SymExpr): number {
  switch (expr.type) {
    case 'const': return 1;
    case 'var': return 1;
    case 'binop': return 1 + complexity(expr.left) + complexity(expr.right);
    case 'unop': return 1 + complexity(expr.arg);
  }
}

// ---------------------------------------------------------------------------
// Structural equality
// ---------------------------------------------------------------------------

export function structuralEqual(a: SymExpr, b: SymExpr): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'const': return a.value === (b as ConstExpr).value;
    case 'var': return a.name === (b as VarExpr).name;
    case 'binop': {
      const bb = b as BinOpExpr;
      return a.op === bb.op && structuralEqual(a.left, bb.left) && structuralEqual(a.right, bb.right);
    }
    case 'unop': {
      const bb = b as UnOpExpr;
      return a.op === bb.op && structuralEqual(a.arg, bb.arg);
    }
  }
}

// ---------------------------------------------------------------------------
// Variable extraction
// ---------------------------------------------------------------------------

export function getVariables(expr: SymExpr): string[] {
  const vars = new Set<string>();
  function walk(e: SymExpr) {
    switch (e.type) {
      case 'var': vars.add(e.name); break;
      case 'binop': walk(e.left); walk(e.right); break;
      case 'unop': walk(e.arg); break;
    }
  }
  walk(expr);
  return Array.from(vars).sort();
}

/** Number of distinct variables in the expression */
export function inputDimension(expr: SymExpr): number {
  return getVariables(expr).length;
}
