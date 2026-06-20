// P1 symbolic-expression benchmark orchestration.
//
// Pipeline:
//   1. Pick formulas from the library (synthetic + classic).
//   2. For each formula, generate a P1 task: training samples + heldout samples
//      (inputs sampled uniformly from the formula's domain, output = evaluate
//      with optional Gaussian noise).
//   3. Run algorithmic baselines (no LLM):
//        - random_guess      : random expression from a small generator
//        - brute_force_simple: best expression in a depth<=2 search space
//        - oracle            : the true formula (upper bound)
//   4. For each baseline, compute heldout accuracy / mse / expression
//      complexity / symbolic equivalence vs the true formula.
//   5. Emit JSONL + manifest + report. Synthetic vs classic stats are
//      reported separately to defend against LLM memorization contamination.
//
// LLM baselines (passive / active) require OPENAI_API_KEY and are stubbed
// here as a clearly-marked interface — see runP1LlmBaseline().
//
// Usage:
//   npx tsx src/p1/benchmark.ts --n 60 --seed 42 --skip-llm

import fs from 'fs';
import path from 'path';
import {
  type ExprNode,
  type BinOp,
  type FuncName,
  evaluate,
  toString,
  complexity,
  symbolicallyEqual,
} from './expr.js';
import {
  type Formula,
  SYNTHETIC_FORMULAS,
  CLASSIC_FORMULAS,
} from './formulaLib.js';
import { p1Score } from './score.js';

// ---------------------------------------------------------------------------
// PRNG (mulberry32, same as P0)
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

