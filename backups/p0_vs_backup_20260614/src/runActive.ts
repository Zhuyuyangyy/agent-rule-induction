import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { RULE_BY_ID, INPUT_SPACE, DISTINCT_RULES } from './rules.js';
import { RuleInductionEnv, computeGreedyOptimalQuery, type Observation, type QueryResult } from './env.js';
import type { Task } from './taskGenerator.js';

export const MAX_QUERIES = 6;

const RULE_LIST = `The candidate rules are one of these 48 rules (use EXACT rule IDs):
- EQ_x0_0, EQ_x0_2, EQ_x0_4, EQ_x0_6: x0 equals 0/2/4/6
- EQ_x1_0, EQ_x1_2, EQ_x1_4, EQ_x1_6: x1 equals 0/2/4/6
- EQ_x2_0, EQ_x2_2, EQ_x2_4, EQ_x2_6: x2 equals 0/2/4/6
- EVEN_x0, EVEN_x1, EVEN_x2: x0/x1/x2 is even
- ODD_x0, ODD_x1, ODD_x2: x0/x1/x2 is odd
- GT_x0_2, GT_x0_4, GT_x0_6, GT_x0_8: x0 > 2/4/6/8
- GT_x1_2, GT_x1_4, GT_x1_6, GT_x1_8: x1 > 2/4/6/8
- GT_x2_2, GT_x2_4, GT_x2_6, GT_x2_8: x2 > 2/4/6/8
- LT_x0_2, LT_x0_4, LT_x0_6, LT_x0_8: x0 < 2/4/6/8
- LT_x1_2, LT_x1_4, LT_x1_6, LT_x1_8: x1 < 2/4/6/8
- LT_x2_2, LT_x2_4, LT_x2_6, LT_x2_8: x2 < 2/4/6/8
- ORDER_x0_x1, ORDER_x0_x2, ORDER_x1_x0, ORDER_x1_x2, ORDER_x2_x0, ORDER_x2_x1: xi < xj`;

export function buildSystemPrompt(): string {
  return `You are a rule induction agent. Your goal is to identify a hidden rule that maps inputs (x0, x1, x2) to True/False, where each xi is a digit from 0-9. x0 is the FIRST number, x1 is the SECOND number, x2 is the THIRD number.

You will be given some initial observations of the form: input -> output.
You MUST query specific inputs to get their outputs before guessing the rule.
After your queries, you must state your final guess for the rule.

${RULE_LIST}

You have at most ${MAX_QUERIES} queries. Choose queries that maximally discriminate between remaining candidate rules.

IMPORTANT: You MUST start by querying. Do NOT guess without querying first.
Each response MUST contain either a QUERY or an ANSWER (not both in the same response).

Format your query as: QUERY: x0,x1,x2
Format your final answer as: ANSWER: rule_id (use the EXACT rule ID like EQ_x0_4, EVEN_x1, GT_x2_8, ORDER_x0_x1)

Be concise. Briefly reason about which rules remain, then output your QUERY.`;
}

export function buildInitialPrompt(task: Task): string {
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  return `Here are the initial observations:\n${obsStr}\n\nThe version space has ${task.versionSpaceRuleIds.length} candidate rules remaining.\nWhat is your first query? Remember, you have at most ${MAX_QUERIES} queries total.`;
}

export interface ParsedResponse { queries: [number, number, number][]; answer: string | null; raw: string; }

export function parseResponse(text: string, strictMode: boolean = false): ParsedResponse {
  const queries: [number, number, number][] = [];
  let answer: string | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const qm = trimmed.match(/QUERY:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (qm) queries.push([parseInt(qm[1]), parseInt(qm[2]), parseInt(qm[3])]);
    const am = trimmed.match(/(?:ANSWER|FINAL_ANSWER):\s*(\S+)/i);
    if (am) answer = am[1];
  }
  // In strict mode, ONLY recognize explicit ANSWER:/FINAL_ANSWER: markers
  // This prevents false matches when the model mentions rule_ids in reasoning
  if (!strictMode && !answer) {
    const rp = /\b(EQ_x\d_\d|EVEN_x\d|ODD_x\d|GT_x\d_\d|LT_x\d_\d|ORDER_x\d_x\d)\b/gi;
    const m = text.match(rp);
    if (m && m.length > 0) { const n = DISTINCT_RULES.find(r => r.toUpperCase() === m[m.length - 1].toUpperCase()); if (n) answer = n; }
  }
  if (!strictMode && !answer) {
    const rp1 = /\b(EQ_x[123]_\d|EVEN_x[123]|ODD_x[123]|GT_x[123]_\d|LT_x[123]_\d|ORDER_x[123]_x[123])\b/gi;
    const m1 = text.match(rp1);
    if (m1 && m1.length > 0) {
      const c = m1[m1.length - 1].toUpperCase().replace(/X(\d)/g, (_, d) => { const i = parseInt(d) - 1; return i >= 0 && i <= 2 ? 'X' + i : 'X' + d; });
      const n = DISTINCT_RULES.find(r => r.toUpperCase() === c); if (n) answer = n;
    }
  }
  if (answer && !DISTINCT_RULES.includes(answer)) {
    const c = answer.toUpperCase().replace(/X(\d)/g, (_, d) => { const i = parseInt(d) - 1; return i >= 0 && i <= 2 ? 'X' + i : 'X' + d; });
    const n = DISTINCT_RULES.find(r => r.toUpperCase() === c); if (n) answer = n;
  }
  return { queries, answer, raw: text };
}

