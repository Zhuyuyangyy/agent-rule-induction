// End-to-end runner test with mock API. NO real API calls.
import fs from 'fs';
import path from 'path';
import { generateTaskBatch } from './taskGenerator.js';
import { OutputManager, RequestLedger, ResponseCache, ApiClientWrapper, type ApiClientFactory, type ResultRecord } from './apiSafety.js';
import { runActiveMinQueryBatch } from './runActiveMinQuery.js';

const dir = path.join('tmp_test', 'runner_mock_' + Date.now());
fs.mkdirSync(dir, { recursive: true });

const tasks = generateTaskBatch(3, 42);
const taskFile = path.join(dir, 'tasks.json');
fs.writeFileSync(taskFile, JSON.stringify(tasks));

// Mock API that returns valid JSON final on every call.
// The runner must still enforce minQueries=3 by auto-querying before accepting final.
let callCount = 0;
const factory: ApiClientFactory = {
  call: async () => {
    callCount++;
    return {
      content: '{"action":"final","rule_id":"' + tasks[0].trueRuleId + '"}',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
  },
};

const ctx = {
  experimentId: 'exp_mock',
  condition: 'active_minquery',
  model: 'mock-model',
  promptVersion: 'v2_active_minquery',
  temperature: 0,
  maxTokens: 256,
  maxQueries: 6,
  minQueries: 3,
  parserMode: 'strict' as const,
  seed: 42,
  ruleSpaceVersion: '48_rules_v1',
  taskFilePath: taskFile,
};

const output = new OutputManager(ctx, { baseDir: dir });
const ledger = new RequestLedger(output.ledgerPath);
const cache = new ResponseCache(output.cacheDir, 'off');
const api = new ApiClientWrapper({ ledger, cache, baseUrl: 'http://mock', clientFactory: factory });

(async () => {
  await runActiveMinQueryBatch(tasks, output, api, 'mock-model');
  output.close();

  const lines = fs.readFileSync(output.resultsPath, 'utf-8').split('\n').filter(l => l.trim());
  const results = lines.map(l => JSON.parse(l) as ResultRecord);
  let allQueriesMet = true;
  for (const r of results) {
    console.log(`Task ${r.taskId}: predicted=${r.predictedRuleId}, correct=${r.correct}, queries=${r.queriesMade}, sources=${JSON.stringify(r.responseSources)}`);
    if (r.queriesMade < 3) allQueriesMet = false;
  }

  if (results.length !== 3) {
    console.log('FAIL: expected 3 results');
    process.exit(1);
  }
  if (!allQueriesMet) {
    console.log('FAIL: MinQuery not enforced');
    process.exit(1);
  }
  console.log('PASS: MinQuery enforced in mock runner');
})();
