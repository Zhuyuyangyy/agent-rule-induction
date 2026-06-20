import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { RULE_BY_ID, DISTINCT_RULES } from './rules.js';
import { RuleInductionEnv, type Observation } from './env.js';
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

export function buildPassiveSystemPrompt(): string {
  return `You are a rule induction agent. Your goal is to identify a hidden rule that maps inputs (x0, x1, x2) to True/False, where each xi is a digit from 0-9. x0 is the FIRST number, x1 is the SECOND number, x2 is the THIRD number.

You will be given observations of the form: input -> output.
After seeing all observations, you must state your final guess for the rule.

${RULE_LIST}

Format your final answer as: ANSWER: rule_id (use EXACT rule ID like EQ_x0_4, EVEN_x1, GT_x2_8)

Think step by step about which rules are consistent with all observations.`;
}

export async function runPassiveSingleTask(task: Task, config: RunConfig): Promise<RunResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  const rng = ((seed: number) => { let s = seed; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(task.seed);
  const allObs = [...task.initialObservations];
  const usedInputs = new Set(task.initialObservations.map(o => o.input.join(',')));
  for (let i = 0; i < 6; i++) {
    let x: [number, number, number], key: string;
    do { x = [Math.floor(rng() * 10), Math.floor(rng() * 10), Math.floor(rng() * 10)]; key = x.join(','); } while (usedInputs.has(key));
    usedInputs.add(key);
    allObs.push({ input: x, output: RULE_BY_ID.get(task.trueRuleId)!.call(x) });
  }
  const obsStr = allObs.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]}) -> ${o.output}`).join('\n');
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: buildPassiveSystemPrompt() },
    { role: 'user', content: `Here are all the observations:\n${obsStr}\n\nBased on these, what is the hidden rule? ANSWER: rule_id` },
  ];
  let predictedRuleId: string | null = null;
  try {
    const c = await client.chat.completions.create({ model: config.model, messages: messages as any, temperature: config.temperature, max_tokens: 1024 });
    const r = c.choices[0]?.message?.content || ''; messages.push({ role: 'assistant', content: r });
    const p = parseResponse(r); if (p.answer) predictedRuleId = p.answer;
  } catch (e: any) { console.error(`API error: ${e.message}`); }
  let vs = new Set(DISTINCT_RULES);
  for (const obs of allObs) { const nvs = new Set<string>(); for (const rid of vs) { if (RULE_BY_ID.get(rid)!.call(obs.input) === obs.output) nvs.add(rid); } vs = nvs; }
  return { taskId: task.taskId, trueRuleId: task.trueRuleId, predictedRuleId, correct: predictedRuleId === task.trueRuleId, queriesMade: 0, finalVersionSpaceSize: vs.size, initialVersionSpaceSize: task.versionSpaceRuleIds.length, conversation: messages, queryResults: [], config };
}

export async function runPassiveBatch(tasks: Task[], config: RunConfig, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, '');
  for (let i = 0; i < tasks.length; i++) {
    console.log(`[${i + 1}/${tasks.length}] Passive ${tasks[i].taskId} (true: ${tasks[i].trueRuleId})...`);
    try { const r = await runPassiveSingleTask(tasks[i], config); fs.appendFileSync(outputPath, JSON.stringify(r) + '\n'); console.log(`  -> ${r.predictedRuleId}, correct: ${r.correct}`); }
    catch (e: any) { console.error(`  -> ERROR: ${e.message}`); fs.appendFileSync(outputPath, JSON.stringify({ taskId: tasks[i].taskId, trueRuleId: tasks[i].trueRuleId, predictedRuleId: null, correct: false, error: e.message, queriesMade: 0, finalVersionSpaceSize: -1, initialVersionSpaceSize: tasks[i].versionSpaceRuleIds.length, conversation: [], queryResults: [], config }) + '\n'); }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`Passive batch complete. ${outputPath}`);
}

if (process.argv[1] && process.argv[1].endsWith('runPassive.ts')) {
  const args = process.argv.slice(2);
  let tasksPath = 'results/tasks_seed42.json', model = 'deepseek-chat', output = 'results/results_passive.jsonl', seed = 42;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tasks' && args[i + 1]) { tasksPath = args[i + 1]; i++; }
    if (args[i] === '--model' && args[i + 1]) { model = args[i + 1]; i++; }
    if (args[i] === '--output' && args[i + 1]) { output = args[i + 1]; i++; }
    if (args[i] === '--seed' && args[i + 1]) { seed = parseInt(args[i + 1]); i++; }
  }
  const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
  await runPassiveBatch(tasksData, { ...DEFAULT_CONFIG, model, seed }, output);
}
