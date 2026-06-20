import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { RULE_BY_ID, DISTINCT_RULES } from './rules.js';
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

type OracleFinal = 'success' | 'partial' | 'failure';

function buildPrompt(): string {
  return `You are a rule induction agent. Identify a hidden rule mapping (x0, x1, x2) -> True/False, xi ∈ {0..9}. x0=FIRST, x1=SECOND, x2=THIRD.

You will be given initial observations. You MUST query before guessing.

${RULE_LIST}

You have at most 6 queries. Choose queries that maximally discriminate.

Format: QUERY: x0,x1,x2 or ANSWER: rule_id (EXACT ID)`;
}

async function runSingle(task: Task, config: RunConfig): Promise<RunResult & { oracleFinal: OracleFinal }> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
  const obsStr = task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: buildPrompt() },
    { role: 'user', content: `Observations:\n${obsStr}\n\nVS: ${task.versionSpaceRuleIds.length} rules. First query?` },
  ];
  const queryResults: QueryResult[] = [];
  let modelPredictedRuleId: string | null = null;
  for (let step = 0; step < 14; step++) {
    let completion;
    try { completion = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 2048 }); }
    catch (e: any) { console.error(`API error: ${e.message}`); break; }
    const r = completion.choices[0]?.message?.content || '';
    messages.push({ role: 'assistant', content: r });
    const p = parseResponse(r);
    for (const q of p.queries) { if (!env.isDone()) { const qr = env.query(q); queryResults.push(qr); messages.push({ role: 'user', content: `(${q[0]},${q[1]},${q[2]}) -> ${qr.result}\nVS: ${qr.version_space_size}${qr.is_duplicate ? ' [DUP]' : ''}\nLeft: ${6 - env.queriesMade}` }); } }
    if (p.answer) { modelPredictedRuleId = p.answer; break; }
    if (p.queries.length === 0 && !p.answer) { messages.push({ role: 'user', content: env.isDone() ? 'No more queries. ANSWER: rule_id' : `QUERY: x0,x1,x2 or ANSWER: rule_id. Left: ${6 - env.queriesMade}` }); }
    if (env.isDone() && !p.answer) messages.push({ role: 'user', content: 'No more queries. ANSWER: rule_id' });
  }
  if (!modelPredictedRuleId) { try { const c = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 64 }); const r = c.choices[0]?.message?.content || ''; messages.push({ role: 'assistant', content: r }); const p = parseResponse(r); if (p.answer) modelPredictedRuleId = p.answer; } catch (e: any) {} }
  const finalVS = env.versionSpace;
  let oracleFinal: OracleFinal; let predictedRuleId: string | null;
  if (finalVS.length === 1 && finalVS[0] === task.trueRuleId) { oracleFinal = 'success'; predictedRuleId = finalVS[0]; }
  else if (finalVS.includes(task.trueRuleId)) { oracleFinal = 'partial'; predictedRuleId = task.trueRuleId; }
  else { oracleFinal = 'failure'; predictedRuleId = modelPredictedRuleId; }
  return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: oracleFinal === 'success', queriesMade: env.queriesMade, finalVersionSpaceSize: finalVS.length, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: messages, queryResults, config, oracleFinal };
}

async function runBatch(tasks: Task[], config: RunConfig, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, '');
  let s = 0, p = 0, f = 0;
  for (let i = 0; i < tasks.length; i++) {
    console.log(`[${i + 1}/${tasks.length}] ModelQueryOracleFinal ${tasks[i].taskId}...`);
    try { const r = await runSingle(tasks[i], config); fs.appendFileSync(outputPath, JSON.stringify(r) + '\n'); if (r.oracleFinal === 'success') s++; else if (r.oracleFinal === 'partial') p++; else f++; console.log(`  -> oracle: ${r.oracleFinal}, queries: ${r.queriesMade}, VS: ${r.finalVersionSpaceSize}`); }
    catch (e: any) { console.error(`  -> ERROR: ${e.message}`); f++; fs.appendFileSync(outputPath, JSON.stringify({ taskId: tasks[i].taskId, trueRuleId: tasks[i].trueRuleId, predictedRuleId: null, correct: false, error: e.message, queriesMade: 0, finalVersionSpaceSize: -1, initialVersionSpaceSize: tasks[i].versionSpaceRuleIds.length, conversation: [], queryResults: [], config, oracleFinal: 'failure' }) + '\n'); }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`ModelQueryOracleFinal complete. Success: ${s}, Partial: ${p}, Failure: ${f}. ${outputPath}`);
}

if (process.argv[1] && process.argv[1].endsWith('runModelQueryOracleFinal.ts')) {
  const args = process.argv.slice(2);
  let tasksPath = 'results/tasks_seed42.json', model = 'deepseek-chat', output = 'results/results_model_query_oracle_final.jsonl', seed = 42;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tasks' && args[i + 1]) { tasksPath = args[i + 1]; i++; }
    if (args[i] === '--model' && args[i + 1]) { model = args[i + 1]; i++; }
    if (args[i] === '--output' && args[i + 1]) { output = args[i + 1]; i++; }
    if (args[i] === '--seed' && args[i + 1]) { seed = parseInt(args[i + 1]); i++; }
  }
  const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
  await runBatch(tasksData, { ...DEFAULT_CONFIG, model, seed }, output);
}
