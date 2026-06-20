import { RULE_BY_ID, DISTINCT_RULES } from './rules.js';
import type { Observation } from './env.js';

export interface Task {
  taskId: string;
  trueRuleId: string;
  initialObservations: Observation[];
  versionSpaceRuleIds: string[];
  seed: number;
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function computeVersionSpace(observations: Observation[]): string[] {
  let vs = new Set(DISTINCT_RULES);
  for (const obs of observations) {
    const newVs = new Set<string>();
    for (const ruleId of vs) { if (RULE_BY_ID.get(ruleId)!.call(obs.input) === obs.output) newVs.add(ruleId); }
    vs = newVs;
  }
  return Array.from(vs);
}

export function generateTask(seed: number): Task {
  const rng = mulberry32(seed);
  const trueRuleIdx = Math.floor(rng() * DISTINCT_RULES.length);
  const trueRuleId = DISTINCT_RULES[trueRuleIdx];
  const trueRule = RULE_BY_ID.get(trueRuleId)!;
  const numInitObs = 2 + Math.floor(rng() * 2);
  const observations: Observation[] = [];
  const usedInputs = new Set<string>();
  for (let i = 0; i < numInitObs; i++) {
    let x: [number, number, number], key: string;
    do { x = [Math.floor(rng() * 10), Math.floor(rng() * 10), Math.floor(rng() * 10)]; key = x.join(','); } while (usedInputs.has(key));
    usedInputs.add(key);
    observations.push({ input: x, output: trueRule.call(x) });
  }
  return { taskId: `task_${seed}`, trueRuleId, initialObservations: observations, versionSpaceRuleIds: computeVersionSpace(observations), seed };
}

export function generateTaskBatch(n: number, seed: number): Task[] {
  const rng = mulberry32(seed);
  const tasks: Task[] = [];
  for (let i = 0; i < n; i++) { tasks.push(generateTask(Math.floor(rng() * 1000000))); }
  return tasks;
}

if (process.argv[1] && process.argv[1].endsWith('taskGenerator.ts')) {
  const args = process.argv.slice(2);
  let n = 50, seed = 42, output = 'results/tasks.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--n' && args[i + 1]) { n = parseInt(args[i + 1]); i++; }
    if (args[i] === '--seed' && args[i + 1]) { seed = parseInt(args[i + 1]); i++; }
    if (args[i] === '--output' && args[i + 1]) { output = args[i + 1]; i++; }
  }
  const tasks = generateTaskBatch(n, seed);
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.dirname(output);
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
  fs.writeFileSync(output, JSON.stringify(tasks, null, 2));
  console.log(`Generated ${tasks.length} tasks with seed=${seed} -> ${output}`);
}