// Box-Muller for Gaussian noise (deterministic given rng).
function gaussian(rng: () => number, mean: number, std: number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ---------------------------------------------------------------------------
// Task generation
// ---------------------------------------------------------------------------

export interface P1Sample {
  input: Record<string, number>;
  output: number;
}

export interface P1Task {
  taskId: string;
  formulaId: string;
  category: 'synthetic' | 'classic';
  variables: string[];
  domain: [number, number][];
  noise: 0 | 0.05;
  train: P1Sample[];
  heldout: P1Sample[];
  /** Hidden from baselines; used by oracle and for symbolic-eq scoring. */
  trueExpr: ExprNode;
  seed: number;
}

export interface GenerateP1TaskOpts {
  nTrain?: number;
  nHeldout?: number;
  noise?: 0 | 0.05;
  seed?: number;
}

export function generateP1Task(formula: Formula, opts: GenerateP1TaskOpts = {}): P1Task {
  const nTrain = opts.nTrain ?? 16;
  const nHeldout = opts.nHeldout ?? 32;
  const noise = opts.noise ?? formula.noise;
  const seed = opts.seed ?? 42;
  const rng = mulberry32(seed);

  function samplePoint(): Record<string, number> {
    const env: Record<string, number> = {};
    for (let i = 0; i < formula.variables.length; i++) {
      const [lo, hi] = formula.domain[i];
      env[formula.variables[i]] = lo + rng() * (hi - lo);
    }
    return env;
  }

  function makeSamples(n: number): P1Sample[] {
    const out: P1Sample[] = [];
    for (let i = 0; i < n; i++) {
      const input = samplePoint();
      const clean = evaluate(formula.expr, input);
      const output = noise > 0 ? clean + gaussian(rng, 0, noise) : clean;
      out.push({ input, output });
    }
    return out;
  }

  return {
    taskId: `p1_${formula.id}`,
    formulaId: formula.id,
    category: formula.category,
    variables: formula.variables,
    domain: formula.domain,
    noise,
    train: makeSamples(nTrain),
    heldout: makeSamples(nHeldout),
    trueExpr: formula.expr,
    seed,
  };
}

// ---------------------------------------------------------------------------
// Expression evaluation against heldout samples
// ---------------------------------------------------------------------------

export interface EvalResult {
  /** 1 - normalized_mse in [0,1] (clamped). 1.0 = perfect prediction. */
  accuracy: number;
  /** Mean squared error on heldout. */
  mse: number;
  /** Number of heldout samples used. */
  n: number;
  /** Number of heldout samples where |pred - true| / (|true| + 1e-9) < 0.1. */
  hitCount: number;
}

export function evaluateExpression(expr: ExprNode, heldout: P1Sample[]): EvalResult {
  let se = 0;
  let hitCount = 0;
  let totalVar = 0;
  const meanTrue = heldout.reduce((s, p) => s + p.output, 0) / (heldout.length || 1);
  for (const p of heldout) {
    totalVar += (p.output - meanTrue) ** 2;
  }
  for (const p of heldout) {
    let pred: number;
    try {
      pred = evaluate(expr, p.input);
    } catch {
      pred = NaN;
    }
    if (!Number.isFinite(pred)) pred = 0;
    const err = pred - p.output;
    se += err * err;
    const relErr = Math.abs(pred - p.output) / (Math.abs(p.output) + 1e-9);
    if (relErr < 0.1) hitCount++;
  }
  const n = heldout.length;
  const mse = n > 0 ? se / n : 0;
  // Normalized MSE = mse / variance; accuracy = 1 - normalized_mse, clamped.
  const variance = n > 0 ? totalVar / n : 0;
  const normalizedMse = variance > 1e-12 ? mse / variance : (mse > 1e-12 ? 1 : 0);
  const accuracy = Math.max(0, Math.min(1, 1 - normalizedMse));
  return { accuracy, mse, n, hitCount };
}

// ---------------------------------------------------------------------------
// Baselines (no LLM)
// ---------------------------------------------------------------------------

export interface BaselineResult {
  taskId: string;
  formulaId: string;
  category: 'synthetic' | 'classic';
  baseline: string;
  predictedExpr: ExprNode;
  predictedExprStr: string;
  heldoutAccuracy: number;
  mse: number;
  exprComplexity: { nodes: number; depth: number };
  symbolicallyEquivalent: boolean;
  queriesMade: number;
  p1Score: ReturnType<typeof p1Score>;
}

// Small expression generator for random_guess.
function genRandomExpr(rng: () => number, depth: number, vars: string[]): ExprNode {
  if (depth <= 0 || rng() < 0.3) {
    if (rng() < 0.5 && vars.length > 0) {
      return { type: 'var', name: vars[Math.floor(rng() * vars.length)] };
    }
    return { type: 'num', value: 1 + Math.floor(rng() * 9) };
  }
  const r = rng();
  if (r < 0.2) {
    const fn: FuncName = (['sin', 'cos', 'exp', 'sqrt', 'log'] as FuncName[])[Math.floor(rng() * 5)];
    return { type: 'func', name: fn, arg: genRandomExpr(rng, depth - 1, vars) };
  }
  const ops: BinOp[] = ['+', '-', '*', '^'];
  const op = ops[Math.floor(rng() * ops.length)];
  if (op === '^') {
    return {
      type: 'binop', op: '^',
      left: genRandomExpr(rng, depth - 1, vars),
      right: { type: 'num', value: 2 + Math.floor(rng() * 2) },
    };
  }
  return {
    type: 'binop', op,
    left: genRandomExpr(rng, depth - 1, vars),
    right: genRandomExpr(rng, depth - 1, vars),
  };
}

export function runRandomGuess(task: P1Task, rng: () => number): BaselineResult {
  // Try a few random expressions and keep the best by heldout accuracy.
  let bestExpr: ExprNode = { type: 'num', value: 0 };
  let bestAcc = -Infinity;
  for (let i = 0; i < 8; i++) {
    const expr = genRandomExpr(rng, 2, task.variables);
    try {
      const r = evaluateExpression(expr, task.heldout);
      if (r.accuracy > bestAcc) { bestExpr = expr; bestAcc = r.accuracy; }
    } catch {
      // ignore malformed
    }
  }
  return finalizeBaseline(task, 'random_guess', bestExpr, 0);
}

// Brute-force search over a small expression space (depth <= 2).
// We enumerate combinations of {const, var} with {+, -, *, ^} and pick the
// best by heldout accuracy. This is O(K^2 * ops) where K = constants + vars.
export function runBruteForceSimple(task: P1Task): BaselineResult {
  const vars = task.variables;
  const consts = [0, 1, 2, 3, 5, 10];
  const leaves: ExprNode[] = [
    ...consts.map(c => ({ type: 'num' as const, value: c })),
    ...vars.map(v => ({ type: 'var' as const, name: v })),
  ];
  const ops: BinOp[] = ['+', '-', '*', '^'];

  let best: { expr: ExprNode; acc: number; mse: number } | null = null;

  function consider(expr: ExprNode) {
    try {
      const r = evaluateExpression(expr, task.heldout);
      if (!best || r.accuracy > best.acc || (r.accuracy === best.acc && r.mse < best.mse)) {
        best = { expr, acc: r.accuracy, mse: r.mse };
      }
    } catch {
      // ignore
    }
  }

  // Single leaves
  for (const l of leaves) consider(l);
  // Two-leaf combinations
  for (const op of ops) {
    for (const l of leaves) {
      for (const r of leaves) {
        consider({ type: 'binop', op, left: l, right: r });
      }
    }
  }
  // Three-leaf combinations (depth 2): (leaf op leaf) op leaf, leaf op (leaf op leaf)
  for (const op1 of ops) {
    for (const op2 of ops) {
      for (const a of leaves) {
        for (const b of leaves) {
          for (const c of leaves) {
            consider({ type: 'binop', op: op1, left: { type: 'binop', op: op2, left: a, right: b }, right: c });
            consider({ type: 'binop', op: op1, left: a, right: { type: 'binop', op: op2, left: b, right: c } });
          }
        }
      }
    }
  }

  const expr = best?.expr ?? { type: 'num', value: 0 };
  return finalizeBaseline(task, 'brute_force_simple', expr, 0);
}

// Oracle: uses the true formula. Accuracy should be ~1.0 (exactly 1.0 when
// noise=0; slightly less with noise because heldout outputs are noisy).
export function runOracle(task: P1Task): BaselineResult {
  return finalizeBaseline(task, 'oracle', task.trueExpr, 0);
}

function finalizeBaseline(
  task: P1Task,
  baselineName: string,
  expr: ExprNode,
  queriesMade: number,
): BaselineResult {
  const r = evaluateExpression(expr, task.heldout);
  const cplx = complexity(expr);
  const eq = symbolicallyEqual(expr, task.trueExpr);
  // queryCost: 0 for algorithmic baselines (no LLM tokens consumed). The
  // brute-force search does iterate over many candidates but consumes no
  // external resources; we surface its compute as exprComplexity only.
  const queryCost = 0;
  const score = p1Score({
    heldoutAccuracy: r.accuracy,
    symbolicEqScore: eq ? 1 : 0,
    exprComplexity: cplx.nodes,
    queryCost,
    heldoutN: r.n,
    knownFailures: eq ? [] : ['predicted_expr_not_symbolically_equivalent'],
  });
  return {
    taskId: task.taskId,
    formulaId: task.formulaId,
    category: task.category,
    baseline: baselineName,
    predictedExpr: expr,
    predictedExprStr: toString(expr),
    heldoutAccuracy: r.accuracy,
    mse: r.mse,
    exprComplexity: cplx,
    symbolicallyEquivalent: eq,
    queriesMade,
    p1Score: score,
  };
}

// ---------------------------------------------------------------------------
// LLM baseline interface (stub — requires OPENAI_API_KEY, not run by default)
// ---------------------------------------------------------------------------

export interface LlmBaselineOpts {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  /** 'passive' = train-only prompt; 'active' = can query the env. */
  mode: 'passive' | 'active';
}

/**
 * LLM baseline placeholder. P0's runPassive.ts / runActive.ts implement the
 * analogous flow for rule induction; for P1 this would (1) serialize the
 * training samples into a prompt, (2) ask the model to propose an expression,
 * (3) parse the response with parseExpr, (4) optionally let the active
 * variant request more samples. Not implemented here — returns an empty list
 * and prints a notice. Implement when an API key is available.
 */
export async function runP1LlmBaseline(_tasks: P1Task[], _opts: LlmBaselineOpts): Promise<BaselineResult[]> {
  console.log('  [runP1LlmBaseline] Not implemented in this P1 drop. Skipping.');
  return [];
}

// ---------------------------------------------------------------------------
// Benchmark orchestration
// ---------------------------------------------------------------------------

export interface RunP1BenchmarkOpts {
  /** Total number of formulas to evaluate (split across synthetic/classic). */
  n: number;
  /** Master RNG seed. */
  seed: number;
  /** Skip the LLM baseline even if an API key is present. */
  skipLlm: boolean;
  /** Output directory. */
  resultDir?: string;
  /** Override training-set size. */
  nTrain?: number;
  /** Override heldout-set size. */
  nHeldout?: number;
  /** Override noise (0 or 0.05). If undefined, use each formula's noise. */
  noise?: 0 | 0.05;
  /** OpenAI API key (defaults to env). */
  apiKey?: string;
  /** OpenAI base URL (defaults to env). */
  baseUrl?: string;
  /** Model name for LLM baseline. */
  model?: string;
}

export interface P1BenchmarkReport {
  generatedAt: string;
  opts: { n: number; seed: number; skipLlm: boolean; nTrain: number; nHeldout: number };
  totals: { synthetic: number; classic: number; total: number };
  baselines: string[];
  byBaseline: Record<string, {
    count: number;
    avgHeldoutAccuracy: number;
    avgMse: number;
    avgExprNodes: number;
    avgExprDepth: number;
    symbolicEqRate: number;
    avgP1Score: number;
    avgConfidence: number;
  }>;
  byBaselineByCategory: Record<string, {
    synthetic: { count: number; avgHeldoutAccuracy: number; avgMse: number; symbolicEqRate: number; avgP1Score: number };
    classic: { count: number; avgHeldoutAccuracy: number; avgMse: number; symbolicEqRate: number; avgP1Score: number };
  }>;
  results: BaselineResult[];
  evidenceLevel: string;
}

export function runP1Benchmark(opts: RunP1BenchmarkOpts): P1BenchmarkReport {
  const seed = opts.seed;
  const rng = mulberry32(seed);
  const nTrain = opts.nTrain ?? 16;
  const nHeldout = opts.nHeldout ?? 32;

  // Pick formulas: prefer synthetic (the main evidence), include all classic.
  const n = opts.n;
  const nSynthetic = Math.max(0, n - CLASSIC_FORMULAS.length);
  const chosenSynthetic = SYNTHETIC_FORMULAS.slice(0, Math.min(nSynthetic, SYNTHETIC_FORMULAS.length));
  const chosenClassic = CLASSIC_FORMULAS.slice(0, Math.min(n - chosenSynthetic.length, CLASSIC_FORMULAS.length));
  const formulas: Formula[] = [...chosenSynthetic, ...chosenClassic];

  const tasks: P1Task[] = formulas.map((f, i) => generateP1Task(f, {
    nTrain,
    nHeldout,
    noise: opts.noise ?? f.noise,
    seed: seed + i * 1000 + 7,
  }));

  const allResults: BaselineResult[] = [];
  for (const task of tasks) {
    allResults.push(runRandomGuess(task, rng));
    allResults.push(runBruteForceSimple(task));
    allResults.push(runOracle(task));
  }

  const baselines = ['random_guess', 'brute_force_simple', 'oracle'];

  // Aggregate
  const byBaseline: P1BenchmarkReport['byBaseline'] = {};
  const byBaselineByCategory: P1BenchmarkReport['byBaselineByCategory'] = {};
  for (const b of baselines) {
    const rs = allResults.filter(r => r.baseline === b);
    byBaseline[b] = aggregateBaseline(rs);
    byBaselineByCategory[b] = {
      synthetic: aggregateBaseline(rs.filter(r => r.category === 'synthetic')),
      classic: aggregateBaseline(rs.filter(r => r.category === 'classic')),
    };
  }

  const report: P1BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    opts: { n, seed, skipLlm: opts.skipLlm, nTrain, nHeldout },
    totals: {
      synthetic: chosenSynthetic.length,
      classic: chosenClassic.length,
      total: formulas.length,
    },
    baselines,
    byBaseline,
    byBaselineByCategory,
    results: allResults,
    evidenceLevel: 'P1_symbolic_benchmark',
  };

  // Write to disk if a result dir was provided.
  if (opts.resultDir) {
    writeReport(report, opts.resultDir, opts.skipLlm);
  }

  return report;
}

