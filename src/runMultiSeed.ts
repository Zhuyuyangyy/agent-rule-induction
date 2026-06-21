// P0 Multi-seed experiment runner.
// Runs algorithmic baselines across multiple seeds and produces a consolidated report.
//
// Usage:
//   npx tsx src/runMultiSeed.ts [--seeds 1,2,3,4,5] [--n 100] [--result-dir results/p0_multi_seed]
//   npx tsx src/runMultiSeed.ts --seeds 1,2,3,4,5 --n 100 --skip-llm
//   npx tsx src/runMultiSeed.ts --seeds 1,2,3,4,5 --n 100 --api-key KEY --base-url URL --model deepseek-chat
//
// Output structure:
//   results/p0_multi_seed/
//     seed_1/
//       tasks_seed1.json
//       algorithmic_random_query/results.jsonl + manifest.json
//       algorithmic_infogain/results.jsonl + manifest.json
//       oracle_version_space/results.jsonl + manifest.json
//       [llm_passive/llm_scaffold/llm_active if --api-key provided]
//     seed_2/ ...
//     summary.csv
//     confidence_intervals.csv
//     report.md

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { generateTaskBatch } from './taskGenerator.js';
import {
  runRandomBaseline, runGreedyBaseline, runOracleBaseline,
  writeBaselineResults, pairedTTestBinary, analyzeFailureCases,
  computeOracleUpperBound,
  type FailureCase, type SignificanceResult,
} from './analyzeResults.js';
import type { RunResult } from './runActive.js';
import { computeAllMetrics, computeFailureType, ALL_FAILURE_TYPES, type Metrics, type FailureType } from './metrics.js';
import type { Task } from './taskGenerator.js';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface MultiSeedOpts {
  seeds: number[];
  n: number;
  resultDir: string;
  skipLlm: boolean;
  model: string;
  baseUrl: string;
  apiKey?: string;
}

function parseArgs(argv: string[]): MultiSeedOpts {
  const opt: MultiSeedOpts = {
    seeds: [1, 2, 3, 4, 5],
    n: 100,
    resultDir: 'results/p0_multi_seed',
    skipLlm: false,
    model: 'deepseek-chat',
    baseUrl: process.env.OPENAI_BASE_URL || '',
    apiKey: process.env.OPENAI_API_KEY,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(`Missing value for ${a}`); return v; };
    if (a === '--seeds') opt.seeds = next().split(',').map(Number);
    if (a === '--n') opt.n = parseInt(next());
    if (a === '--result-dir') opt.resultDir = next();
    if (a === '--skip-llm') opt.skipLlm = true;
    if (a === '--model') opt.model = next();
    if (a === '--base-url') opt.baseUrl = next();
    if (a === '--api-key') opt.apiKey = next();
  }
  return opt;
}

// ---------------------------------------------------------------------------
// Bootstrap confidence interval
// ---------------------------------------------------------------------------

function bootstrapCI(
  values: number[],
  confidence: number = 0.95,
  nBootstrap: number = 10000,
): { mean: number; lower: number; upper: number; std: number } {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

  const bootstrapMeans: number[] = [];
  const rng = mulberry32(42);
  for (let b = 0; b < nBootstrap; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n);
      sum += values[idx];
    }
    bootstrapMeans.push(sum / n);
  }
  bootstrapMeans.sort((a, b) => a - b);
  const alpha = (1 - confidence) / 2;
  const lower = bootstrapMeans[Math.floor(alpha * nBootstrap)];
  const upper = bootstrapMeans[Math.floor((1 - alpha) * nBootstrap)];
  return { mean, lower, upper, std };
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------------
// Per-seed run
// ---------------------------------------------------------------------------

interface SeedResult {
  seed: number;
  conditions: { name: string; metrics: Metrics; results: RunResult[] }[];
  failureCases: FailureCase[];
}

