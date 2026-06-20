import fs from 'fs';
import { DISTINCT_RULES } from './rules.js';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type CliOptions,
  OutputManager,
  parseCommonArgs,
} from './apiSafety.js';
import { buildApiClient, RunConfig, type RunResult } from './runActive.js';
import { RuleInductionEnv, computeRandomQuery } from './env.js';
import type { ResultRecord } from './apiSafety.js';

const PROMPT_VERSION = 'v2_active_random';

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function buildFinalPrompt(task: Task, queryHistory: { x: [number, number, number]; result: boolean; vsSize: number }[]): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  const qStr = queryHistory.map(q => `(${q.x.join(',')}) -> ${q.result} (VS=${q.vsSize})`).join('\n');
  return `Identify the hidden rule from these observations and query results.

Initial observations:
${obsStr}

Queries (selected randomly):
${qStr}

Available rules: ${DISTINCT_RULES.join(', ')}

Output ONLY JSON: {"rule_id":"<RULE_ID>"}`;
}

export async function runActiveRandomBatch(tasks: Task[], output: OutputManager, api: ReturnType<typeof buildApiClient>, model: string = 'deepseek-chat'): Promise<void> {
  const config: RunConfig = { model, maxQueries: 6, temperature: 0, seed: tasks[0]?.seed || 42, minQueries: 0, maxTokens: 256 };
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (output.isTaskCompleted(task.taskId)) { output.log(`[${i + 1}/${tasks.length}] ${task.taskId} already completed. Skipping.`); continue; }
    output.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);

    // Random queries: use computeRandomQuery (no API cost for query selection)
    const rng = mulberry32(task.seed || 42);
    const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
    const queryHistory: { x: [number, number, number]; result: boolean; vsSize: number }[] = [];
    while (!env.isDone()) {
      const x = computeRandomQuery(env, rng);
      const qr = env.query(x);
      queryHistory.push({ x, result: qr.result, vsSize: qr.version_space_size });
    }

    // Model final: one API call to predict the rule
    const messages = [
      { role: 'system', content: 'You are a rule induction agent. Answer concisely with JSON.' },
      { role: 'user', content: buildFinalPrompt(task, queryHistory) },
    ];
    const conversation: ResultRecord['conversation'] = [...messages] as ResultRecord['conversation'];
    let predictedRuleId: string | null = null;

    try {
      const resp = await api.call({ model, messages, temperature: 0, max_tokens: 128 }, PROMPT_VERSION);
      const text = resp.content;
      conversation.push({ role: 'assistant', content: text, usage: resp.usage, response_source: resp.response_source });
      try {
        const obj = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
        predictedRuleId = obj.rule_id || obj.ruleId || null;
      } catch {
        const m = text.match(/\b(EQ_x\d_\d|EVEN_x\d|ODD_x\d|GT_x\d_\d|LT_x\d_\d|ORDER_x\d_x\d)\b/);
        if (m) predictedRuleId = m[1];
      }
    } catch (e: any) {
      output.log(`  -> ERROR during model final: ${e.message}`);
    }

    output.appendResult({
      taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId,
      correct: predictedRuleId === task.trueRuleId,
      queriesMade: env.queriesMade,
      finalVersionSpaceSize: env.versionSpace.length,
      initialVersionSpaceSize: task.versionSpaceRuleIds.length,
      conversation,
      queryResults: [],
      config,
      taskKey: '',
      responseSources: conversation.filter(m => m.role === 'assistant').map(m => m.response_source || 'api').filter((s): s is ('api' | 'cache_replay') => true),
    });
    output.log(`  -> predicted: ${predictedRuleId}, correct: ${predictedRuleId === task.trueRuleId}, queries: ${env.queriesMade}`);
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('ActiveRandom batch complete.');
}

if (process.argv[1] && process.argv[1].endsWith('runActiveRandom.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'active_random',
    maxTokens: 128,
    parserMode: 'strict',
  });
  const ctx: ExperimentContext = {
    experimentId: opt.experimentId,
    condition: opt.condition,
    model: opt.model,
    promptVersion: PROMPT_VERSION,
    temperature: opt.temperature,
    maxTokens: opt.maxTokens,
    maxQueries: opt.maxQueries,
    minQueries: opt.minQueries,
    parserMode: opt.parserMode,
    seed: opt.seed,
    ruleSpaceVersion: opt.ruleSpaceVersion,
    taskFilePath: opt.taskFilePath,
  };
  const output = new OutputManager(ctx, { resume: opt.resume, overwrite: opt.overwrite });
  const api = buildApiClient(opt, output);
  const tasksData = JSON.parse(fs.readFileSync(opt.taskFilePath, 'utf-8')) as Task[];
  output.log(`Running active_random batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runActiveRandomBatch(tasksData, output, api, opt.model);
  output.close();
}
