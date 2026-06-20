import fs from 'fs';
import { DISTINCT_RULES } from './rules.js';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type ResultRecord, type CliOptions,
  OutputManager, RequestLedger, ResponseCache, ApiClientWrapper,
  parseCommonArgs,
} from './apiSafety.js';
import { RuleInductionEnv, computeGreedyOptimalQuery } from './env.js';

const PROMPT_VERSION = 'v2_oracle_query_model_final';

function buildFinalPrompt(task: Task, queryHistory: { x: [number, number, number]; result: boolean; vsSize: number }[]): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  const qStr = queryHistory.map(q => `(${q.x.join(',')}) -> ${q.result} (VS=${q.vsSize})`).join('\n');
  return `Identify the hidden rule from these observations and query results.

Initial observations:
${obsStr}

Queries (selected by optimal strategy):
${qStr}

Available rules: ${DISTINCT_RULES.join(', ')}

Output ONLY JSON: {"rule_id":"<RULE_ID>"}`;
}

export async function runOracleQueryModelFinalBatch(tasks: Task[], output: OutputManager, api: ApiClientWrapper, model: string = 'deepseek-chat'): Promise<void> {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (output.isTaskCompleted(task.taskId)) { output.log(`[${i + 1}/${tasks.length}] ${task.taskId} already completed. Skipping.`); continue; }
    output.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);

    // Oracle queries: no API cost
    const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
    const queryHistory: { x: [number, number, number]; result: boolean; vsSize: number }[] = [];
    while (!env.isDone()) {
      const x = computeGreedyOptimalQuery(env);
      if (!x) break;
      const qr = env.query(x);
      queryHistory.push({ x, result: qr.result, vsSize: qr.version_space_size });
    }

    // Model final: one API call
    const messages = [
      { role: 'system', content: 'You are a rule induction agent. Answer concisely with JSON.' },
      { role: 'user', content: buildFinalPrompt(task, queryHistory) },
    ];
    const conversation: ResultRecord['conversation'] = [...messages];
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
      config: { model, maxQueries: 6, temperature: 0, seed: task.seed || 42, maxTokens: 128 },
      taskKey: '',
      responseSources: conversation.filter(m => m.role === 'assistant').map(m => m.response_source || 'api').filter((s): s is ('api' | 'cache_replay') => true),
    });
    output.log(`  -> predicted: ${predictedRuleId}, correct: ${predictedRuleId === task.trueRuleId}, queries: ${env.queriesMade}`);
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('OracleQueryModelFinal batch complete.');
}

if (process.argv[1] && process.argv[1].endsWith('runOracleQueryModelFinal.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'oracle_query_model_final',
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
  const cache = new ResponseCache(output.cacheDir, opt.cacheMode);
  const ledger = new RequestLedger(output.ledgerPath);
  const baseUrl = opt.baseUrl || process.env.OPENAI_BASE_URL || '';
  const apiKey = opt.apiKey || process.env.OPENAI_API_KEY;
  const api = new ApiClientWrapper({ ledger, cache, baseUrl, apiKey });
  const tasksData = JSON.parse(fs.readFileSync(opt.taskFilePath, 'utf-8')) as Task[];
  output.log(`Running oracle_query_model_final batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runOracleQueryModelFinalBatch(tasksData, output, api, opt.model);
  output.close();
}
