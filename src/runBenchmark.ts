// P0 Benchmark orchestration: generate tasks, run all baselines, analyze results.
//
// Algorithmic baselines (algorithmic_random_query, algorithmic_infogain, oracle_version_space) run without API.
// LLM baselines (llm_passive, llm_scaffold, llm_active) require OPENAI_API_KEY; they are
// invoked as child processes via tsx so this script stays a single entry point.
//
// Usage:
//   npx tsx src/runBenchmark.ts [--n 100] [--seed 42] [--model deepseek-chat]
//                                [--experiment-id p0_benchmark] [--skip-llm]
//                                [--result-dir results]

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { generateTaskBatch } from './taskGenerator.js';
import { analyze } from './analyzeResults.js';

interface BenchOpts {
  n: number;
  seed: number;
  model: string;
  experimentId: string;
  resultDir: string;
  skipLlm: boolean;
  baseUrl: string;
  apiKey?: string;
}

function parseArgs(argv: string[]): BenchOpts {
  const opt: BenchOpts = {
    n: 100,
    seed: 42,
    model: 'deepseek-chat',
    experimentId: 'p0_benchmark',
    resultDir: 'results',
    skipLlm: false,
    baseUrl: process.env.OPENAI_BASE_URL || '',
    apiKey: process.env.OPENAI_API_KEY,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(`Missing value for ${a}`); return v; };
    if (a === '--n') opt.n = parseInt(next());
    if (a === '--seed') opt.seed = parseInt(next());
    if (a === '--model') opt.model = next();
    if (a === '--experiment-id') opt.experimentId = next();
    if (a === '--result-dir') opt.resultDir = next();
    if (a === '--base-url') opt.baseUrl = next();
    if (a === '--api-key') opt.apiKey = next();
    if (a === '--skip-llm') opt.skipLlm = true;
  }
  return opt;
}

function runCli(cmd: string, args: string[], label: string): void {
  console.log(`\n>>> ${label}: ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (res.status !== 0) {
    console.error(`>>> ${label} exited with code ${res.status}`);
    throw new Error(`${label} failed`);
  }
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  console.log('=== P0 Benchmark Orchestration ===');
  console.log(`  tasks: ${opt.n}, seed: ${opt.seed}, model: ${opt.model}`);
  console.log(`  experimentId: ${opt.experimentId}, resultDir: ${opt.resultDir}`);
  console.log(`  skipLlm: ${opt.skipLlm}`);

  // 1. Generate tasks (>= 100)
  const tasksPath = path.join(opt.resultDir, `tasks_seed${opt.seed}.json`);
  fs.mkdirSync(opt.resultDir, { recursive: true });
  const tasks = generateTaskBatch(opt.n, opt.seed);
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
  console.log(`\nGenerated ${tasks.length} tasks -> ${tasksPath}`);

  // 2. Run algorithmic baselines + analysis (writes JSONL + manifest + report)
  //    analyze() internally computes algorithmic_random_query, algorithmic_infogain, oracle_version_space,
  //    writes their JSONL+manifest, and generates the full report.
  console.log('\n--- Algorithmic baselines (algorithmic_random_query, algorithmic_infogain, oracle_version_space) ---');
  analyze(opt.resultDir, tasksPath);

  // 3. Run LLM baselines (llm_passive, llm_scaffold, llm_active) if API key available
  const hasApiKey = !!opt.apiKey;
  if (opt.skipLlm || !hasApiKey) {
    console.log('\n--- LLM baselines skipped ---');
    if (!hasApiKey && !opt.skipLlm) {
      console.log('  (Set OPENAI_API_KEY or pass --api-key to run llm_passive/llm_scaffold/llm_active baselines.)');
    }
    console.log('  To run them manually:');
    console.log(`    npx tsx src/runPassive.ts --tasks ${tasksPath} --experiment-id ${opt.experimentId} --model ${opt.model} --condition llm_passive`);
    console.log(`    npx tsx src/runScaffold.ts --tasks ${tasksPath} --experiment-id ${opt.experimentId} --model ${opt.model} --condition llm_scaffold`);
    console.log(`    npx tsx src/runActive.ts   --tasks ${tasksPath} --experiment-id ${opt.experimentId} --model ${opt.model} --condition llm_active`);
    console.log(`    npx tsx src/analyzeResults.ts --dir ${opt.resultDir} --tasks ${tasksPath}`);
    return;
  }

  console.log('\n--- LLM baselines (llm_passive, llm_scaffold, llm_active) ---');
  const commonArgs = [
    '--tasks', tasksPath,
    '--experiment-id', opt.experimentId,
    '--model', opt.model,
    '--seed', String(opt.seed),
    '--overwrite',
  ];
  if (opt.baseUrl) commonArgs.push('--base-url', opt.baseUrl);
  if (opt.apiKey) commonArgs.push('--api-key', opt.apiKey);

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  runCli(npx, ['tsx', 'src/runPassive.ts', ...commonArgs, '--condition', 'llm_passive'], 'llm_passive');
  runCli(npx, ['tsx', 'src/runScaffold.ts', ...commonArgs, '--condition', 'llm_scaffold'], 'llm_scaffold');
  runCli(npx, ['tsx', 'src/runActive.ts', ...commonArgs, '--condition', 'llm_active'], 'llm_active');

  // 4. Re-run analysis to include LLM conditions
  console.log('\n--- Final analysis (all conditions) ---');
  analyze(opt.resultDir, tasksPath);

  console.log('\n=== Benchmark complete ===');
  console.log(`  Report: ${path.join(opt.resultDir, 'analysis_report.json')}`);
  console.log(`  Failure cases: ${path.join(opt.resultDir, 'failure_cases.json')}`);
}

main().catch(e => { console.error(`Benchmark failed: ${e.message}`); process.exit(1); });
