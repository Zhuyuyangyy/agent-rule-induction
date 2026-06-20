import fs from 'fs';
import { RULE_BY_ID, DISTINCT_RULES } from './rules.js';
import { RuleInductionEnv, type Observation, type QueryResult, computeGreedyOptimalQuery, computeRandomQuery } from './env.js';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type ResultRecord, type CliOptions,
  OutputManager, RequestLedger, ResponseCache, ApiClientWrapper,
  parseCommonArgs,
} from './apiSafety.js';

export const MAX_QUERIES = 6;

export const PROMPT_VERSION = 'v2_json_short';

const RULE_LIST = `CANDIDATE_RULES:
${DISTINCT_RULES.map(r => `- ${r}`).join('\n')}

Use EXACT rule IDs like EQ_x0_4, EVEN_x1, GT_x2_8, ORDER_x0_x1.`;

export function buildSystemPrompt(): string {
  return `You are a concise rule induction agent. Identify the hidden rule mapping (x0, x1, x2) -> True/False, where xi ∈ {0..9}.

${RULE_LIST}

You have at most ${MAX_QUERIES} queries. You MUST query to narrow candidates before answering.

OUTPUT ONLY ONE LINE OF JSON PER TURN. No markdown, no explanation outside JSON.
- Query: {"action":"query","x":[x0,x1,x2]}
- Final: {"action":"final","rule_id":"<RULE_ID>"}`;
}

export function buildInitialPrompt(task: Task): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  return `Initial observations:\n${obsStr}\n\nCandidate rules: ${task.versionSpaceRuleIds.length}\nQueries remaining: ${MAX_QUERIES}\nOutput JSON action now.`;
}

export interface ParsedResponse {
  action: 'query' | 'final' | null;
  x: [number, number, number] | null;
  ruleId: string | null;
  raw: string;
}

