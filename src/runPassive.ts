import fs from 'fs';
import { DISTINCT_RULES } from './rules.js';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type ResultRecord, type CliOptions,
  OutputManager, RequestLedger, ResponseCache, ApiClientWrapper,
  parseCommonArgs,
} from './apiSafety.js';

const PROMPT_VERSION = 'v2_passive_short';

function buildPassivePrompt(task: Task): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  return `Identify the hidden rule from these observations:
${obsStr}

Rules: ${DISTINCT_RULES.join(', ')}

Output ONLY JSON: {"rule_id":"<RULE_ID>"}`;
}

async function runPassiveSingle(task: Task, model: string, api: ApiClientWrapper): Promise<ResultRecord> {
  const messages = [
    { role: 'system', content: 'You are a rule induction agent. Answer concisely.' },
    { role: 'user', content: buildPassivePrompt(task) },
  ];
  const resp = await api.call({ model, messages, temperature: 0, max_tokens: 64 }, PROMPT_VERSION);
  const text = resp.content.trim();
  let predictedRuleId: string | null = null;
  try {
    const obj = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
    predictedRuleId = obj.rule_id || obj.ruleId || null;
  } catch {
    // Fallback regex
    const m = text.match(/\b(EQ_x\d_\d|EVEN_x\d|ODD_x\d|GT_x\d_\d|LT_x\d_\d|ORDER_x\d_x\d)\b/);
    if (m) predictedRuleId = m[1];
  }
  return {
    taskId: task.taskId,
    trueRuleId: task.trueRuleId,
    predictedRuleId,
    correct: predictedRuleId === task.trueRuleId,
    queriesMade: 0,
    finalVersionSpaceSize: task.versionSpaceRuleIds.length,
    initialVersionSpaceSize: task.versionSpaceRuleIds.length,
    conversation: [...messages, { role: 'assistant', content: resp.content, usage: resp.usage, response_source: resp.response_source }],
    queryResults: [],
    config: { model, maxQueries: 0, temperature: 0, seed: task.seed || 42, maxTokens: 64 },
    taskKey: '',
    responseSources: [resp.response_source],
  };
}

export async function runPassiveBatch(
  tasks: Task[],
  output: OutputManager,
  api: ApiClientWrapper,
  model: string = 'deepseek-chat',
): Promise<void> {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (output.isTaskCompleted(task.taskId)) {
      output.log(`[${i + 1}/${tasks.length}] ${task.taskId} already completed. Skipping.`);
      continue;
    }
    output.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);
    try {
      const result = await runPassiveSingle(task, model, api);
      output.appendResult(result);
      output.log(`  -> predicted: ${result.predictedRuleId}, correct: ${result.correct}`);
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
        config: { model, maxQueries: 0, temperature: 0, seed: task.seed || 42, maxTokens: 64 },
        taskKey: '',
        responseSources: [],
      };
      output.appendResult(record);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('Passive batch complete.');
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

if (process.argv[1] && process.argv[1].endsWith('runPassive.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'passive',
    maxTokens: 64,
    maxQueries: 0,
    parserMode: 'strict',
  });
  const ctx = buildContextFromCli(opt);
  const output = new OutputManager(ctx, { resume: opt.resume, overwrite: opt.overwrite });
  const cache = new ResponseCache(output.cacheDir, opt.cacheMode);
  const ledger = new RequestLedger(output.ledgerPath);
  const baseUrl = opt.baseUrl || process.env.OPENAI_BASE_URL || '';
  const apiKey = opt.apiKey || process.env.OPENAI_API_KEY;
  const api = new ApiClientWrapper({ ledger, cache, baseUrl, apiKey });

  const tasksData = JSON.parse(fs.readFileSync(opt.taskFilePath, 'utf-8')) as Task[];
  output.log(`Running passive batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runPassiveBatch(tasksData, output, api, opt.model);
  output.close();
}
