import fs from 'fs';
import type { Task } from './taskGenerator.js';
import {
  type ExperimentContext, type CliOptions,
  OutputManager, RequestLedger, ResponseCache, ApiClientWrapper,
  parseCommonArgs,
} from './apiSafety.js';
import { buildApiClient, runSingleTask, RunConfig, buildSystemPrompt as buildBaseSystemPrompt, buildInitialPrompt as buildBaseInitialPrompt } from './runActive.js';

const PROMPT_VERSION = 'v2_active_minquery';

function buildSystemPrompt(): string {
  return `${buildBaseSystemPrompt()}\n\nCRITICAL: You MUST make at least 3 queries before answering. Do NOT output final before 3 queries.`;
}

function buildInitialPrompt(task: Task): string {
  return `${buildBaseInitialPrompt(task)}\n\nREMEMBER: You must make at least 3 queries before final.`;
}

export async function runActiveMinQueryBatch(tasks: Task[], output: OutputManager, api: ApiClientWrapper, model: string = 'deepseek-chat'): Promise<void> {
  const config: RunConfig = { model, maxQueries: 6, temperature: 0, seed: tasks[0]?.seed || 42, minQueries: 3, maxTokens: 256 };
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (output.isTaskCompleted(task.taskId)) { output.log(`[${i + 1}/${tasks.length}] ${task.taskId} already completed. Skipping.`); continue; }
    output.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);
    const result = await runSingleTask(task, config, api, {
      systemPrompt: buildSystemPrompt(),
      initialPrompt: buildInitialPrompt(task),
      promptVersion: PROMPT_VERSION,
    });
    output.appendResult({
      taskId: result.taskId, trueRuleId: result.trueRuleId, predictedRuleId: result.predictedRuleId,
      correct: result.correct, queriesMade: result.queriesMade,
      finalVersionSpaceSize: result.finalVersionSpaceSize,
      initialVersionSpaceSize: result.initialVersionSpaceSize,
      conversation: result.conversation,
      queryResults: result.queryResults,
      config: result.config,
      taskKey: '',
      responseSources: result.conversation.filter(m => m.role === 'assistant').map(m => m.response_source || 'api').filter((s): s is ('api' | 'cache_replay') => true),
    });
    output.log(`  -> predicted: ${result.predictedRuleId}, correct: ${result.correct}, queries: ${result.queriesMade}`);
    await new Promise(r => setTimeout(r, 500));
  }
  output.log('ActiveMinQuery batch complete.');
}

if (process.argv[1] && process.argv[1].endsWith('runActiveMinQuery.ts')) {
  const opt = parseCommonArgs(process.argv.slice(2), {
    condition: 'active_minquery',
    maxTokens: 256,
    minQueries: 3,
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
  output.log(`Running active_minquery batch: ${tasksData.length} tasks, model=${opt.model}`);
  await runActiveMinQueryBatch(tasksData, output, api, opt.model);
  output.close();
}
