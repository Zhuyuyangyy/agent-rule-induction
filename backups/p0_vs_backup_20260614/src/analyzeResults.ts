import fs from 'fs';
import path from 'path';
import { RULE_BY_ID, INPUT_SPACE, DISTINCT_RULES } from './rules.js';
import { RuleInductionEnv, computeGreedyOptimalQuery, computeRandomQuery } from './env.js';
import { computeAllMetrics, loadResults, type Metrics } from './metrics.js';
import type { Task } from './taskGenerator.js';
import type { RunResult } from './runActive.js';

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

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

export function analyze(resultDir: string, tasksPath: string): void {
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
  console.log('=== Rule Induction Experiment Analysis ===\n');
  const randomMetrics = computeAllMetrics(runRandomBaseline(tasks, 42), 'random_baseline');
  const greedyMetrics = computeAllMetrics(runGreedyBaseline(tasks), 'greedy_baseline');
  const conditions: { name: string; path: string }[] = [];
  if (fs.existsSync(resultDir)) {
    for (const f of fs.readdirSync(resultDir).filter(f => f.endsWith('.jsonl'))) {
      conditions.push({ name: f.replace('results_', '').replace('.jsonl', ''), path: path.join(resultDir, f) });
    }
    for (const d of fs.readdirSync(resultDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
      for (const f of fs.readdirSync(path.join(resultDir, d.name)).filter(f => f.endsWith('.jsonl'))) {
        conditions.push({ name: `${d.name}/${f.replace('results_', '').replace('.jsonl', '')}`, path: path.join(resultDir, d.name, f) });
      }
    }
  }
  const allMetrics: Metrics[] = [randomMetrics, greedyMetrics];
  for (const c of conditions) { try { allMetrics.push(computeAllMetrics(loadResults(c.path), c.name)); } catch (e: any) { console.error(`Cannot load ${c.path}: ${e.message}`); } }
  console.log('\nCondition'.padEnd(40) + 'Accuracy'.padEnd(12) + 'AvgQueries'.padEnd(12) + 'AvgFinalVS'.padEnd(12) + 'Efficiency'.padEnd(12));
  console.log('-'.repeat(88));
  for (const m of allMetrics) {
    console.log(m.condition.padEnd(40) + (m.accuracy * 100).toFixed(1).padEnd(12) + m.avgQueries.toFixed(2).padEnd(12) + m.avgFinalVS.toFixed(2).padEnd(12) + m.queryEfficiency.toFixed(3).padEnd(12));
  }
  const reportPath = path.join(resultDir, 'analysis_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allMetrics, null, 2));
  console.log(`\nReport: ${reportPath}`);
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
