import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { RULE_BY_ID } from './rules.js';
import { RuleInductionEnv, computeGreedyOptimalQuery, type QueryResult } from './env.js';
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

function buildPrompt(): string {
  return `You are a rule identification agent. You will be given observations of a hidden rule mapping (x0, x1, x2) -> True/False, xi ∈ {0..9}. x0=FIRST, x1=SECOND, x2=THIRD.

The observations have been carefully selected to maximally discriminate between candidate rules. Analyze them and identify the rule.

${RULE_LIST}

Based on the observations, provide your answer:
ANSWER: rule_id (EXACT ID like EQ_x0_4, EVEN_x1, GT_x2_8)`;
}

async function runSingle(task: Task, config: RunConfig): Promise<RunResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const env = new RuleInductionEnv(task.trueRuleId, task.initialObservations, task.versionSpaceRuleIds, 6);
  const queryResults: QueryResult[] = [];
  while (!env.isDone()) { const x = computeGreedyOptimalQuery(env); const qr = env.query(x); queryResults.push(qr); }
  const allObs = [...task.initialObservations, ...queryResults.map((qr, idx) => ({ input: env.queriedInputs[idx], output: qr.result }))];
  const obsStr = allObs.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: buildPrompt() },
    { role: 'user', content: `Observations (selected by optimal query strategy):\n${obsStr}\n\nVS: ${env.versionSpace.length} rules remain. What is the rule?` },
  ];
  let predictedRuleId: string | null = null;
  try {
    const c = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 1024 });
    const r = c.choices[0]?.message?.content || ''; messages.push({ role: 'assistant', content: r });
    const p = parseResponse(r); if (p.answer) predictedRuleId = p.answer;
  } catch (e: any) { console.error(`API error: ${e.message}`); }
  return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: predictedRuleId === task.trueRuleId, queriesMade: env.queriesMade, finalVersionSpaceSize: env.versionSpace.length, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: messages, queryResults, config };
}

async function runBatch(tasks: Task[], config: RunConfig, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, '');
  for (let i = 0; i < tasks.length; i++) {
    console.log(`[${i + 1}/${tasks.length}] OracleQueryModelFinal ${tasks[i].taskId}...`);
    try { const r = await runSingle(tasks[i], config); fs.appendFileSync(outputPath, JSON.stringify(r) + '\n'); console.log(`  -> ${r.predictedRuleId}, correct: ${r.correct}, queries: ${r.queriesMade}`); }
    catch (e: any) { console.error(`  -> ERROR: ${e.message}`); fs.appendFileSync(outputPath, JSON.stringify({ taskId: tasks[i].taskId, trueRuleId: tasks[i].trueRuleId, predictedRuleId: null, correct: false, error: e.message, queriesMade: 0, finalVersionSpaceSize: -1, initialVersionSpaceSize: tasks[i].versionSpaceRuleIds.length, conversation: [], queryResults: [], config }) + '\n'); }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`OracleQueryModelFinal batch complete. ${outputPath}`);
}

if (process.argv[1] && process.argv[1].endsWith('runOracleQueryModelFinal.ts')) {
  const args = process.argv.slice(2);
  let tasksPath = 'results/tasks_seed42.json', model = 'deepseek-chat', output = 'results/results_oracle_query_model_final.jsonl', seed = 42;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tasks' && args[i + 1]) { tasksPath = args[i + 1]; i++; }
    if (args[i] === '--model' && args[i + 1]) { model = args[i + 1]; i++; }
    if (args[i] === '--output' && args[i + 1]) { output = args[i + 1]; i++; }
    if (args[i] === '--seed' && args[i + 1]) { seed = parseInt(args[i + 1]); i++; }
  }
  const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
  await runBatch(tasksData, { ...DEFAULT_CONFIG, model, seed }, output);
}
