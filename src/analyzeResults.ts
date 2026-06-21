import fs from 'fs';
import path from 'path';
import { RuleInductionEnv, computeGreedyOptimalQuery, computeRandomQuery } from './env.js';
import { computeAllMetrics, computeFailureType, loadResults, type Metrics, type FailureType } from './metrics.js';
import type { Task } from './taskGenerator.js';
import type { RunResult } from './runActive.js';
import { OutputManager, type ExperimentContext, type ResultRecord } from './apiSafety.js';

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------------
// Algorithmic baselines (no API needed)
// ---------------------------------------------------------------------------

export function runRandomBaseline(tasks: Task[], seed: number = 42): RunResult[] {
  const rng = mulberry32(seed);
  return tasks.map(task => {
    const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
    const queryResults: any[] = [];
    while (!env.isDone()) { const x = computeRandomQuery(env, rng); const qr = env.query(x); queryResults.push(qr); }
    const vs = env.versionSpace;
    const predictedRuleId = vs.length > 0 ? vs[Math.floor(rng() * vs.length)] : null;
    return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: predictedRuleId === task.trueRuleId, queriesMade: env.queriesMade, finalVersionSpaceSize: vs.length, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: [], queryResults, config: { model: 'random_baseline', maxQueries: 6, temperature: 0, seed } };
  });
}

export function runGreedyBaseline(tasks: Task[]): RunResult[] {
  return tasks.map(task => {
    const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
    const queryResults: any[] = [];
    while (!env.isDone()) { const x = computeGreedyOptimalQuery(env); const qr = env.query(x); queryResults.push(qr); }
    const vs = env.versionSpace;
    const predictedRuleId = vs.length > 0 ? vs[0] : null;
    return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: predictedRuleId === task.trueRuleId, queriesMade: env.queriesMade, finalVersionSpaceSize: vs.length, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: [], queryResults, config: { model: 'greedy_baseline', maxQueries: 6, temperature: 0, seed: 0 } };
  });
}

// Oracle: greedy optimal queries + always picks the TRUE rule (upper bound).
// Accuracy is always 1.0; query count = minimum queries needed by greedy strategy.
export function runOracleBaseline(tasks: Task[]): RunResult[] {
  return tasks.map(task => {
    const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
    const queryResults: any[] = [];
    while (!env.isDone()) { const x = computeGreedyOptimalQuery(env); const qr = env.query(x); queryResults.push(qr); }
    const vs = env.versionSpace;
    const predictedRuleId = task.trueRuleId; // oracle always knows
    return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: true, queriesMade: env.queriesMade, finalVersionSpaceSize: vs.length, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: [], queryResults, config: { model: 'oracle_version_space', maxQueries: 6, temperature: 0, seed: 0 } };
  });
}

// ---------------------------------------------------------------------------
// Write algorithmic baseline results as JSONL + manifest (with SHA256 audit chain)
// ---------------------------------------------------------------------------

function runResultToRecord(r: RunResult): ResultRecord {
  return {
    taskId: r.taskId, trueRuleId: r.trueRuleId, predictedRuleId: r.predictedRuleId,
    correct: r.correct, queriesMade: r.queriesMade,
    finalVersionSpaceSize: r.finalVersionSpaceSize,
    initialVersionSpaceSize: r.initialVersionSpaceSize,
    conversation: r.conversation, queryResults: r.queryResults,
    config: r.config, taskKey: '', responseSources: [],
  };
}

export function writeBaselineResults(
  results: RunResult[],
  condition: string,
  tasksPath: string,
  experimentId: string = 'p0_benchmark',
  baseDir?: string,
): string {
  const ctx: ExperimentContext = {
    experimentId,
    condition,
    model: 'algorithmic',
    promptVersion: 'none',
    temperature: 0,
    maxTokens: 0,
    maxQueries: 6,
    minQueries: 0,
    parserMode: 'strict',
    seed: 42,
    ruleSpaceVersion: '48_rules_v1',
    taskFilePath: tasksPath,
  };
  const out = new OutputManager(ctx, { overwrite: true, baseDir: baseDir ?? path.join(path.dirname(tasksPath), experimentId, condition) });
  for (const r of results) { out.appendResult(runResultToRecord(r)); }
  out.close();
  return out.baseDir;
}

