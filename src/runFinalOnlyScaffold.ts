import fs from 'fs';
import { DISTINCT_RULES } from './rules.js';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type ResultRecord, type CliOptions,
  OutputManager, RequestLedger, ResponseCache, ApiClientWrapper,
  parseCommonArgs,
} from './apiSafety.js';
import { RuleInductionEnv } from './env.js';

const PROMPT_VERSION = 'v2_final_only_scaffold';

function buildSystemPrompt(): string {
  return `You are a rule induction agent. Available rules: ${DISTINCT_RULES.join(', ')}.

You have at most 6 queries. First query, then continue querying until you are confident.

OUTPUT ONLY ONE LINE OF JSON PER TURN.
- Query: {"action":"query","x":[x0,x1,x2]}
- Final: {"action":"final","top_3_hypotheses":["RULE_ID1","RULE_ID2","RULE_ID3"],"why":"Brief evidence","rule_id":"<RULE_ID>"}`;
}

function buildInitialPrompt(task: Task): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  return `Initial observations:\n${obsStr}\n\nCandidate rules: ${task.versionSpaceRuleIds.length}\nQueries remaining: 6\nOutput JSON action now.`;
}

function parseFinalOnlyResponse(text: string): { action: 'query' | 'final' | null; x: [number, number, number] | null; ruleId: string | null } {
  const t = text.replace(/^```json\s*|\s*```$/g, '').trim();
  try {
    const obj = JSON.parse(t);
    if (obj.action === 'query' && Array.isArray(obj.x) && obj.x.length === 3 && obj.x.every((v: any) => Number.isInteger(v) && v >= 0 && v <= 9)) {
      return { action: 'query', x: obj.x as [number, number, number], ruleId: null };
    }
    if (obj.action === 'final') {
      const ruleId = obj.rule_id || obj.ruleId || null;
      return { action: 'final', x: null, ruleId };
    }
  } catch {}
  return { action: null, x: null, ruleId: null };
}

export async function runFinalOnlyScaffoldBatch(tasks: Task[], output: OutputManager, api: ApiClientWrapper, model: string = 'deepseek-chat'): Promise<void> {
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
    let predictedRuleId: string | null = null;

    for (let step = 0; step < 14; step++) {
      const resp = await api.call({ model, messages, temperature: 0, max_tokens: 512 }, PROMPT_VERSION);
      const text = resp.content;
      messages.push({ role: 'assistant', content: text });
      conversation.push({ role: 'assistant', content: text, usage: resp.usage, response_source: resp.response_source });

      const parsed = parseFinalOnlyResponse(text);
      if (parsed.action === 'query' && parsed.x) {
        if (!env.isDone()) {
          const qr = env.query(parsed.x);
          const fb = `{"query_result":{"x":[${parsed.x.join(',')}],"output":${qr.result},"vs_size":${qr.version_space_size},"queries_left":${6 - env.queriesMade}}}`;
          messages.push({ role: 'user', content: fb });
          conversation.push({ role: 'user', content: fb });
        }
      } else if (parsed.action === 'final') {
        predictedRuleId = parsed.ruleId;
        break;
      } else {
        const fb = env.isDone()
          ? '{"error":"budget_exhausted","message":"No queries left. Output JSON final with top_3_hypotheses and rule_id."}'
          : '{"error":"invalid_format","message":"Output JSON with action query or final."}';
        messages.push({ role: 'user', content: fb });
        conversation.push({ role: 'user', content: fb });
      }
      if (env.isDone() && !predictedRuleId) {
        const fb = '{"error":"budget_exhausted","message":"No queries left. Output JSON final."}';
        messages.push({ role: 'user', content: fb });
        conversation.push({ role: 'user', content: fb });
      }
    }

    output.appendResult({
      taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId,
      correct: predictedRuleId === task.trueRuleId,
      queriesMade: env.queriesMade,
      finalVersionSpaceSize: env.versionSpace.length,
      initialVersionSpaceSize: task.versionSpaceRuleIds.length,
      conversation,
      queryResults: [],
      config: { model, maxQueries: 6, temperature: 0, seed: task.seed || 42, maxTokens: 512 },
      taskKey: '',
      responseSources: conversation.filter(m => m.role === 'assistant').map(m => m.response_source || 'api').filter((s): s is ('api' | 'cache_replay') => true),
    });
    output.log(`  -> predicted: ${predictedRuleId}, correct: ${predictedRuleId === task.trueRuleId}, queries: ${env.queriesMade}`);
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('FinalOnlyScaffold batch complete.');
}

if (process.argv[1] && process.argv[1].endsWith('runFinalOnlyScaffold.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'final_only_scaffold',
    maxTokens: 512,
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
  output.log(`Running final_only_scaffold batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runFinalOnlyScaffoldBatch(tasksData, output, api, opt.model);
  output.close();
}
