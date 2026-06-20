import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { RULE_BY_ID } from './rules.js';
import { RuleInductionEnv, type QueryResult } from './env.js';
import type { Task } from './taskGenerator.js';
import { parseResponse, DEFAULT_CONFIG, type RunConfig, type RunResult } from './runActive.js';

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

export function buildScaffoldSystemPrompt(): string {
  return `You are a rule induction agent. Your goal is to identify a hidden rule that maps inputs (x0, x1, x2) to True/False, where each xi is a digit from 0-9. x0 is FIRST, x1 is SECOND, x2 is THIRD.

You will be given some initial observations. You MUST query specific inputs to get their outputs before guessing.

${RULE_LIST}

You have at most 6 queries. For each step, reason as follows:
STEP N:
1. CONSISTENT_RULES: List rules still consistent with observations
2. DISCRIMINATION_ANALYSIS: Which query would best split the remaining rules?
3. QUERY: x0,x1,x2

After all queries, provide:
FINAL_ANSWER:
- top_hypotheses: Top 3 candidate rules with confidence
- evidence: Key observations that support/refute each
- ANSWER: rule_id (EXACT rule ID)`;
}

async function runScaffoldSingle(task: Task, config: RunConfig): Promise<RunResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: buildScaffoldSystemPrompt() },
    { role: 'user', content: `Initial observations:\n${obsStr}\n\nVersion space: ${task.versionSpaceRuleIds.length} rules. Begin your structured analysis.` },
  ];
  const queryResults: QueryResult[] = [];
  let predictedRuleId: string | null = null;
  for (let step = 0; step < 14; step++) {
    let completion;
    try { completion = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 2048 }); }
    catch (e: any) { console.error(`API error: ${e.message}`); break; }
    const r = completion.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: r });
    const p = parseResponse(r, true);  // strictMode: only recognize explicit ANSWER:/FINAL_ANSWER:
    for (const q of p.queries) {
      if (!env.isDone()) { const qr = env.query(q); queryResults.push(qr); messages.push({ role: 'user', content: `Query (${q[0]},${q[1]},${q[2]}) -> ${qr.result}\nVS: ${qr.version_space_size}${qr.is_duplicate ? ' [DUP]' : ''}\nLeft: ${6 - env.queriesMade}` }); }
    }
    if (p.answer) { predictedRuleId = p.answer; break; }
    if (p.queries.length === 0 && !p.answer) { messages.push({ role: 'user', content: env.isDone() ? 'No more queries. You MUST output ANSWER: rule_id' : `Provide QUERY: x0,x1,x2 or ANSWER: rule_id. Left: ${6 - env.queriesMade}` }); }
    if (env.isDone() && !p.answer) messages.push({ role: 'user', content: 'No more queries. You MUST output ANSWER: rule_id' });
  }
  if (!predictedRuleId) { try { const c = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 128 }); const r = c.choices[0]?.message?.content || ''; messages.push({ role: 'assistant', content: r }); const p = parseResponse(r, true); if (p.answer) predictedRuleId = p.answer; } catch (e: any) {} }
  return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: predictedRuleId === task.trueRuleId, queriesMade: env.queriesMade, finalVersionSpaceSize: env.versionSpace.length, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: messages, queryResults, config };
}

async function runScaffoldBatch(tasks: Task[], config: RunConfig, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, '');
  for (let i = 0; i < tasks.length; i++) {
    console.log(`[${i + 1}/${tasks.length}] Scaffold ${tasks[i].taskId} (true: ${tasks[i].trueRuleId})...`);
    try { const r = await runScaffoldSingle(tasks[i], config); fs.appendFileSync(outputPath, JSON.stringify(r) + '\n'); console.log(`  -> ${r.predictedRuleId}, correct: ${r.correct}, queries: ${r.queriesMade}`); }
    catch (e: any) { console.error(`  -> ERROR: ${e.message}`); fs.appendFileSync(outputPath, JSON.stringify({ taskId: tasks[i].taskId, trueRuleId: tasks[i].trueRuleId, predictedRuleId: null, correct: false, error: e.message, queriesMade: 0, finalVersionSpaceSize: -1, initialVersionSpaceSize: tasks[i].versionSpaceRuleIds.length, conversation: [], queryResults: [], config }) + '\n'); }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`Scaffold batch complete. ${outputPath}`);
}

if (process.argv[1] && process.argv[1].endsWith('runScaffold.ts')) {
  const args = process.argv.slice(2);
  let tasksPath = 'results/tasks_seed42.json', model = 'deepseek-chat', output = 'results/results_scaffold.jsonl', seed = 42;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tasks' && args[i + 1]) { tasksPath = args[i + 1]; i++; }
    if (args[i] === '--model' && args[i + 1]) { model = args[i + 1]; i++; }
    if (args[i] === '--output' && args[i + 1]) { output = args[i + 1]; i++; }
    if (args[i] === '--seed' && args[i + 1]) { seed = parseInt(args[i + 1]); i++; }
  }
  const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
  await runScaffoldBatch(tasksData, { ...DEFAULT_CONFIG, model, seed }, output);
}