// ---------------------------------------------------------------------------
// Significance testing + effect size (no external dependencies)
// ---------------------------------------------------------------------------

export interface SignificanceResult {
  conditionA: string;
  conditionB: string;
  metric: string;
  meanA: number;
  meanB: number;
  meanDiff: number;
  stdDiff: number;
  n: number;
  tStatistic: number;
  pValue: number;
  cohensD: number;
  significant: boolean;
}

function normalCDF(x: number): number {
  // Abramowitz & Stegun 7.1.26 approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Paired t-test on per-task binary correctness (0/1) between two conditions.
// Returns t-statistic, two-tailed p-value (normal approx for large n), and Cohen's d.
export function pairedTTestBinary(
  resultsA: RunResult[],
  resultsB: RunResult[],
  nameA: string,
  nameB: string,
  metric: string = 'accuracy',
): SignificanceResult | null {
  const mapA = new Map(resultsA.map(r => [r.taskId, r]));
  const mapB = new Map(resultsB.map(r => [r.taskId, r]));
  const commonIds = resultsA.filter(r => mapB.has(r.taskId)).map(r => r.taskId);
  if (commonIds.length < 2) return null;
  const diffs: number[] = [];
  for (const id of commonIds) {
    const a = mapA.get(id)!;
    const b = mapB.get(id)!;
    let va: number, vb: number;
    if (metric === 'accuracy') { va = a.correct ? 1 : 0; vb = b.correct ? 1 : 0; }
    else if (metric === 'query_count') { va = a.queriesMade; vb = b.queriesMade; }
    else { va = a.correct ? 1 : 0; vb = b.correct ? 1 : 0; }
    diffs.push(vb - va);
  }
  const n = diffs.length;
  const meanDiff = diffs.reduce((s, d) => s + d, 0) / n;
  const variance = diffs.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (n - 1);
  const stdDiff = Math.sqrt(variance);
  const tStat = stdDiff > 0 ? meanDiff / (stdDiff / Math.sqrt(n)) : 0;
  // Two-tailed p-value via normal approximation (valid for n >= 30)
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)));
  const cohensD = stdDiff > 0 ? meanDiff / stdDiff : 0;
  const meanA = commonIds.reduce((s, id) => {
    const a = mapA.get(id)!;
    return s + (metric === 'accuracy' ? (a.correct ? 1 : 0) : a.queriesMade);
  }, 0) / n;
  const meanB = commonIds.reduce((s, id) => {
    const b = mapB.get(id)!;
    return s + (metric === 'accuracy' ? (b.correct ? 1 : 0) : b.queriesMade);
  }, 0) / n;
  return {
    conditionA: nameA, conditionB: nameB, metric,
    meanA, meanB, meanDiff, stdDiff, n,
    tStatistic: tStat, pValue, cohensD,
    significant: pValue < 0.05,
  };
}

// ---------------------------------------------------------------------------
// Failure case analysis
// ---------------------------------------------------------------------------

export interface FailureCase {
  taskId: string;
  condition: string;
  trueRuleId: string;
  predictedRuleId: string | null;
  failureType: FailureType;
  queriesMade: number;
  finalVersionSpaceSize: number;
  initialVersionSpaceSize: number;
}