export function parseResponse(text: string, strictMode: boolean = true): ParsedResponse {
  let t = text.trim();
  // Strip markdown fences if present
  if (t.startsWith('```json')) t = t.replace(/^```json\s*/, '').replace(/\s*```\s*$/, '');
  if (t.startsWith('```')) t = t.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');
  try {
    const obj = JSON.parse(t);
    const action = obj.action || null;
    if (action === 'query') {
      const x = Array.isArray(obj.x) && obj.x.length === 3 ? obj.x as [number, number, number] : null;
      if (x && x.every(v => Number.isInteger(v) && v >= 0 && v <= 9)) return { action: 'query', x, ruleId: null, raw: text };
    }
    if (action === 'final') {
      const ruleId = obj.rule_id || obj.ruleId || null;
      if (ruleId && typeof ruleId === 'string') return { action: 'final', x: null, ruleId, raw: text };
    }
  } catch {}

  // Legacy line-based parser (loose mode only)
  if (!strictMode) {
    const line = t.split('\n').map(l => l.trim()).find(l => l) || '';
    const qm = line.match(/QUERY:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (qm) return { action: 'query', x: [parseInt(qm[1]), parseInt(qm[2]), parseInt(qm[3])], ruleId: null, raw: text };
    const am = line.match(/(?:ANSWER|FINAL_ANSWER):\s*(\S+)/i);
    if (am) return { action: 'final', x: null, ruleId: am[1], raw: text };
    // Fallback: last rule_id mention
    const rp = /\b(EQ_x\d_\d|EVEN_x\d|ODD_x\d|GT_x\d_\d|LT_x\d_\d|ORDER_x\d_x\d)\b/gi;
    const m = text.match(rp);
    if (m && m.length > 0) {
      const n = DISTINCT_RULES.find(r => r.toUpperCase() === m[m.length - 1].toUpperCase());
      if (n) return { action: 'final', x: null, ruleId: n, raw: text };
    }
  }

  return { action: null, x: null, ruleId: null, raw: text };
}

export interface RunConfig {
  model: string;
  maxQueries: number;
  temperature: number;
  seed: number;
  minQueries?: number;
  maxTokens?: number;
}

export interface RunResult {
  taskId: string; trueRuleId: string; predictedRuleId: string | null; correct: boolean;
  queriesMade: number; finalVersionSpaceSize: number; initialVersionSpaceSize: number;
  conversation: { role: string; content: string; usage?: any; response_source?: 'api' | 'cache_replay' }[];
  queryResults: QueryResult[]; config: RunConfig;
}

function normalizeRuleId(id: string | null): string | null {
  if (!id) return null;
  if (DISTINCT_RULES.includes(id)) return id;
  const c = id.toUpperCase().replace(/X(\d)/g, (_, d) => { const i = parseInt(d) - 1; return i >= 0 && i <= 2 ? 'X' + i : 'X' + d; });
  const n = DISTINCT_RULES.find(r => r.toUpperCase() === c);
  return n || null;
}

export async function runSingleTask(
  task: Task,
  config: RunConfig,
  api: ApiClientWrapper,
  opts?: { systemPrompt?: string; initialPrompt?: string; promptVersion?: string },
): Promise<RunResult> {
  const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, config.maxQueries);
  const systemPrompt = opts?.systemPrompt ?? buildSystemPrompt();
  const initialPrompt = opts?.initialPrompt ?? buildInitialPrompt(task);
  const promptVersion = opts?.promptVersion ?? PROMPT_VERSION;
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: initialPrompt },
  ];
  const conversation: RunResult['conversation'] = [...messages];
  const queryResults: QueryResult[] = [];
  let predictedRuleId: string | null = null;
  const responseSources: ('api' | 'cache_replay')[] = [];

  for (let step = 0; step < config.maxQueries * 2 + 2; step++) {
    const resp = await api.call({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens || 256,
    }, promptVersion);
    responseSources.push(resp.response_source);
    const responseText = resp.content;
    messages.push({ role: 'assistant', content: responseText });
    conversation.push({ role: 'assistant', content: responseText, usage: resp.usage, response_source: resp.response_source });

    const parsed = parseResponse(responseText, true);

    if (parsed.action === 'query' && parsed.x) {
      if (!env.isDone()) {
        const qr = env.query(parsed.x);
        queryResults.push(qr);
        const fb = `{"query_result":{"x":[${parsed.x.join(',')}],"output":${qr.result},"vs_size":${qr.version_space_size},"queries_left":${config.maxQueries - env.queriesMade}}}`;
        messages.push({ role: 'user', content: fb });
        conversation.push({ role: 'user', content: fb });
      }
    } else if (parsed.action === 'final') {
      if ((config.minQueries || 0) > 0 && env.queriesMade < config.minQueries!) {
        if (env.queriesMade < config.maxQueries) {
          const x = env.versionSpace.length <= 1
            ? computeRandomQuery(env, () => Math.random())
            : computeGreedyOptimalQuery(env);
          const qr = env.query(x, { force: true });
          queryResults.push(qr);
          const fb = `{"error":"min_queries_not_met","required":${config.minQueries},"made":${env.queriesMade},"auto_query":{"x":[${x.join(',')}],
"output":${qr.result},"vs_size":${qr.version_space_size}},"message":"You must make at least ${config.minQueries} queries before final. Output JSON query."}`;
          messages.push({ role: 'user', content: fb });
          conversation.push({ role: 'user', content: fb });
        } else {
          const fb = `{"error":"min_queries_not_met","required":${config.minQueries},"made":${env.queriesMade},"message":"Budget exhausted before min_queries. Output JSON query."}`;
          messages.push({ role: 'user', content: fb });
          conversation.push({ role: 'user', content: fb });
        }
        continue;
      }
      predictedRuleId = normalizeRuleId(parsed.ruleId);
      break;
    } else {
      const fb = env.isDone()
        ? '{"error":"budget_exhausted","message":"No queries left. Output JSON final with rule_id."}'
        : `{"error":"invalid_format","message":"Output JSON: {\\"action\\":\\"query\\",\\"x\\":[x0,x1,x2]} or {\\"action\\":\\"final\\",\\"rule_id\\":\\"RULE_ID\\"}. Queries left: ${config.maxQueries - env.queriesMade}`;
      messages.push({ role: 'user', content: fb });
      conversation.push({ role: 'user', content: fb });
    }

    if (env.isDone() && !predictedRuleId) {
      const fb = '{"error":"budget_exhausted","message":"No queries left. Output JSON final with rule_id."}';
      messages.push({ role: 'user', content: fb });
      conversation.push({ role: 'user', content: fb });
    }
  }

  if (!predictedRuleId) {
    try {
      const resp = await api.call({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: 128,
      }, promptVersion);
      responseSources.push(resp.response_source);
      const r = resp.content;
      messages.push({ role: 'assistant', content: r });
      conversation.push({ role: 'assistant', content: r, usage: resp.usage, response_source: resp.response_source });
      const p = parseResponse(r, true);
      if (p.action === 'final') {
        if ((config.minQueries || 0) > 0 && env.queriesMade < config.minQueries!) {
          // Still below minQueries; do not accept this final answer
        } else {
          predictedRuleId = normalizeRuleId(p.ruleId);
        }
      }
    } catch {}
  }

  if (!predictedRuleId && env.versionSpace.length > 0) predictedRuleId = env.versionSpace[0];

  return {
    taskId: task.taskId,
    trueRuleId: task.trueRuleId,
    predictedRuleId,
    correct: predictedRuleId === task.trueRuleId,
    queriesMade: env.queriesMade,
    finalVersionSpaceSize: env.versionSpace.length,
    initialVersionSpaceSize: task.versionSpaceRuleIds.length,
    conversation,
    queryResults,
    config,
  };
}

