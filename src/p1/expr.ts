// P1 symbolic expression DSL: AST, evaluate, parse, serialize, complexity,
// canonicalize, symbolicallyEqual.
//
// Scope (intentionally minimal — not a full CAS):
//   - Number literals, variables, binary ops (+ - * / ^), unary funcs
//     (sin cos log exp sqrt)
//   - Recursive-descent parser supporting explicit `a*b` and optional
//     implicit multiplication like `3x`, `2sin(x)`
//   - Canonicalization handles commutative sorting + constant folding +
//     basic identities (x+0, x*1, x^0, x^1, 0*x, etc.) — enough to recognize
//     `x+y == y+x`, `2*x == x*2`, `x+x == 2*x`.

export type BinOp = '+' | '-' | '*' | '/' | '^';
export type FuncName = 'sin' | 'cos' | 'log' | 'exp' | 'sqrt';

export interface NumNode { type: 'num'; value: number; }
export interface VarNode { type: 'var'; name: string; }
export interface BinopNode { type: 'binop'; op: BinOp; left: ExprNode; right: ExprNode; }
export interface FuncNode { type: 'func'; name: FuncName; arg: ExprNode; }

export type ExprNode = NumNode | VarNode | BinopNode | FuncNode;

// ---------------------------------------------------------------------------
// evaluate
// ---------------------------------------------------------------------------