function runSeedAlgorithmic(seed: number, n: number, resultDir: string): SeedResult {
  const seedDir = path.join(resultDir, `seed_${seed}`);
  fs.mkdirSync(seedDir, { recursive: true });

  // Generate tasks
  const tasks = generateTaskBatch(n, seed);
  const tasksPath = path.join(seedDir, `tasks_seed${seed}.json`);
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

  // Run algorithmic baselines
  const randomResults = runRandomBaseline(tasks, seed);
  const greedyResults = runGreedyBaseline(tasks);
  const oracleResults = runOracleBaseline(tasks);

  // Write results
  writeBaselineResults(randomResults, 'algorithmic_random_query', tasksPath, 'p0_multi_seed', path.join(seedDir, 'algorithmic_random_query'));
  writeBaselineResults(greedyResults, 'algorithmic_infogain', tasksPath, 'p0_multi_seed', path.join(seedDir, 'algorithmic_infogain'));
  writeBaselineResults(oracleResults, 'oracle_version_space', tasksPath, 'p0_multi_seed', path.join(seedDir, 'oracle_version_space'));

  const conditions = [
    { name: 'algorithmic_random_query', results: randomResults, metrics: computeAllMetrics(randomResults, 'algorithmic_random_query') },
    { name: 'algorithmic_infogain', results: greedyResults, metrics: computeAllMetrics(greedyResults, 'algorithmic_infogain') },
    { name: 'oracle_version_space', results: oracleResults, metrics: computeAllMetrics(oracleResults, 'oracle_version_space') },
  ];

  // Load LLM conditions if they exist
  for (const d of fs.readdirSync(seedDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const jsonlPath = path.join(seedDir, d.name, 'results.jsonl');
    if (fs.existsSync(jsonlPath) && !['algorithmic_random_query', 'algorithmic_infogain', 'oracle_version_space'].includes(d.name)) {
      try {
        const lines = fs.readFileSync(jsonlPath, 'utf-8').trim().split('\n').filter(l => l.trim());
        const results = lines.map(line => JSON.parse(line) as RunResult);
        if (results.length > 0) {
          conditions.push({ name: d.name, results, metrics: computeAllMetrics(results, d.name) });
        }
      } catch {}
    }
  }

  const failureCases: FailureCase[] = [];
  for (const c of conditions) {
    failureCases.push(...analyzeFailureCases(c.results, c.name));
  }

  return { seed, conditions, failureCases };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function generateReport(allResults: SeedResult[], resultDir: string): void {
  // Collect all condition names
  const conditionNames = new Set<string>();
  for (const sr of allResults) {
    for (const c of sr.conditions) conditionNames.add(c.name);
  }
  const condList = [...conditionNames].sort();

  // --- summary.csv ---
  const csvRows: string[] = ['seed,condition,accuracy,avg_queries,avg_final_vs,query_efficiency,avg_tokens,total_tasks'];
  for (const sr of allResults) {
    for (const c of sr.conditions) {
      csvRows.push([
        sr.seed, c.name,
        c.metrics.accuracy.toFixed(4),
        c.metrics.avgQueries.toFixed(2),
        c.metrics.avgFinalVS.toFixed(2),
        c.metrics.queryEfficiency.toFixed(4),
        c.metrics.avgTokens.toFixed(0),
        c.metrics.totalTasks,
      ].join(','));
    }
  }
  fs.writeFileSync(path.join(resultDir, 'summary.csv'), csvRows.join('\n') + '\n');

  // --- confidence_intervals.csv ---
  const ciRows: string[] = ['condition,metric,mean,ci_lower,ci_upper,std,n_seeds'];
  for (const cond of condList) {
    const accValues: number[] = [];
    const queryValues: number[] = [];
    const effValues: number[] = [];
    for (const sr of allResults) {
      const c = sr.conditions.find(c => c.name === cond);
      if (c) {
        accValues.push(c.metrics.accuracy);
        queryValues.push(c.metrics.avgQueries);
        effValues.push(c.metrics.queryEfficiency);
      }
    }
    if (accValues.length > 0) {
      const accCI = bootstrapCI(accValues);
      ciRows.push([cond, 'accuracy', accCI.mean.toFixed(4), accCI.lower.toFixed(4), accCI.upper.toFixed(4), accCI.std.toFixed(4), accValues.length].join(','));
      const queryCI = bootstrapCI(queryValues);
      ciRows.push([cond, 'avg_queries', queryCI.mean.toFixed(4), queryCI.lower.toFixed(4), queryCI.upper.toFixed(4), queryCI.std.toFixed(4), queryValues.length].join(','));
      const effCI = bootstrapCI(effValues);
      ciRows.push([cond, 'query_efficiency', effCI.mean.toFixed(4), effCI.lower.toFixed(4), effCI.upper.toFixed(4), effCI.std.toFixed(4), effValues.length].join(','));
    }
  }
  fs.writeFileSync(path.join(resultDir, 'confidence_intervals.csv'), ciRows.join('\n') + '\n');

  // --- report.md ---
  const lines: string[] = [
    '# P0 Multi-Seed Experiment Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Seeds: ${allResults.map(sr => sr.seed).join(', ')}`,
    `Tasks per seed: ${allResults[0]?.conditions[0]?.metrics.totalTasks ?? 'N/A'}`,
    `Total tasks: ${allResults.reduce((s, sr) => s + (sr.conditions[0]?.metrics.totalTasks ?? 0), 0)}`,
    '',
    '## Per-Seed Results',
    '',
  ];

  // Per-seed table
  for (const sr of allResults) {
    lines.push(`### Seed ${sr.seed}`, '');
    lines.push('| Condition | Accuracy | Avg Queries | Avg Final VS | Query Efficiency |');
    lines.push('|-----------|----------|-------------|--------------|------------------|');
    for (const c of sr.conditions) {
      lines.push(`| ${c.name} | ${(c.metrics.accuracy * 100).toFixed(1)}% | ${c.metrics.avgQueries.toFixed(2)} | ${c.metrics.avgFinalVS.toFixed(2)} | ${c.metrics.queryEfficiency.toFixed(4)} |`);
    }
    lines.push('');
  }

  // Aggregated table with CI
  lines.push('## Aggregated Results (with 95% Bootstrap CI)', '');
  lines.push('| Condition | Accuracy | 95% CI | Avg Queries | 95% CI | Query Efficiency | 95% CI |');
  lines.push('|-----------|----------|--------|-------------|--------|------------------|--------|');
  for (const cond of condList) {
    const accValues: number[] = [];
    const queryValues: number[] = [];
    const effValues: number[] = [];
    for (const sr of allResults) {
      const c = sr.conditions.find(c => c.name === cond);
      if (c) {
        accValues.push(c.metrics.accuracy);
        queryValues.push(c.metrics.avgQueries);
        effValues.push(c.metrics.queryEfficiency);
      }
    }
    if (accValues.length > 0) {
      const accCI = bootstrapCI(accValues);
      const queryCI = bootstrapCI(queryValues);
      const effCI = bootstrapCI(effValues);
      lines.push(`| ${cond} | ${(accCI.mean * 100).toFixed(1)}% | [${(accCI.lower * 100).toFixed(1)}%, ${(accCI.upper * 100).toFixed(1)}%] | ${queryCI.mean.toFixed(2)} | [${queryCI.lower.toFixed(2)}, ${queryCI.upper.toFixed(2)}] | ${effCI.mean.toFixed(4)} | [${effCI.lower.toFixed(4)}, ${effCI.upper.toFixed(4)}] |`);
    }
  }
  lines.push('');

  // Failure type breakdown (aggregated)
  lines.push('## Failure Type Breakdown (aggregated across seeds)', '');
  lines.push('| Condition | ' + ALL_FAILURE_TYPES.join(' | ') + ' |');
  lines.push('|-----------|' + ALL_FAILURE_TYPES.map(() => '------').join('|') + '|');
  for (const cond of condList) {
    const counts: Record<string, number> = {};
    for (const ft of ALL_FAILURE_TYPES) counts[ft] = 0;
    for (const sr of allResults) {
      const c = sr.conditions.find(c => c.name === cond);
      if (c) {
        for (const ft of ALL_FAILURE_TYPES) {
          counts[ft] += c.metrics.failureTypeCounts[ft] || 0;
        }
      }
    }
    lines.push(`| ${cond} | ${ALL_FAILURE_TYPES.map(ft => counts[ft]).join(' | ')} |`);
  }
  lines.push('');

  // Significance tests (aggregated)
  lines.push('## Significance Tests', '');
  lines.push('Paired t-test across all seeds (accuracy, algorithmic_random_query as baseline).', '');
  // Aggregate all results across seeds for significance
  const refCond = 'algorithmic_random_query';
  const refResults: RunResult[] = [];
  const infogainResults: RunResult[] = [];
  const oracleResults: RunResult[] = [];
  for (const sr of allResults) {
    const ref = sr.conditions.find(c => c.name === refCond);
    const ig = sr.conditions.find(c => c.name === 'algorithmic_infogain');
    const orc = sr.conditions.find(c => c.name === 'oracle_version_space');
    if (ref) refResults.push(...ref.results);
    if (ig) infogainResults.push(...ig.results);
    if (orc) oracleResults.push(...orc.results);
  }
  if (refResults.length > 0 && infogainResults.length > 0) {
    const sig = pairedTTestBinary(refResults, infogainResults, refCond, 'algorithmic_infogain', 'accuracy');
    if (sig) {
      lines.push(`- ${sig.conditionA} vs ${sig.conditionB}: t=${sig.tStatistic.toFixed(3)}, p=${sig.pValue.toFixed(6)}, d=${sig.cohensD.toFixed(3)}, significant=${sig.significant}`);
    }
  }
  if (refResults.length > 0 && oracleResults.length > 0) {
    const sig = pairedTTestBinary(refResults, oracleResults, refCond, 'oracle_version_space', 'accuracy');
    if (sig) {
      lines.push(`- ${sig.conditionA} vs ${sig.conditionB}: t=${sig.tStatistic.toFixed(3)}, p=${sig.pValue.toFixed(6)}, d=${sig.cohensD.toFixed(3)}, significant=${sig.significant}`);
    }
  }
  lines.push('');

  // Key findings
  lines.push('## Key Findings', '');
  const igAccValues: number[] = [];
  const randAccValues: number[] = [];
  const oracleAccValues: number[] = [];
  for (const sr of allResults) {
    const ig = sr.conditions.find(c => c.name === 'algorithmic_infogain');
    const rand = sr.conditions.find(c => c.name === 'algorithmic_random_query');
    const orc = sr.conditions.find(c => c.name === 'oracle_version_space');
    if (ig) igAccValues.push(ig.metrics.accuracy);
    if (rand) randAccValues.push(rand.metrics.accuracy);
    if (orc) oracleAccValues.push(orc.metrics.accuracy);
  }
  if (igAccValues.length > 0) {
    const igCI = bootstrapCI(igAccValues);
    lines.push(`- **algorithmic_infogain accuracy**: ${(igCI.mean * 100).toFixed(1)}% [${(igCI.lower * 100).toFixed(1)}%, ${(igCI.upper * 100).toFixed(1)}%] across ${igAccValues.length} seeds`);
  }
  if (randAccValues.length > 0) {
    const randCI = bootstrapCI(randAccValues);
    lines.push(`- **algorithmic_random_query accuracy**: ${(randCI.mean * 100).toFixed(1)}% [${(randCI.lower * 100).toFixed(1)}%, ${(randCI.upper * 100).toFixed(1)}%] across ${randAccValues.length} seeds`);
  }
  if (oracleAccValues.length > 0) {
    const orcCI = bootstrapCI(oracleAccValues);
    lines.push(`- **oracle_version_space accuracy**: ${(orcCI.mean * 100).toFixed(1)}% [${(orcCI.lower * 100).toFixed(1)}%, ${(orcCI.upper * 100).toFixed(1)}%] across ${oracleAccValues.length} seeds`);
  }
  lines.push('');

  fs.writeFileSync(path.join(resultDir, 'report.md'), lines.join('\n') + '\n');
  console.log(`\nReport written to ${path.join(resultDir, 'report.md')}`);
  console.log(`Summary CSV: ${path.join(resultDir, 'summary.csv')}`);
  console.log(`Confidence intervals CSV: ${path.join(resultDir, 'confidence_intervals.csv')}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  console.log('=== P0 Multi-Seed Experiment ===');
  console.log(`  Seeds: ${opt.seeds.join(', ')}`);
  console.log(`  Tasks per seed: ${opt.n}`);
  console.log(`  Result dir: ${opt.resultDir}`);
  console.log(`  Skip LLM: ${opt.skipLlm}`);

  fs.mkdirSync(opt.resultDir, { recursive: true });

  // Run algorithmic baselines for each seed
  const allResults: SeedResult[] = [];
  for (const seed of opt.seeds) {
    console.log(`\n--- Seed ${seed} ---`);
    const sr = runSeedAlgorithmic(seed, opt.n, opt.resultDir);
    allResults.push(sr);

    // Print per-seed summary
    for (const c of sr.conditions) {
      console.log(`  ${c.name}: accuracy=${(c.metrics.accuracy * 100).toFixed(1)}%, avgQueries=${c.metrics.avgQueries.toFixed(2)}`);
    }
  }

  // Run LLM baselines if API key provided
  if (!opt.skipLlm && opt.apiKey) {
    console.log('\n--- LLM Baselines ---');
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    for (const seed of opt.seeds) {
      const seedDir = path.join(opt.resultDir, `seed_${seed}`);
      const tasksPath = path.join(seedDir, `tasks_seed${seed}.json`);
      const commonArgs = [
        '--tasks', tasksPath,
        '--experiment-id', `p0_multi_seed/seed_${seed}`,
        '--model', opt.model,
        '--seed', String(seed),
        '--overwrite',
      ];
      if (opt.baseUrl) commonArgs.push('--base-url', opt.baseUrl);
      if (opt.apiKey) commonArgs.push('--api-key', opt.apiKey);

      for (const [script, condition] of [
        ['src/runPassive.ts', 'llm_passive'],
        ['src/runScaffold.ts', 'llm_scaffold'],
        ['src/runActive.ts', 'llm_active'],
      ] as const) {
        console.log(`\n  Seed ${seed}, ${condition}...`);
        const res = spawnSync(npx, ['tsx', script, ...commonArgs, '--condition', condition], {
          stdio: 'inherit',
          shell: false,
          cwd: process.cwd(),
        });
        if (res.status !== 0) {
          console.error(`  ${condition} for seed ${seed} exited with code ${res.status}`);
        }
      }

      // Reload seed results to include LLM conditions
      const srIdx = allResults.findIndex(sr => sr.seed === seed);
      if (srIdx >= 0) {
        allResults[srIdx] = runSeedAlgorithmic(seed, opt.n, opt.resultDir);
      }
    }
  }

  // Generate consolidated report
  generateReport(allResults, opt.resultDir);
  console.log('\n=== Multi-Seed Experiment Complete ===');
}

main().catch(e => { console.error(`Multi-seed experiment failed: ${e.message}`); process.exit(1); });