export interface RunConfig { model: string; maxQueries: number; temperature: number; seed: number; minQueries?: number; }
export const DEFAULT_CONFIG: RunConfig = { model: 'deepseek-chat', maxQueries: MAX_QUERIES, temperature: 0.0, seed: 42, minQueries: 0 };

export interface RunResult {
  taskId: string; trueRuleId: string; predictedRuleId: string | null; correct: boolean;
  queriesMade: number; finalVersionSpaceSize: number; initialVersionSpaceSize: number;
  conversation: { role: string; content: string }[]; queryResults: QueryResult[]; config: RunConfig;
}

export async function runSingleTask(task: Task, config: RunConfig): Promise<RunResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, config.maxQueries);
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildInitialPrompt(task) },
  ];
  const queryResults: QueryResult[] = [];
  let predictedRuleId: string | null = null;

  for (let step = 0; step < config.maxQueries * 2 + 2; step++) {
    let completion;
    try { completion = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 2048 }); }
    catch (e: any) { console.error(`API error: ${e.message}`); break; }
    const responseText = completion.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: responseText });
    const parsed = parseResponse(responseText, true);  // strictMode: prevent false answer matches
    for (const q of parsed.queries) {
      if (!env.isDone()) {
        const qr = env.query(q); queryResults.push(qr);
        messages.push({ role: 'user', content: `Query (${q[0]},${q[1]},${q[2]}) -> ${qr.result}\nVersion space: ${qr.version_space_size}${qr.is_duplicate ? ' [DUPLICATE]' : ''}\nQueries left: ${config.maxQueries - env.queriesMade}` });
      }
    }
    if (parsed.answer) {
      // MinQuery enforcement: reject premature final
      if ((config.minQueries || 0) > 0 && env.queriesMade < config.minQueries!) {
        messages.push({ role: 'user', content: `You must make at least ${config.minQueries} queries before answering. You have only made ${env.queriesMade} queries. Provide QUERY: x0,x1,x2 instead.` });
        continue;
      }
      predictedRuleId = parsed.answer; break;
    }
    if (parsed.queries.length === 0 && !parsed.answer) {
      if (env.isDone()) messages.push({ role: 'user', content: 'No more queries. ANSWER: rule_id' });
      else messages.push({ role: 'user', content: `You must provide a QUERY or ANSWER. Use QUERY: x0,x1,x2 or ANSWER: rule_id. Queries left: ${config.maxQueries - env.queriesMade}` });
    }
    if (env.isDone() && !parsed.answer) messages.push({ role: 'user', content: 'No more queries. ANSWER: rule_id' });
  }
  if (!predictedRuleId) {
    try {
      const c = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 64 });
      const r = c.choices[0]?.message?.content || ''; messages.push({ role: 'assistant', content: r });
      const p = parseResponse(r, true); if (p.answer) predictedRuleId = p.answer;
    } catch (e: any) { console.error(`Final error: ${e.message}`); }
  }
  return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: predictedRuleId === task.trueRuleId, queriesMade: env.queriesMade, finalVersionSpaceSize: env.versionSpace.length, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: messages, queryResults, config };
}

export async function runBatch(tasks: Task[], config: RunConfig, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, '');
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`[${i + 1}/${tasks.length}] Task ${task.taskId} (true: ${task.trueRuleId})...`);
    try {
      const result = await runSingleTask(task, config);
      fs.appendFileSync(outputPath, JSON.stringify(result) + '\n');
      console.log(`  -> predicted: ${result.predictedRuleId}, correct: ${result.correct}, queries: ${result.queriesMade}`);
    } catch (e: any) {
      console.error(`  -> ERROR: ${e.message}`);
      fs.appendFileSync(outputPath, JSON.stringify({ taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId: null, correct: false, error: e.message, queriesMade: 0, finalVersionSpaceSize: -1, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: [], queryResults: [], config }) + '\n');
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`\nBatch complete. Results: ${outputPath}`);
}

if (process.argv[1] && process.argv[1].endsWith('runActive.ts')) {
  const args = process.argv.slice(2);
  let tasksPath = 'results/tasks_seed42.json', model = 'deepseek-chat', output = 'results/results_active.jsonl', seed = 42;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tasks' && args[i + 1]) { tasksPath = args[i + 1]; i++; }
    if (args[i] === '--model' && args[i + 1]) { model = args[i + 1]; i++; }
    if (args[i] === '--output' && args[i + 1]) { output = args[i + 1]; i++; }
    if (args[i] === '--seed' && args[i + 1]) { seed = parseInt(args[i + 1]); i++; }
  }
  const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
  const config: RunConfig = { ...DEFAULT_CONFIG, model, seed };
  console.log(`Running active batch: ${tasksData.length} tasks, model=${model}`);
  await runBatch(tasksData, config, output);
}