export async function runBatch(
  tasks: Task[],
  config: RunConfig,
  output: OutputManager,
  api: ApiClientWrapper,
): Promise<void> {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (output.isTaskCompleted(task.taskId)) {
      output.log(`[${i + 1}/${tasks.length}] ${task.taskId} already completed. Skipping.`);
      continue;
    }
    output.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);
    try {
      const result = await runSingleTask(task, config, api);
      const record: ResultRecord = {
        taskId: result.taskId,
        trueRuleId: result.trueRuleId,
        predictedRuleId: result.predictedRuleId,
        correct: result.correct,
        queriesMade: result.queriesMade,
        finalVersionSpaceSize: result.finalVersionSpaceSize,
        initialVersionSpaceSize: result.initialVersionSpaceSize,
        conversation: result.conversation,
        queryResults: result.queryResults,
        config: result.config,
        taskKey: '', // filled by OutputManager.appendResult
        responseSources: result.conversation.filter(m => m.role === 'assistant').map(m => m.response_source || 'api').filter((s): s is ('api' | 'cache_replay') => true),
      };
      output.appendResult(record);
      output.log(`  -> predicted: ${result.predictedRuleId}, correct: ${result.correct}, queries: ${result.queriesMade}`);
    } catch (e: any) {
      output.log(`  -> ERROR: ${e.message}`);
      const record: ResultRecord = {
        taskId: task.taskId,
        trueRuleId: task.trueRuleId,
        predictedRuleId: null,
        correct: false,
        queriesMade: 0,
        finalVersionSpaceSize: -1,
        initialVersionSpaceSize: task.versionSpaceRuleIds.length,
        conversation: [],
        queryResults: [],
        config,
        taskKey: '',
        responseSources: [],
      };
      output.appendResult(record);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('Batch complete.');
}

function buildContextFromCli(opt: CliOptions): ExperimentContext {
  return {
    experimentId: opt.experimentId,
    condition: opt.condition,
    model: opt.model,
    promptVersion: opt.promptVersion,
    temperature: opt.temperature,
    maxTokens: opt.maxTokens,
    maxQueries: opt.maxQueries,
    minQueries: opt.minQueries,
    parserMode: opt.parserMode,
    seed: opt.seed,
    ruleSpaceVersion: opt.ruleSpaceVersion,
    taskFilePath: opt.taskFilePath,
  };
}

export function buildApiClient(opt: CliOptions, output: OutputManager): ApiClientWrapper {
  const cache = new ResponseCache(output.cacheDir, opt.cacheMode);
  const ledger = new RequestLedger(output.ledgerPath);
  const baseUrl = opt.baseUrl || process.env.OPENAI_BASE_URL || '';
  const apiKey = opt.apiKey || process.env.OPENAI_API_KEY;
  return new ApiClientWrapper({ ledger, cache, baseUrl, apiKey });
}

if (process.argv[1] && process.argv[1].endsWith('runActive.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'active',
    maxTokens: 256,
    parserMode: 'strict',
  });
  const ctx = buildContextFromCli(opt);
  const output = new OutputManager(ctx, { resume: opt.resume, overwrite: opt.overwrite });
  const api = buildApiClient(opt, output);

  const tasksData = JSON.parse(fs.readFileSync(opt.taskFilePath, 'utf-8')) as Task[];
  const config: RunConfig = {
    model: opt.model,
    maxQueries: opt.maxQueries,
    temperature: opt.temperature,
    seed: opt.seed,
    minQueries: opt.minQueries,
    maxTokens: opt.maxTokens,
  };
  output.log(`Running active batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runBatch(tasksData, config, output, api);
  output.close();
}
