import fs from 'fs';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type CliOptions,
  OutputManager, RequestLedger, ResponseCache, ApiClientWrapper,
  parseCommonArgs,
} from './apiSafety.js';
import { buildApiClient, RunConfig, type RunResult } from './runActive.js';
import { RuleInductionEnv } from './env.js';
import { DISTINCT_RULES } from './rules.js';

const PROMPT_VERSION = 'v2_scaffold_short';

function buildScaffoldPrompt(task: Task): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  return `Initial observations:
${obsStr}

Candidate rules: ${task.versionSpaceRuleIds.length}
Queries remaining: 6

For each turn, output ONE JSON object (no extra text) with a structured reasoning step and an action:

{"top_3_hypotheses":["RULE_ID1","RULE_ID2","RULE_ID3"],"why_discriminative":"This query distinguishes X from Y because...","action":"query","x":[x0,x1,x2]}

When ready to answer:
{"top_3_hypotheses":["RULE_ID1","RULE_ID2","RULE_ID3"],"why_discriminative":"...","action":"final","rule_id":"<RULE_ID>"}

Available rules: ${DISTINCT_RULES.join(', ')}`;
}

function buildScaffoldSystemPrompt(): string {
  return `You are a rule induction agent. Be concise.

Available rules: ${DISTINCT_RULES.join(', ')}

Output ONLY one JSON object per turn. No markdown, no explanation outside JSON. Use EXACT rule IDs.`;
}

export async function runScaffoldBatch(tasks: Task[], output: OutputManager, api: ApiClientWrapper, model: string = 'deepseek-chat'): Promise<void> {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (output.isTaskCompleted(task.taskId)) { output.log(`[${i + 1}/${tasks.length}] ${task.taskId} already completed. Skipping.`); continue; }
    output.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);

    const config: RunConfig = { model, maxQueries: 6, temperature: 0, seed: task.seed || 42, minQueries: 0, maxTokens: 512 };
    const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
    const messages = [
      { role: 'system', content: buildScaffoldSystemPrompt() },
      { role: 'user', content: buildScaffoldPrompt(task) },
    ];
    const conversation: RunResult['conversation'] = [...messages];
    let predictedRuleId: string | null = null;

    for (let step = 0; step < 14; step++) {
      const resp = await api.call({ model, messages, temperature: 0, max_tokens: 512 }, PROMPT_VERSION);
      const text = resp.content;
      messages.push({ role: 'assistant', content: text });
      conversation.push({ role: 'assistant', content: text, usage: resp.usage, response_source: resp.response_source });

      let parsed: any = null;
      try { parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')); } catch {}

      if (parsed?.action === 'query' && Array.isArray(parsed.x) && parsed.x.length === 3) {
        if (!env.isDone()) {
          const qr = env.query(parsed.x as [number, number, number]);
          const fb = `{"query_result":{"x":[${parsed.x.join(',')}],"output":${qr.result},"vs_size":${qr.version_space_size},"queries_left":${6 - env.queriesMade}}}`;
          messages.push({ role: 'user', content: fb });
          conversation.push({ role: 'user', content: fb });
        }
      } else if (parsed?.action === 'final') {
        predictedRuleId = parsed.rule_id || parsed.ruleId || null;
        break;
      } else {
        const fb = env.isDone()
          ? '{"error":"budget_exhausted","message":"No queries left. Output JSON final with rule_id."}'
          : '{"error":"invalid_format","message":"Output one JSON object with action query or final."}';
        messages.push({ role: 'user', content: fb });
        conversation.push({ role: 'user', content: fb });
      }
      if (env.isDone() && !predictedRuleId) {
        const fb = '{"error":"budget_exhausted","message":"No queries left. Output JSON final with rule_id."}';
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
      config,
      taskKey: '',
      responseSources: conversation.filter(m => m.role === 'assistant').map(m => m.response_source || 'api').filter((s): s is ('api' | 'cache_replay') => true),
    });
    output.log(`  -> predicted: ${predictedRuleId}, correct: ${predictedRuleId === task.trueRuleId}, queries: ${env.queriesMade}`);
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('Scaffold batch complete.');
}

if (process.argv[1] && process.argv[1].endsWith('runScaffold.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'scaffold',
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
  const api = buildApiClient(opt, output);
  const tasksData = JSON.parse(fs.readFileSync(opt.taskFilePath, 'utf-8')) as Task[];
  output.log(`Running scaffold batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runScaffoldBatch(tasksData, output, api, opt.model);
  output.close();
}
