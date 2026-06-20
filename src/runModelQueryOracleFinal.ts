import fs from 'fs';
import { DISTINCT_RULES } from './rules.js';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type ResultRecord, type CliOptions,
  OutputManager, RequestLedger, ResponseCache, ApiClientWrapper,
  parseCommonArgs,
} from './apiSafety.js';
import { RuleInductionEnv } from './env.js';

const PROMPT_VERSION = 'v2_model_query_oracle_final';

function buildSystemPrompt(): string {
  return `You are a rule induction agent. Available rules: ${DISTINCT_RULES.join(', ')}.

You have at most 6 queries. Only choose queries; an oracle will determine the final rule from the version space.

OUTPUT ONLY ONE LINE OF JSON PER TURN:
{"action":"query","x":[x0,x1,x2]}`;
}

function buildInitialPrompt(task: Task): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  return `Initial observations:\n${obsStr}\n\nCandidate rules: ${task.versionSpaceRuleIds.length}\nQueries remaining: 6\nOutput JSON query now. The oracle will decide the final rule.`;
}

function parseQueryResponse(text: string): [number, number, number] | null {
  const t = text.replace(/^```json\s*|\s*```$/g, '').trim();
  try {
    const obj = JSON.parse(t);
    if (obj.action === 'query' && Array.isArray(obj.x) && obj.x.length === 3 && obj.x.every((v: any) => Number.isInteger(v) && v >= 0 && v <= 9)) {
      return obj.x as [number, number, number];
    }
  } catch {}
  const m = t.match(/\bQUERY:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return null;
}

export async function runModelQueryOracleFinalBatch(tasks: Task[], output: OutputManager, api: ApiClientWrapper, model: string = 'deepseek-chat'): Promise<void> {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (output.isTaskCompleted(task.taskId)) { output.log(`[${i + 1}/${tasks.length}] ${task.taskId} already completed. Skipping.`); continue; }
    output.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);

    const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildInitialPrompt(task) },
    ];
    const conversation: ResultRecord['conversation'] = [...messages];

    for (let step = 0; step < 14; step++) {
      const resp = await api.call({ model, messages, temperature: 0, max_tokens: 256 }, PROMPT_VERSION);
      const text = resp.content;
      messages.push({ role: 'assistant', content: text });
      conversation.push({ role: 'assistant', content: text, usage: resp.usage, response_source: resp.response_source });

      const x = parseQueryResponse(text);
      if (x && !env.isDone()) {
        const qr = env.query(x);
        const fb = `{"query_result":{"x":[${x.join(',')}],"output":${qr.result},"vs_size":${qr.version_space_size},"queries_left":${6 - env.queriesMade}}}`;
        messages.push({ role: 'user', content: fb });
        conversation.push({ role: 'user', content: fb });
      } else {
        const fb = env.isDone()
          ? '{"error":"budget_exhausted","message":"No queries left."}'
          : '{"error":"invalid_format","message":"Output JSON query."}';
        messages.push({ role: 'user', content: fb });
        conversation.push({ role: 'user', content: fb });
      }
      if (env.isDone()) break;
    }

    // Oracle final: pick first remaining rule in version space (no API)
    const predictedRuleId = env.versionSpace[0] || null;

    output.appendResult({
      taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId,
      correct: predictedRuleId === task.trueRuleId,
      queriesMade: env.queriesMade,
      finalVersionSpaceSize: env.versionSpace.length,
      initialVersionSpaceSize: task.versionSpaceRuleIds.length,
      conversation,
      queryResults: [],
      config: { model, maxQueries: 6, temperature: 0, seed: task.seed || 42, maxTokens: 256 },
      taskKey: '',
      responseSources: conversation.filter(m => m.role === 'assistant').map(m => m.response_source || 'api').filter((s): s is ('api' | 'cache_replay') => true),
    });
    output.log(`  -> predicted: ${predictedRuleId}, correct: ${predictedRuleId === task.trueRuleId}, queries: ${env.queriesMade}`);
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('ModelQueryOracleFinal batch complete.');
}

if (process.argv[1] && process.argv[1].endsWith('runModelQueryOracleFinal.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'model_query_oracle_final',
    maxTokens: 256,
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
  output.log(`Running model_query_oracle_final batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runModelQueryOracleFinalBatch(tasksData, output, api, opt.model);
  output.close();
}