export function evaluate(node: ExprNode, vars: Record<string, number>): number {
  switch (node.type) {
    case 'num': return node.value;
    case 'var': {
      if (!(node.name in vars)) {
        throw new Error(`evaluate: variable "${node.name}" not bound`);
      }
      return vars[node.name];
    }
    case 'binop': {
      const l = evaluate(node.left, vars);
      const r = evaluate(node.right, vars);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '^': return Math.pow(l, r);
      }
    }
    case 'func': {
      const a = evaluate(node.arg, vars);
      switch (node.name) {
        case 'sin': return Math.sin(a);
        case 'cos': return Math.cos(a);
        case 'log': return Math.log(a);
        case 'exp': return Math.exp(a);
        case 'sqrt': return Math.sqrt(a);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// toString
// ---------------------------------------------------------------------------

function precedence(op: BinOp): number {
  switch (op) {
    case '+': case '-': return 1;
    case '*': case '/': return 2;
    case '^': return 3;
  }
}

function toStringWithPrec(node: ExprNode, parentPrec: number): string {
  switch (node.type) {
    case 'num': {
      // Render integers without trailing .0
      const v = node.value;
      const s = Number.isInteger(v) ? String(v) : String(v);
      return s;
    }
    case 'var': return node.name;
    case 'func': return `${node.name}(${toStringWithPrec(node.arg, 0)})`;
    case 'binop': {
      const p = precedence(node.op);
      const ls = toStringWithPrec(node.left, p);
      // ^ is right-associative; for the right child use p-1 so it gets parens
      // when same precedence. Other ops are left-associative.
      const rs = toStringWithPrec(node.right, node.op === '^' ? p - 1 : p);
      const s = `${ls}${node.op}${rs}`;
      return p < parentPrec ? `(${s})` : s;
    }
  }
}

export function toString(node: ExprNode): string {
  return toStringWithPrec(node, 0);
}

// ---------------------------------------------------------------------------
// complexity
// ---------------------------------------------------------------------------

export interface Complexity { nodes: number; depth: number; }

export function complexity(node: ExprNode): Complexity {
  switch (node.type) {
    case 'num': case 'var': return { nodes: 1, depth: 1 };
    case 'binop': {
      const l = complexity(node.left);
      const r = complexity(node.right);
      return { nodes: 1 + l.nodes + r.nodes, depth: 1 + Math.max(l.depth, r.depth) };
    }
    case 'func': {
      const a = complexity(node.arg);
      return { nodes: 1 + a.nodes, depth: 1 + a.depth };
    }
  }
}

// ---------------------------------------------------------------------------
// parseExpr — recursive descent parser
//   Grammar:
//     expr   := term (('+' | '-') term)*
//     term   := factor (('*' | '/') factor)*
//     factor := unary ('^' factor)?           // right-assoc
//     unary  := ('-' unary) | postfix
//     postfix:= primary (primary)*            // implicit multiplication
//     primary:= number | var | func '(' expr ')' | '(' expr ')'
//   Whitespace is ignored.
// ---------------------------------------------------------------------------

class Parser {
  private s: string;
  private i: number = 0;

  constructor(s: string) { this.s = s; }

  private skipWs(): void {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }

  private peek(): string {
    return this.i < this.s.length ? this.s[this.i] : '';
  }

  private next(): string {
    return this.i < this.s.length ? this.s[this.i++] : '';
  }

  private match(s: string): boolean {
    this.skipWs();
    if (this.s.startsWith(s, this.i)) { this.i += s.length; return true; }
    return false;
  }

  parse(): ExprNode {
    const node = this.parseExpr();
    this.skipWs();
    if (this.i < this.s.length) {
      throw new Error(`parseExpr: unexpected trailing input at ${this.i}: "${this.s.slice(this.i)}"`);
    }
    return node;
  }

  private parseExpr(): ExprNode {
    let left = this.parseTerm();
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (c === '+' || c === '-') {
        this.next();
        const right = this.parseTerm();
        left = { type: 'binop', op: c as BinOp, left, right };
      } else break;
    }
    return left;
  }

  private parseTerm(): ExprNode {
    let left = this.parseFactor();
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (c === '*' || c === '/') {
        this.next();
        const right = this.parseFactor();
        left = { type: 'binop', op: c as BinOp, left, right };
      } else break;
    }
    // Implicit multiplication: a number/variable followed directly (no ws
    // required) by another primary, e.g. `3x`, `2sin(x)`, `x y`. We do NOT
    // merge if next char is an operator, paren-close, or end.
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (c === '' || c === '+' || c === '-' || c === '*' || c === '/' || c === '^' || c === ')') break;
      // Only treat as implicit multiplication if we are at a primary start
      // (letter, digit, or '('). Letters may begin a function name; we let
      // parsePrimary decide.
      if (!/[A-Za-z0-9_(]/.test(c)) break;
      const right = this.parseFactor();
      left = { type: 'binop', op: '*', left, right };
    }
    return left;
  }

  private parseFactor(): ExprNode {
    const base = this.parseUnary();
    this.skipWs();
    if (this.peek() === '^') {
      this.next();
      const exp = this.parseFactor(); // right-assoc
      return { type: 'binop', op: '^', left: base, right: exp };
    }
    return base;
  }

  private parseUnary(): ExprNode {
    this.skipWs();
    if (this.peek() === '-') {
      this.next();
      const arg = this.parseUnary();
      // Represent -x as 0 - x for simpler canonicalization
      return { type: 'binop', op: '-', left: { type: 'num', value: 0 }, right: arg };
    }
    if (this.peek() === '+') {
      this.next();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    this.skipWs();
    const c = this.peek();
    if (c === '') throw new Error('parseExpr: unexpected end of input');

    if (c === '(') {
      this.next();
      const inner = this.parseExpr();
      this.skipWs();
      if (this.peek() !== ')') throw new Error(`parseExpr: expected ')' at ${this.i}`);
      this.next();
      return inner;
    }

    // Number (supports decimals and scientific-ish like 1.5, 0.5, 3)
    if (/[0-9.]/.test(c)) {
      let j = this.i;
      while (j < this.s.length && /[0-9.]/.test(this.s[j])) j++;
      const numStr = this.s.slice(this.i, j);
      this.i = j;
      const v = parseFloat(numStr);
      if (Number.isNaN(v)) throw new Error(`parseExpr: invalid number "${numStr}"`);
      return { type: 'num', value: v };
    }

    // Identifier: variable or function name
    if (/[A-Za-z_]/.test(c)) {
      let j = this.i;
      while (j < this.s.length && /[A-Za-z0-9_]/.test(this.s[j])) j++;
      const name = this.s.slice(this.i, j);
      this.i = j;
      this.skipWs();
      if (this.peek() === '(') {
        // Function call
        const funcNames: FuncName[] = ['sin', 'cos', 'log', 'exp', 'sqrt'];
        if (!funcNames.includes(name as FuncName)) {
          throw new Error(`parseExpr: unknown function "${name}"`);
        }
        this.next(); // consume '('
        const arg = this.parseExpr();
        this.skipWs();
        if (this.peek() !== ')') throw new Error(`parseExpr: expected ')' after function arg at ${this.i}`);
        this.next();
        return { type: 'func', name: name as FuncName, arg };
      }
      return { type: 'var', name };
    }

    throw new Error(`parseExpr: unexpected char "${c}" at ${this.i}`);
  }
}

export function parseExpr(str: string): ExprNode {
  return new Parser(str).parse();
}

// ---------------------------------------------------------------------------
// canonicalize — produce a normalized form for symbolic equality checks.
//   - Sort operands of commutative ops (+, *) by a stable key
//   - Fold constants
//   - Apply basic identities: x+0=x, 0+x=x, x-0=x, 0-x=-x, x*1=x, 1*x=x,
//     x*0=0, 0*x=0, x^0=1, x^1=x, 0^x=0 (x>0), 1^x=1
//   - Flatten nested same-op chains (a+(b+c) -> a+b+c) before sorting
//   - Combine like numeric terms in sums (2*x + 3*x -> 5*x) and numeric
//     factors in products (2*x*3 -> 6*x)
//   - Not a full CAS: does not expand (a+b)*(c+d), does not handle log/exp
//     identities. Sufficient for `x+y == y+x`, `2*x == x*2`, `x+x == 2*x`.
// ---------------------------------------------------------------------------

function isZero(n: ExprNode): boolean { return n.type === 'num' && n.value === 0; }
function isOne(n: ExprNode): boolean { return n.type === 'num' && n.value === 1; }

// Stable sort key for an ExprNode (used for commutative ordering).
function sortKey(node: ExprNode): string {
  switch (node.type) {
    case 'num': return `0:${node.value}`;
    case 'var': return `1:${node.name}`;
    case 'func': return `2:${node.name}(${sortKey(node.arg)})`;
    case 'binop': return `3:${node.op}(${sortKey(node.left)},${sortKey(node.right)})`;
  }
}

// Flatten a binop chain of the same op into an array of operands.
function flatten(node: ExprNode, op: BinOp): ExprNode[] {
  if (node.type === 'binop' && node.op === op) {
    return [...flatten(node.left, op), ...flatten(node.right, op)];
  }
  return [node];
}

function num(value: number): ExprNode { return { type: 'num', value }; }

// Combine a list of nodes that are "like terms" in a sum.
// We treat each term as (coefficient, baseExpr) where baseExpr is the
// non-numeric part. Pure numbers fold together. Terms with identical
// canonical base fold by summing coefficients.
function combineSumTerms(terms: ExprNode[]): ExprNode[] {
  // First recursively canonicalize each term
  const canon = terms.map(t => canonicalize(t));

  // Separate numeric constants from symbolic terms
  let constSum: number = 0;
  const symbolic: { coef: number; base: ExprNode; baseKey: string }[] = [];

  for (const t of canon) {
    if (t.type === 'num') { constSum += t.value; continue; }
    const { coef, base } = peelCoefficient(t);
    const baseKey = sortKey(base);
    const existing = symbolic.find(s => s.baseKey === baseKey);
    if (existing) existing.coef += coef;
    else symbolic.push({ coef, base, baseKey });
  }

  const out: ExprNode[] = [];
  for (const s of symbolic) {
    if (s.coef === 0) continue;
    if (s.coef === 1) out.push(s.base);
    else out.push({ type: 'binop', op: '*', left: num(s.coef), right: s.base });
  }
  if (constSum !== 0 || out.length === 0) out.push(num(constSum));
  return out;
}

// Combine a list of nodes that are "like factors" in a product.
// Pure numbers multiply. Bases with identical canonical form combine by
// summing exponents (x * x -> x^2).
function combineProductTerms(terms: ExprNode[]): ExprNode[] {
  const canon = terms.map(t => canonicalize(t));

  let constProd: number = 1;
  const symbolic: { base: ExprNode; baseKey: string; exp: number }[] = [];

  for (const t of canon) {
    if (t.type === 'num') {
      if (t.value === 0) return [num(0)]; // 0 * anything = 0
      constProd *= t.value;
      continue;
    }
    const { base, exp } = peelExponent(t);
    const baseKey = sortKey(base);
    const existing = symbolic.find(s => s.baseKey === baseKey);
    if (existing) existing.exp += exp;
    else symbolic.push({ base, baseKey, exp });
  }

  const out: ExprNode[] = [];
  const isNotOne = constProd !== 1;
  const isNotZero = constProd !== 0;
  if (isNotOne || (symbolic.length === 0 && isNotZero)) out.push(num(constProd));
  for (const s of symbolic) {
    if (s.exp === 0) continue;
    if (s.exp === 1) out.push(s.base);
    else out.push({ type: 'binop', op: '^', left: s.base, right: num(s.exp) });
  }
  if (out.length === 0) out.push(num(1));
  return out;
}

// Peel a numeric coefficient out of a (possibly product) node:
//   2*x         -> { coef: 2, base: x }
//   2*3*x       -> handled after canonicalize -> 6*x -> { coef: 6, base: x }
//   x           -> { coef: 1, base: x }
//   2           -> { coef: 2, base: 1 }  (caller should treat as constant)
function peelCoefficient(node: ExprNode): { coef: number; base: ExprNode } {
  if (node.type === 'binop' && node.op === '*') {
    // Look for a numeric factor anywhere in the flattened product
    const terms = flatten(node, '*');
    let coef = 1;
    const rest: ExprNode[] = [];
    for (const t of terms) {
      if (t.type === 'num') coef *= t.value;
      else rest.push(t);
    }
    const base = rest.length === 0 ? num(1)
      : rest.length === 1 ? rest[0]
      : rest.reduce((acc, r) => ({ type: 'binop', op: '*', left: acc, right: r }));
    return { coef, base };
  }
  if (node.type === 'num') return { coef: node.value, base: num(1) };
  return { coef: 1, base: node };
}

// Peel an exponent out of a (possibly power) node:
//   x^2  -> { base: x, exp: 2 }
//   x    -> { base: x, exp: 1 }
function peelExponent(node: ExprNode): { base: ExprNode; exp: number } {
  if (node.type === 'binop' && node.op === '^' && node.right.type === 'num') {
    return { base: node.left, exp: node.right.value };
  }
  return { base: node, exp: 1 };
}

export function canonicalize(node: ExprNode): ExprNode {
  switch (node.type) {
    case 'num': return { ...node };
    case 'var': return { ...node };
    case 'func':
      return { type: 'func', name: node.name, arg: canonicalize(node.arg) };
    case 'binop': {
      const op = node.op;
      // For non-commutative, non-power ops (-, /), just canonicalize children.
      if (op === '-' || op === '/') {
        const l = canonicalize(node.left);
        const r = canonicalize(node.right);
        if (op === '-') {
          // x - 0 = x ; 0 - x = -x (represent as 0 - x, which it already is)
          if (isZero(r)) return l;
          return { type: 'binop', op: '-', left: l, right: r };
        }
        // op === '/'
        if (isZero(l)) return num(0);
        if (isOne(r)) return l;
        return { type: 'binop', op: '/', left: l, right: r };
      }
      if (op === '^') {
        const l = canonicalize(node.left);
        const r = canonicalize(node.right);
        if (r.type === 'num') {
          if (r.value === 0) return num(1);
          if (r.value === 1) return l;
        }
        if (l.type === 'num') {
          if (l.value === 0) return num(0);
          if (l.value === 1) return num(1);
          if (r.type === 'num') return num(Math.pow(l.value, r.value));
        }
        return { type: 'binop', op: '^', left: l, right: r };
      }
      // Commutative: + or *
      const flat = flatten(node, op);
      const combined = op === '+'
        ? combineSumTerms(flat)
        : combineProductTerms(flat);
      // Sort operands by stable key
      combined.sort((a, b) => sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0);
      // Re-fold into a left-leaning tree
      if (combined.length === 1) return combined[0];
      let acc = combined[0];
      for (let i = 1; i < combined.length; i++) {
        acc = { type: 'binop', op, left: acc, right: combined[i] };
      }
      return acc;
    }
  }
}

// ---------------------------------------------------------------------------
// symbolicallyEqual
// ---------------------------------------------------------------------------

export function symbolicallyEqual(a: ExprNode, b: ExprNode): boolean {
  const ca = canonicalize(a);
  const cb = canonicalize(b);
  return JSON.stringify(ca) === JSON.stringify(cb);
}
