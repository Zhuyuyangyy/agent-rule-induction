// P4 Candidate Parser
// Parses simple expression strings (as from a simulated LLM) into SymExpr ASTs.
// Handles: +, -, *, /, ^, sin, cos, sqrt, parentheses, numeric constants,
// and named variables.

import {
  type SymExpr,
  C, V, Add, Sub, Mul, Div, Pow, Sin, Cos, Sqrt, Neg,
} from '../p1/symbolicExpr.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParseResult {
  success: boolean;
  expr: SymExpr | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenType = 'NUMBER' | 'IDENT' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number (integer or decimal)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
      let num = '';
      let hasDot = false;
      while (i < input.length && (/[0-9]/.test(input[i]) || (input[i] === '.' && !hasDot))) {
        if (input[i] === '.') hasDot = true;
        num += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: num, pos: i - num.length });
      continue;
    }

    // Identifier (variable name or function name)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      tokens.push({ type: 'IDENT', value: ident, pos: i - ident.length });
      continue;
    }

    // Operators and punctuation
    if (ch === '+') { tokens.push({ type: 'OP', value: '+', pos: i }); i++; continue; }
    if (ch === '-') { tokens.push({ type: 'OP', value: '-', pos: i }); i++; continue; }
    if (ch === '*') { tokens.push({ type: 'OP', value: '*', pos: i }); i++; continue; }
    if (ch === '/') { tokens.push({ type: 'OP', value: '/', pos: i }); i++; continue; }
    if (ch === '^') { tokens.push({ type: 'OP', value: '^', pos: i }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(', pos: i }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')', pos: i }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',', pos: i }); i++; continue; }

    // Unknown character
    return [{ type: 'EOF', value: '', pos: i }]; // Signal error by returning early
  }

  tokens.push({ type: 'EOF', value: '', pos: input.length });
  return tokens;
}

// ---------------------------------------------------------------------------
// Recursive Descent Parser
// ---------------------------------------------------------------------------

class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', pos: -1 };
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: TokenType, value?: string): Token | null {
    const t = this.peek();
    if (t.type !== type) return null;
    if (value !== undefined && t.value !== value) return null;
    return this.advance();
  }

  /**
   * expr = addSub
   */
  parseExpr(): SymExpr | null {
    return this.parseAddSub();
  }

  /**
   * addSub = mulDiv (('+' | '-') mulDiv)*
   */
  private parseAddSub(): SymExpr | null {
    let left = this.parseMulDiv();
    if (left === null) return null;

    while (this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value as '+' | '-';
      const right = this.parseMulDiv();
      if (right === null) return null;
      left = op === '+' ? Add(left, right) : Sub(left, right);
    }

    return left;
  }

  /**
   * mulDiv = unary (('*' | '/') unary)*
   */
  private parseMulDiv(): SymExpr | null {
    let left = this.parseUnary();
    if (left === null) return null;

    while (this.peek().type === 'OP' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.advance().value as '*' | '/';
      const right = this.parseUnary();
      if (right === null) return null;
      left = op === '*' ? Mul(left, right) : Div(left, right);
    }

    return left;
  }

  /**
   * unary = '-' unary | power
   */
  private parseUnary(): SymExpr | null {
    if (this.peek().type === 'OP' && this.peek().value === '-') {
      this.advance();
      const arg = this.parseUnary();
      if (arg === null) return null;
      return Neg(arg);
    }
    return this.parsePower();
  }

  /**
   * power = primary ('^' unary)?
   */
  private parsePower(): SymExpr | null {
    const base = this.parsePrimary();
    if (base === null) return null;

    if (this.peek().type === 'OP' && this.peek().value === '^') {
      this.advance();
      const exp = this.parseUnary();
      if (exp === null) return null;
      return Pow(base, exp);
    }

    return base;
  }

  /**
   * primary = NUMBER | IDENT | IDENT '(' expr ')' | '(' expr ')'
   */
  private parsePrimary(): SymExpr | null {
    const t = this.peek();

    // Number literal
    if (t.type === 'NUMBER') {
      this.advance();
      const val = parseFloat(t.value);
      if (!Number.isFinite(val)) return null;
      return C(val);
    }

    // Identifier: could be variable or function call
    if (t.type === 'IDENT') {
      this.advance();
      const name = t.value;

      // Check if it's a function call
      if (this.peek().type === 'LPAREN') {
        this.advance(); // consume '('
        const arg = this.parseExpr();
        if (arg === null) return null;
        if (!this.expect('RPAREN')) return null; // missing closing paren

        switch (name) {
          case 'sin': return Sin(arg);
          case 'cos': return Cos(arg);
          case 'sqrt': return Sqrt(arg);
          default:
            // Unknown function - treat as error
            return null;
        }
      }

      // It's a variable
      return V(name);
    }

    // Parenthesized expression
    if (t.type === 'LPAREN') {
      this.advance(); // consume '('
      const inner = this.parseExpr();
      if (inner === null) return null;
      if (!this.expect('RPAREN')) return null; // missing closing paren
      return inner;
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a candidate expression string into a SymExpr AST.
 *
 * Supported syntax:
 *   - Binary operators: +, -, *, /, ^
 *   - Unary operators: - (negation)
 *   - Functions: sin(x), cos(x), sqrt(x)
 *   - Parentheses: (expr)
 *   - Numeric constants: 1, 2.5, 0.5
 *   - Named variables: m, a, v0, omega, etc.
 *
 * @param raw - The candidate expression string
 * @returns ParseResult with success status, parsed expression, and optional error
 */
export function parseCandidate(raw: string): ParseResult {
  if (!raw || raw.trim().length === 0) {
    return { success: false, expr: null, error: 'Empty expression' };
  }

  const tokens = tokenize(raw);

  // Check for tokenization errors (if we got only EOF, something went wrong)
  if (tokens.length === 1 && tokens[0].type === 'EOF') {
    return { success: false, expr: null, error: `Tokenization failed for: "${raw}"` };
  }

  const parser = new Parser(tokens);
  const expr = parser.parseExpr();

  if (expr === null) {
    return { success: false, expr: null, error: `Parse error in: "${raw}"` };
  }

  // Check that we consumed all tokens
  const remaining = parser['peek']();
  if (remaining.type !== 'EOF') {
    return { success: false, expr: null, error: `Unexpected token after expression in: "${raw}"` };
  }

  return { success: true, expr, error: null };
}

/**
 * Batch parse multiple candidate strings.
 * Returns results in the same order as input.
 */
export function parseCandidates(raws: string[]): ParseResult[] {
  return raws.map(raw => parseCandidate(raw));
}
