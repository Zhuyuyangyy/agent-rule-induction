import { RULE_BY_ID, INPUT_SPACE, DISTINCT_RULES } from './rules.js';
import { RuleInductionEnv, computeGreedyOptimalQuery } from './env.js';
import { computeVersionSpace as computeVSFromTask } from './taskGenerator.js';

function testRules() {
  console.log('Testing rules...');
  if (DISTINCT_RULES.length !== 48) throw new Error(`Expected 48 rules, got ${DISTINCT_RULES.length}`);
  if (INPUT_SPACE.length !== 1000) throw new Error(`Expected 1000 inputs, got ${INPUT_SPACE.length}`);
  const eqRule = RULE_BY_ID.get('EQ_x0_4')!;
  if (eqRule.call([4, 0, 0]) !== true) throw new Error('EQ_x0_4 fail');
  if (eqRule.call([3, 0, 0]) !== false) throw new Error('EQ_x0_4 fail');
  const evenRule = RULE_BY_ID.get('EVEN_x1')!;
  if (evenRule.call([0, 4, 0]) !== true) throw new Error('EVEN_x1 fail');
  if (evenRule.call([0, 3, 0]) !== false) throw new Error('EVEN_x1 fail');
  const orderRule = RULE_BY_ID.get('ORDER_x0_x1')!;
  if (orderRule.call([2, 5, 0]) !== true) throw new Error('ORDER_x0_x1 fail');
  if (orderRule.call([5, 2, 0]) !== false) throw new Error('ORDER_x0_x1 fail');
  console.log('  All rule tests passed!');
}

function testEnv() {
  console.log('Testing env...');
  const vs = computeVSFromTask([{ input: [4, 2, 3], output: true }, { input: [1, 5, 7], output: false }]);
  const env = new RuleInductionEnv('EQ_x0_4', [{ input: [4, 2, 3], output: true }, { input: [1, 5, 7], output: false }], vs, 6);
  const qr = env.query([4, 0, 0]);
  if (qr.result !== true) throw new Error('Expected true');
  const gq = computeGreedyOptimalQuery(env);
  console.log(`  Greedy query: [${gq}]`);
  console.log('  All env tests passed!');
}

async function testTaskGen() {
  console.log('Testing task generation...');
  const { generateTask, generateTaskBatch } = await import('./taskGenerator.js');
  const task = generateTask(12345);
  console.log(`  Task: ${task.taskId}, rule: ${task.trueRuleId}, VS: ${task.versionSpaceRuleIds.length}`);
  const batch = generateTaskBatch(5, 42);
  if (batch.length !== 5) throw new Error('Expected 5');
  console.log('  All task gen tests passed!');
}

async function main() {
  console.log('=== Unit Tests ===\n');
  try { testRules(); testEnv(); await testTaskGen(); console.log('\n=== All Tests Passed! ==='); }
  catch (e: any) { console.error(`\nFAIL: ${e.message}`); process.exit(1); }
}
main();
