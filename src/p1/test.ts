// P1 unit tests.
// Run with: npx tsx src/p1/test.ts

import {
  parseExpr,
  evaluate,
  toString,
  complexity,
  canonicalize,
  symbolicallyEqual,
} from './expr.js';
import { p1Score } from './score.js';
import {
  SYNTHETIC_FORMULAS,
  CLASSIC_FORMULAS,
  libraryStats,
} from './formulaLib.js';
import { generateP1Task, evaluateExpression } from './benchmark.js';

let pass = 0;
let fail = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { pass++; }
  else { fail++; console.error(`  FAIL: ${msg}`); }
}

function approxEq(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

// ---------------------------------------------------------------------------
// expr.ts: parseExpr + evaluate
// ---------------------------------------------------------------------------

function testParseAndEvaluate(): void {
  console.log('Testing parseExpr + evaluate...');

  // 3*x+2 at x=4 -> 14
  const e1 = parseExpr('3*x+2');
  assert(approxEq(evaluate(e1, { x: 4 }), 14), `3*x+2 at x=4 should be 14, got ${evaluate(e1, { x: 4 })}`);

  // x^2 at x=5 -> 25
  const e2 = parseExpr('x^2');
  assert(approxEq(evaluate(e2, { x: 5 }), 25), `x^2 at x=5 should be 25, got ${evaluate(e2, { x: 5 })}`);

  // m*c^2 at m=2, c=3 -> 18
  const e3 = parseExpr('m*c^2');
  assert(approxEq(evaluate(e3, { m: 2, c: 3 }), 18), `m*c^2 at m=2,c=3 should be 18, got ${evaluate(e3, { m: 2, c: 3 })}`);

  // 0.5*m*v^2 at m=2, v=3 -> 9
  const e4 = parseExpr('0.5*m*v^2');
  assert(approxEq(evaluate(e4, { m: 2, v: 3 }), 9), `0.5*m*v^2 at m=2,v=3 should be 9, got ${evaluate(e4, { m: 2, v: 3 })}`);

  // sin(x) at x=0 -> 0
  const e5 = parseExpr('sin(x)');
  assert(approxEq(evaluate(e5, { x: 0 }), 0), `sin(0) should be 0, got ${evaluate(e5, { x: 0 })}`);

  // Implicit multiplication: 3x at x=4 -> 12
  const e6 = parseExpr('3x');
  assert(approxEq(evaluate(e6, { x: 4 }), 12), `3x (implicit) at x=4 should be 12, got ${evaluate(e6, { x: 4 })}`);

  // Parentheses: (a+b)*c at a=1,b=2,c=3 -> 9
  const e7 = parseExpr('(a+b)*c');
  assert(approxEq(evaluate(e7, { a: 1, b: 2, c: 3 }), 9), `(a+b)*c at a=1,b=2,c=3 should be 9, got ${evaluate(e7, { a: 1, b: 2, c: 3 })}`);

  // Unary minus: -x at x=5 -> -5
  const e8 = parseExpr('-x');
  assert(approxEq(evaluate(e8, { x: 5 }), -5), `-x at x=5 should be -5, got ${evaluate(e8, { x: 5 })}`);

  // Division: 1/T at T=4 -> 0.25
  const e9 = parseExpr('1/T');
  assert(approxEq(evaluate(e9, { T: 4 }), 0.25), `1/T at T=4 should be 0.25, got ${evaluate(e9, { T: 4 })}`);

  // r^1.5 at r=4 -> 8
  const e10 = parseExpr('r^1.5');
  assert(approxEq(evaluate(e10, { r: 4 }), 8), `r^1.5 at r=4 should be 8, got ${evaluate(e10, { r: 4 })}`);

  console.log('  parseExpr + evaluate tests done.');
}

// ---------------------------------------------------------------------------
// expr.ts: toString round-trip
// ---------------------------------------------------------------------------

function testToString(): void {
  console.log('Testing toString...');
  const cases: [string, string][] = [
    ['3*x+2', '3*x+2'],
    ['x^2', 'x^2'],
    ['m*c^2', 'm*c^2'],
  ];
  for (const [input, _expected] of cases) {
    const node = parseExpr(input);
    const s = toString(node);
    // Round-trip: re-parse and check equality
    const re = parseExpr(s);
    assert(symbolicallyEqual(node, re), `toString round-trip failed for "${input}" -> "${s}"`);
  }
  console.log('  toString tests done.');
}

// ---------------------------------------------------------------------------
// expr.ts: complexity
// ---------------------------------------------------------------------------

function testComplexity(): void {
  console.log('Testing complexity...');
  // 3*x+2: binop(+, binop(*, 3, x), 2) -> 5 nodes, depth 3
  const c1 = complexity(parseExpr('3*x+2'));
  assert(c1.nodes === 5, `3*x+2 should have 5 nodes, got ${c1.nodes}`);
  assert(c1.depth === 3, `3*x+2 should have depth 3, got ${c1.depth}`);

  // x: 1 node, depth 1
  const c2 = complexity(parseExpr('x'));
  assert(c2.nodes === 1, `x should have 1 node, got ${c2.nodes}`);
  assert(c2.depth === 1, `x should have depth 1, got ${c2.depth}`);

  // sin(x): 2 nodes, depth 2
  const c3 = complexity(parseExpr('sin(x)'));
  assert(c3.nodes === 2, `sin(x) should have 2 nodes, got ${c3.nodes}`);
  assert(c3.depth === 2, `sin(x) should have depth 2, got ${c3.depth}`);

  // m*c^2: binop(*, m, binop(^, c, 2)) -> 5 nodes, depth 3
  const c4 = complexity(parseExpr('m*c^2'));
  assert(c4.nodes === 5, `m*c^2 should have 5 nodes, got ${c4.nodes}`);
  assert(c4.depth === 3, `m*c^2 should have depth 3, got ${c4.depth}`);

  console.log('  complexity tests done.');
}

// ---------------------------------------------------------------------------
// expr.ts: symbolicallyEqual + canonicalize
// ---------------------------------------------------------------------------

function testSymbolicallyEqual(): void {
  console.log('Testing symbolicallyEqual + canonicalize...');

  // x+y == y+x
  assert(symbolicallyEqual(parseExpr('x+y'), parseExpr('y+x')), 'x+y should equal y+x');

  // 2*x == x*2
  assert(symbolicallyEqual(parseExpr('2*x'), parseExpr('x*2')), '2*x should equal x*2');

  // x+x == 2*x
  assert(symbolicallyEqual(parseExpr('x+x'), parseExpr('2*x')), 'x+x should equal 2*x');

  // a*b == b*a
  assert(symbolicallyEqual(parseExpr('a*b'), parseExpr('b*a')), 'a*b should equal b*a');

  // x*y + y*x == 2*x*y
  assert(symbolicallyEqual(parseExpr('x*y+y*x'), parseExpr('2*x*y')), 'x*y+y*x should equal 2*x*y');

  // x+0 == x
  assert(symbolicallyEqual(parseExpr('x+0'), parseExpr('x')), 'x+0 should equal x');

  // x*1 == x
  assert(symbolicallyEqual(parseExpr('x*1'), parseExpr('x')), 'x*1 should equal x');

  // x^1 == x
  assert(symbolicallyEqual(parseExpr('x^1'), parseExpr('x')), 'x^1 should equal x');

  // x^0 == 1
  assert(symbolicallyEqual(parseExpr('x^0'), parseExpr('1')), 'x^0 should equal 1');

  // 2*x + 3*x == 5*x
  assert(symbolicallyEqual(parseExpr('2*x+3*x'), parseExpr('5*x')), '2*x+3*x should equal 5*x');

  // NOT equal: x+y != x*y
  assert(!symbolicallyEqual(parseExpr('x+y'), parseExpr('x*y')), 'x+y should NOT equal x*y');

  // NOT equal: x^2 != x
  assert(!symbolicallyEqual(parseExpr('x^2'), parseExpr('x')), 'x^2 should NOT equal x');

  // canonicalize returns a node (smoke test)
  const c = canonicalize(parseExpr('3*x+2'));
  assert(c.type === 'binop', 'canonicalize(3*x+2) should return a binop');

  console.log('  symbolicallyEqual + canonicalize tests done.');
}

// ---------------------------------------------------------------------------
// score.ts: p1Score
// ---------------------------------------------------------------------------

function testP1Score(): void {
  console.log('Testing p1Score...');
  const out = p1Score({
    heldoutAccuracy: 0.9,
    symbolicEqScore: 1.0,
    exprComplexity: 5,
    queryCost: 2,
    heldoutN: 32,
    knownFailures: [],
  });
  assert(out.evidenceLevel === 'P1_symbolic_benchmark', `evidenceLevel should be P1_symbolic_benchmark, got ${out.evidenceLevel}`);
  assert(out.confidence > 0 && out.confidence <= 0.95, `confidence should be in (0, 0.95], got ${out.confidence}`);
  // score = 1.0*0.9 + 0.5*1.0 - 0.05*5 - 0.1*2 = 0.9 + 0.5 - 0.25 - 0.2 = 0.95
  assert(approxEq(out.score, 0.95, 1e-6), `score should be 0.95, got ${out.score}`);
  assert(Array.isArray(out.knownFailures), 'knownFailures should be an array');

  // With known failures
  const out2 = p1Score({
    heldoutAccuracy: 0.5,
    symbolicEqScore: 0,
    exprComplexity: 10,
    queryCost: 5,
    heldoutN: 10,
    knownFailures: ['not_equivalent'],
  });
  assert(out2.knownFailures.length === 1, 'knownFailures should have 1 entry');
  assert(out2.score < out.score, 'worse inputs should produce lower score');

  console.log('  p1Score tests done.');
}

// ---------------------------------------------------------------------------
// formulaLib.ts: counts + structure
// ---------------------------------------------------------------------------

function testFormulaLib(): void {
  console.log('Testing formulaLib...');
  assert(SYNTHETIC_FORMULAS.length >= 50, `SYNTHETIC_FORMULAS should have >= 50 entries, got ${SYNTHETIC_FORMULAS.length}`);
  assert(CLASSIC_FORMULAS.length >= 10, `CLASSIC_FORMULAS should have >= 10 entries, got ${CLASSIC_FORMULAS.length}`);

  // Every formula has valid fields
  for (const f of SYNTHETIC_FORMULAS) {
    assert(f.category === 'synthetic', `synthetic formula ${f.id} should have category 'synthetic'`);
    assert(f.variables.length >= 1, `formula ${f.id} should have >= 1 variable`);
    assert(f.domain.length === f.variables.length, `formula ${f.id} domain/variable length mismatch`);
    assert(f.noise === 0 || f.noise === 0.05, `formula ${f.id} noise should be 0 or 0.05`);
  }
  for (const f of CLASSIC_FORMULAS) {
    assert(f.category === 'classic', `classic formula ${f.id} should have category 'classic'`);
    assert(typeof f.name === 'string' && f.name.length > 0, `classic formula ${f.id} should have a name`);
  }

  // Spot-check a classic formula: y=2x+1 at x=3 -> 7
  const linear = CLASSIC_FORMULAS.find(f => f.id === 'cls_linear')!;
  assert(approxEq(evaluate(linear.expr, { x: 3 }), 7), `cls_linear at x=3 should be 7, got ${evaluate(linear.expr, { x: 3 })}`);

  // E=m*c^2 at m=2, c=3 -> 18
  const me = CLASSIC_FORMULAS.find(f => f.id === 'cls_mass_energy')!;
  assert(approxEq(evaluate(me.expr, { m: 2, c: 3 }), 18), `cls_mass_energy at m=2,c=3 should be 18, got ${evaluate(me.expr, { m: 2, c: 3 })}`);

  // Library stats smoke test
  const stats = libraryStats();
  assert(stats.syntheticCount === SYNTHETIC_FORMULAS.length, 'stats.syntheticCount mismatch');
  assert(stats.classicCount === CLASSIC_FORMULAS.length, 'stats.classicCount mismatch');

  console.log('  formulaLib tests done.');
}

// ---------------------------------------------------------------------------
// benchmark.ts: generateP1Task + evaluateExpression
// ---------------------------------------------------------------------------

function testBenchmark(): void {
  console.log('Testing generateP1Task + evaluateExpression...');
  const formula = CLASSIC_FORMULAS.find(f => f.id === 'cls_linear')!; // y=2x+1
  const task = generateP1Task(formula, { nTrain: 10, nHeldout: 20, noise: 0, seed: 42 });
  assert(task.train.length === 10, `train should have 10 samples, got ${task.train.length}`);
  assert(task.heldout.length === 20, `heldout should have 20 samples, got ${task.heldout.length}`);
  assert(task.category === 'classic', `category should be classic, got ${task.category}`);
  assert(task.formulaId === 'cls_linear', `formulaId should be cls_linear, got ${task.formulaId}`);

  // With noise=0, the true formula should achieve accuracy=1.0
  const evalRes = evaluateExpression(task.trueExpr, task.heldout);
  assert(approxEq(evalRes.accuracy, 1.0, 1e-6), `true formula should have accuracy 1.0 on clean heldout, got ${evalRes.accuracy}`);
  assert(approxEq(evalRes.mse, 0, 1e-9), `true formula should have mse 0 on clean heldout, got ${evalRes.mse}`);

  // A wrong formula should have lower accuracy
  const wrong = parseExpr('x+10');
  const wrongRes = evaluateExpression(wrong, task.heldout);
  assert(wrongRes.accuracy < 1.0, `wrong formula should have accuracy < 1.0, got ${wrongRes.accuracy}`);

  console.log('  generateP1Task + evaluateExpression tests done.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== P1 Unit Tests ===\n');
  try {
    testParseAndEvaluate();
    testToString();
    testComplexity();
    testSymbolicallyEqual();
    testP1Score();
    testFormulaLib();
    testBenchmark();
    console.log(`\n=== P1 Tests Complete: ${pass} passed, ${fail} failed ===`);
    if (fail > 0) process.exit(1);
  } catch (e: any) {
    console.error(`\nERROR: ${e.message}`);
    process.exit(1);
  }
}

main();