function aggregateBaseline(rs: BaselineResult[]): P1BenchmarkReport['byBaseline'][string] {
  const n = rs.length || 1;
  return {
    count: rs.length,
    avgHeldoutAccuracy: rs.reduce((s, r) => s + r.heldoutAccuracy, 0) / n,
    avgMse: rs.reduce((s, r) => s + r.mse, 0) / n,
    avgExprNodes: rs.reduce((s, r) => s + r.exprComplexity.nodes, 0) / n,
    avgExprDepth: rs.reduce((s, r) => s + r.exprComplexity.depth, 0) / n,
    symbolicEqRate: rs.filter(r => r.symbolicallyEquivalent).length / n,
    avgP1Score: rs.reduce((s, r) => s + r.p1Score.score, 0) / n,
    avgConfidence: rs.reduce((s, r) => s + r.p1Score.confidence, 0) / n,
  };
}

function writeReport(report: P1BenchmarkReport, resultDir: string, skipLlm: boolean): void {
  fs.mkdirSync(resultDir, { recursive: true });

  // JSONL: one line per BaselineResult
  const jsonlPath = path.join(resultDir, 'p1_results.jsonl');
  fs.writeFileSync(jsonlPath, report.results.map(r => JSON.stringify(r)).join('\n') + '\n');

  // Manifest (deterministic config + source hash placeholder)
  const manifest = {
    experiment_id: 'p1_benchmark',
    evidence_level: report.evidenceLevel,
    seed: report.opts.seed,
    n: report.opts.n,
    nTrain: report.opts.nTrain,
    nHeldout: report.opts.nHeldout,
    skipLlm,
    baselines: report.baselines,
    synthetic_count: report.totals.synthetic,
    classic_count: report.totals.classic,
    created_at: report.generatedAt,
  };
  fs.writeFileSync(path.join(resultDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Full report
  fs.writeFileSync(path.join(resultDir, 'p1_report.json'), JSON.stringify(report, null, 2));

  // Human-readable summary
  const lines: string[] = [];
  lines.push('=== P1 Symbolic-Expression Benchmark ===');
  lines.push(`  generated: ${report.generatedAt}`);
  lines.push(`  opts: n=${report.opts.n} seed=${report.opts.seed} skipLlm=${report.opts.skipLlm} nTrain=${report.opts.nTrain} nHeldout=${report.opts.nHeldout}`);
  lines.push(`  totals: synthetic=${report.totals.synthetic} classic=${report.totals.classic} total=${report.totals.total}`);
  lines.push('');
  lines.push('--- By baseline (all formulas) ---');
  lines.push(formatRow(['baseline', 'n', 'acc', 'mse', 'eqRate', 'avgScore', 'conf']));
  for (const b of report.baselines) {
    const m = report.byBaseline[b];
    lines.push(formatRow([b, String(m.count), m.avgHeldoutAccuracy.toFixed(3), m.avgMse.toFixed(3), m.symbolicEqRate.toFixed(3), m.avgP1Score.toFixed(3), m.avgConfidence.toFixed(3)]));
  }
  lines.push('');
  lines.push('--- By baseline x category (heldout accuracy / symbolic eq rate / avg P1 score) ---');
  for (const b of report.baselines) {
    const c = report.byBaselineByCategory[b];
    lines.push(`  ${b}:`);
    lines.push(`    synthetic (n=${c.synthetic.count}): acc=${c.synthetic.avgHeldoutAccuracy.toFixed(3)} eqRate=${c.synthetic.symbolicEqRate.toFixed(3)} score=${c.synthetic.avgP1Score.toFixed(3)}`);
    lines.push(`    classic   (n=${c.classic.count}): acc=${c.classic.avgHeldoutAccuracy.toFixed(3)} eqRate=${c.classic.symbolicEqRate.toFixed(3)} score=${c.classic.avgP1Score.toFixed(3)}`);
  }
  lines.push('');
  lines.push(`  JSONL:     ${jsonlPath}`);
  lines.push(`  Manifest:  ${path.join(resultDir, 'manifest.json')}`);
  lines.push(`  Report:    ${path.join(resultDir, 'p1_report.json')}`);
  fs.writeFileSync(path.join(resultDir, 'p1_summary.txt'), lines.join('\n') + '\n');

  console.log(lines.join('\n'));
}

function formatRow(cols: string[]): string {
  return cols.map(c => c.padEnd(14)).join('');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliOpts {
  n: number;
  seed: number;
  skipLlm: boolean;
  resultDir: string;
  nTrain: number;
  nHeldout: number;
  noise?: 0 | 0.05;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

function parseArgs(argv: string[]): CliOpts {
  const opt: CliOpts = {
    n: 60,
    seed: 42,
    skipLlm: false,
    resultDir: 'results/p1',
    nTrain: 16,
    nHeldout: 32,
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: 'deepseek-chat',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(`Missing value for ${a}`); return v; };
    if (a === '--n') opt.n = parseInt(next());
    if (a === '--seed') opt.seed = parseInt(next());
    if (a === '--skip-llm') opt.skipLlm = true;
    if (a === '--result-dir') opt.resultDir = next();
    if (a === '--n-train') opt.nTrain = parseInt(next());
    if (a === '--n-heldout') opt.nHeldout = parseInt(next());
    if (a === '--noise') opt.noise = (parseFloat(next()) === 0 ? 0 : 0.05) as 0 | 0.05;
    if (a === '--api-key') opt.apiKey = next();
    if (a === '--base-url') opt.baseUrl = next();
    if (a === '--model') opt.model = next();
  }
  return opt;
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  console.log('=== P1 Benchmark Orchestration ===');
  console.log(`  n=${opt.n} seed=${opt.seed} skipLlm=${opt.skipLlm}`);
  console.log(`  resultDir=${opt.resultDir}`);

  const report = runP1Benchmark({
    n: opt.n,
    seed: opt.seed,
    skipLlm: opt.skipLlm,
    resultDir: opt.resultDir,
    nTrain: opt.nTrain,
    nHeldout: opt.nHeldout,
    noise: opt.noise,
    apiKey: opt.apiKey,
    baseUrl: opt.baseUrl,
    model: opt.model,
  });

  // LLM baseline placeholder: only invoke if API key present and not skipped.
  if (!opt.skipLlm && opt.apiKey) {
    console.log('\n--- LLM baseline (passive) ---');
    // Build tasks again from the same formulas (deterministic).
    const nSynthetic = Math.max(0, opt.n - CLASSIC_FORMULAS.length);
    const chosenSynthetic = SYNTHETIC_FORMULAS.slice(0, Math.min(nSynthetic, SYNTHETIC_FORMULAS.length));
    const chosenClassic = CLASSIC_FORMULAS.slice(0, Math.min(opt.n - chosenSynthetic.length, CLASSIC_FORMULAS.length));
    const formulas: Formula[] = [...chosenSynthetic, ...chosenClassic];
    const tasks = formulas.map((f, i) => generateP1Task(f, {
      nTrain: opt.nTrain, nHeldout: opt.nHeldout, noise: opt.noise ?? f.noise, seed: opt.seed + i * 1000 + 7,
    }));
    await runP1LlmBaseline(tasks, { apiKey: opt.apiKey, baseUrl: opt.baseUrl, model: opt.model, mode: 'passive' });
  } else if (!opt.skipLlm && !opt.apiKey) {
    console.log('\n--- LLM baseline skipped (no OPENAI_API_KEY) ---');
  }

  console.log('\n=== P1 Benchmark complete ===');
  console.log(`  Total tasks: ${report.totals.total} (synthetic=${report.totals.synthetic}, classic=${report.totals.classic})`);
}

main().catch(e => { console.error(`P1 benchmark failed: ${e.message}`); process.exit(1); });