export function analyzeFailureCases(results: RunResult[], condition: string): FailureCase[] {
  const failures: FailureCase[] = [];
  for (const r of results) {
    const ft = computeFailureType(r);
    if (ft === 'correct') continue;
    failures.push({
      taskId: r.taskId, condition, trueRuleId: r.trueRuleId,
      predictedRuleId: r.predictedRuleId, failureType: ft,
      queriesMade: r.queriesMade, finalVersionSpaceSize: r.finalVersionSpaceSize,
      initialVersionSpaceSize: r.initialVersionSpaceSize,
    });
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Oracle version-space upper bound
// ---------------------------------------------------------------------------

export interface OracleUpperBound {
  accuracy: number;          // always 1.0 (oracle knows true rule)
  avgQueries: number;        // minimum queries needed by greedy strategy
  vsSizeOneRate: number;     // fraction of tasks where VS reduced to 1 (fully solvable)
  avgFinalVS: number;        // average VS size after greedy queries
  description: string;
}

export function computeOracleUpperBound(tasks: Task[]): OracleUpperBound {
  const oracleResults = runOracleBaseline(tasks);
  const n = oracleResults.length;
  const avgQueries = oracleResults.reduce((s, r) => s + r.queriesMade, 0) / n;
  const vsSizeOne = oracleResults.filter(r => r.finalVersionSpaceSize === 1).length;
  const avgFinalVS = oracleResults.reduce((s, r) => s + r.finalVersionSpaceSize, 0) / n;
  return {
    accuracy: 1.0,
    avgQueries,
    vsSizeOneRate: vsSizeOne / n,
    avgFinalVS,
    description: 'Oracle uses greedy information-gain queries and always selects the true rule. ' +
      'Accuracy=1.0 is the theoretical upper bound. avgQueries is the minimum query cost under optimal strategy. ' +
      'vsSizeOneRate is the fraction of tasks fully solvable (VS reduced to 1) within the query budget.',
  };
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------

export interface AnalysisReport {
  metrics: Metrics[];
  significance: SignificanceResult[];
  failureCases: FailureCase[];
  failureSummary: Record<string, Record<string, number>>;
  oracleUpperBound: OracleUpperBound;
  generatedAt: string;
}

export function analyze(resultDir: string, tasksPath: string): AnalysisReport {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
  console.log('=== Rule Induction Experiment Analysis ===\n');

  // Compute and write algorithmic baselines as JSONL + manifest
  const randomResults = runRandomBaseline(tasks, 42);
  const greedyResults = runGreedyBaseline(tasks);
  const oracleResults = runOracleBaseline(tasks);

  const randomDir = writeBaselineResults(randomResults, 'algorithmic_random_query', tasksPath, 'p0_benchmark', path.join(resultDir, 'p0_benchmark', 'algorithmic_random_query'));
  const greedyDir = writeBaselineResults(greedyResults, 'algorithmic_infogain', tasksPath, 'p0_benchmark', path.join(resultDir, 'p0_benchmark', 'algorithmic_infogain'));
  const oracleDir = writeBaselineResults(oracleResults, 'oracle_version_space', tasksPath, 'p0_benchmark', path.join(resultDir, 'p0_benchmark', 'oracle_version_space'));
  console.log(`  Wrote algorithmic_random_query -> ${randomDir}`);
  console.log(`  Wrote algorithmic_infogain -> ${greedyDir}`);
  console.log(`  Wrote oracle_version_space -> ${oracleDir}`);

  // Collect all conditions (algorithmic + LLM-based from resultDir)
  const conditions: { name: string; results: RunResult[] }[] = [
    { name: 'algorithmic_random_query', results: randomResults },
    { name: 'algorithmic_infogain', results: greedyResults },
    { name: 'oracle_version_space', results: oracleResults },
  ];

  // Load LLM-based conditions from resultDir (llm_passive, llm_scaffold, llm_active, etc.)
  if (fs.existsSync(resultDir)) {
    for (const d of fs.readdirSync(resultDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
      const jsonlPath = path.join(resultDir, d.name, 'results.jsonl');
      if (fs.existsSync(jsonlPath)) {
        try {
          const results = loadResults(jsonlPath);
          if (results.length > 0) conditions.push({ name: d.name, results });
        } catch (e: any) { console.error(`Cannot load ${jsonlPath}: ${e.message}`); }
      }
    }
  }

  // Compute metrics for all conditions
  const allMetrics: Metrics[] = conditions.map(c => computeAllMetrics(c.results, c.name));

  // Print metrics table
  console.log('\nCondition'.padEnd(30) + 'Accuracy'.padEnd(12) + 'AvgQueries'.padEnd(12) + 'AvgTokens'.padEnd(12) + 'AvgFinalVS'.padEnd(12) + 'Efficiency'.padEnd(12));
  console.log('-'.repeat(90));
  for (const m of allMetrics) {
    console.log(
      m.condition.padEnd(30) +
      (m.accuracy * 100).toFixed(1).padEnd(12) +
      m.avgQueries.toFixed(2).padEnd(12) +
      m.avgTokens.toFixed(0).padEnd(12) +
      m.avgFinalVS.toFixed(2).padEnd(12) +
      m.queryEfficiency.toFixed(3).padEnd(12)
    );
  }

  // Failure type breakdown
  console.log('\nFailure Type Breakdown:');
  for (const m of allMetrics) {
    const ft = m.failureTypeCounts;
    console.log(`  ${m.condition}: correct=${ft.correct || 0} wrong_rule=${ft.wrong_rule || 0} version_space_mismatch=${ft.version_space_mismatch || 0} overconfident_guess=${ft.overconfident_guess || 0} invalid_json=${ft.invalid_json || 0} timeout=${ft.timeout || 0} api_error=${ft.api_error || 0}`);
  }

  // Significance tests: compare each condition vs algorithmic_random_query (baseline) on accuracy
  const significance: SignificanceResult[] = [];
  for (const c of conditions) {
    if (c.name === 'algorithmic_random_query') continue;
    const sig = pairedTTestBinary(randomResults, c.results, 'algorithmic_random_query', c.name, 'accuracy');
    if (sig) significance.push(sig);
  }
  // Also compare algorithmic_infogain vs oracle_version_space on query_count
  const sigQuery = pairedTTestBinary(greedyResults, oracleResults, 'algorithmic_infogain', 'oracle_version_space', 'query_count');
  if (sigQuery) significance.push(sigQuery);

  console.log('\nSignificance Tests (paired t-test, two-tailed, normal approx):');
  for (const s of significance) {
    console.log(`  ${s.conditionA} vs ${s.conditionB} (${s.metric}): meanA=${s.meanA.toFixed(3)} meanB=${s.meanB.toFixed(3)} t=${s.tStatistic.toFixed(3)} p=${s.pValue.toFixed(4)} d=${s.cohensD.toFixed(3)} sig=${s.significant}`);
  }

  // Failure case analysis
  const failureCases: FailureCase[] = [];
  for (const c of conditions) {
    failureCases.push(...analyzeFailureCases(c.results, c.name));
  }
  console.log(`\nTotal failure cases: ${failureCases.length}`);

  // Failure summary by condition
  const failureSummary: Record<string, Record<string, number>> = {};
  for (const c of conditions) {
    failureSummary[c.name] = {};
    for (const r of c.results) {
      const ft = computeFailureType(r);
      failureSummary[c.name][ft] = (failureSummary[c.name][ft] || 0) + 1;
    }
  }

  // Oracle upper bound
  const oracleUpperBound = computeOracleUpperBound(tasks);
  console.log(`\nOracle Version-Space Upper Bound:`);
  console.log(`  accuracy=${oracleUpperBound.accuracy.toFixed(3)} (theoretical max)`);
  console.log(`  avgQueries=${oracleUpperBound.avgQueries.toFixed(2)} (minimum query cost under optimal strategy)`);
  console.log(`  vsSizeOneRate=${oracleUpperBound.vsSizeOneRate.toFixed(3)} (fraction fully solvable within budget)`);
  console.log(`  avgFinalVS=${oracleUpperBound.avgFinalVS.toFixed(2)}`);

  // Write comprehensive report
  const report: AnalysisReport = {
    metrics: allMetrics,
    significance,
    failureCases,
    failureSummary,
    oracleUpperBound,
    generatedAt: new Date().toISOString(),
  };
  const reportPath = path.join(resultDir, 'analysis_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);

  // Write failure cases to separate file
  const failurePath = path.join(resultDir, 'failure_cases.json');
  fs.writeFileSync(failurePath, JSON.stringify(failureCases, null, 2));
  console.log(`Failure cases: ${failurePath}`);

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('analyzeResults.ts')) {
  const args = process.argv.slice(2);
  let resultDir = 'results', tasksPath = 'results/tasks_seed42.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) { resultDir = args[i + 1]; i++; }
    if (args[i] === '--tasks' && args[i + 1]) { tasksPath = args[i + 1]; i++; }
  }
  analyze(resultDir, tasksPath);
}
