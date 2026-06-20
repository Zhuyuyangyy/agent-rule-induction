// Offline safety tests. NO real API calls. NO network requests.
import fs from 'fs';
import path from 'path';
import {
  OutputManager, ResponseCache, RequestLedger, ApiClientWrapper,
  computeResultKey, type ExperimentContext, type ResultRecord,
} from './apiSafety.js';

let passed = 0, failed = 0;

async function test(name: string, fn: () => boolean | Promise<boolean>) {
  try {
    const r = await fn();
    if (r === false) { failed++; console.log(`  ✗ ${name}`); }
    else { passed++; console.log(`  ✓ ${name}`); }
  } catch (e: any) {
    failed++;
    console.log(`  ✗ ${name} — ${e.message}`);
  }
}

function tmpDir(prefix: string): string {
  const dir = path.join('tmp_test', prefix + '_' + Date.now());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clean(dir: string) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function makeTaskFile(dir: string): string {
  const p = path.join(dir, 'tasks.json');
  fs.writeFileSync(p, JSON.stringify([{ taskId: 'task_0', trueRuleId: 'EQ_x0_0', initialObservations: [], versionSpaceRuleIds: ['EQ_x0_0'], seed: 42 }]));
  return p;
}

function makeCtx(dir: string, overrides?: Partial<ExperimentContext>): ExperimentContext {
  return {
    experimentId: `exp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
    condition: 'active',
    model: 'mock-model',
    promptVersion: 'v1',
    temperature: 0,
    maxTokens: 256,
    maxQueries: 6,
    minQueries: 0,
    parserMode: 'strict',
    seed: 42,
    ruleSpaceVersion: '48_rules_v1',
    taskFilePath: makeTaskFile(dir),
    ...overrides,
  };
}

console.log('=== API Safety Offline Tests ===\n');

async function runTests() {
  await test('OutputManager refuses to overwrite by default', () => {
    const dir = tmpDir('default_refuse');
    try {
      const ctx = makeCtx(dir);
      new OutputManager(ctx, { baseDir: dir });
      new OutputManager(ctx, { baseDir: dir });
      return false;
    } catch (e: any) {
      return e.message.includes('Output already exists');
    } finally { clean(dir); }
  });

  await test('--resume and --overwrite are mutually exclusive', () => {
    const dir = tmpDir('mutex');
    try {
      const ctx = makeCtx(dir);
      new OutputManager(ctx, { resume: true, overwrite: true, baseDir: dir });
      return false;
    } catch (e: any) {
      return e.message.includes('cannot be used together');
    } finally { clean(dir); }
  });

  await test('Resume skips completed tasks by unique key', () => {
    const dir = tmpDir('resume_skip');
    try {
      const ctx = makeCtx(dir);
      const out = new OutputManager(ctx, { baseDir: dir });
      const record: ResultRecord = {
        taskId: 'task_0', trueRuleId: 'EQ_x0_0', predictedRuleId: 'EQ_x0_0', correct: true,
        queriesMade: 3, finalVersionSpaceSize: 1, initialVersionSpaceSize: 1,
        conversation: [], queryResults: [], config: {}, taskKey: '', responseSources: [],
      };
      out.appendResult(record);
      out.close();

      const out2 = new OutputManager(ctx, { resume: true, baseDir: dir });
      return out2.isTaskCompleted('task_0');
    } finally { clean(dir); }
  });

  await test('Config change rejects resume', () => {
    const dir = tmpDir('config_change');
    try {
      const ctx = makeCtx(dir, { maxTokens: 256 });
      const out = new OutputManager(ctx, { baseDir: dir });
      const record: ResultRecord = {
        taskId: 'task_0', trueRuleId: 'EQ_x0_0', predictedRuleId: 'EQ_x0_0', correct: true,
        queriesMade: 3, finalVersionSpaceSize: 1, initialVersionSpaceSize: 1,
        conversation: [], queryResults: [], config: {}, taskKey: '', responseSources: [],
      };
      out.appendResult(record);
      out.close();

      const ctx2 = makeCtx(dir, { maxTokens: 512 });
      new OutputManager(ctx2, { resume: true, baseDir: dir });
      return false;
    } catch (e: any) {
      return e.message.includes('Cannot resume') || e.message.includes('mismatch');
    } finally { clean(dir); }
  });

  await test('Corrupted JSONL stops', () => {
    const dir = tmpDir('corrupt');
    try {
      const ctx = makeCtx(dir);
      const out = new OutputManager(ctx, { baseDir: dir });
      fs.appendFileSync(out.resultsPath, 'not-json\n');
      out.close();
      new OutputManager(ctx, { resume: true, baseDir: dir });
      return false;
    } catch (e: any) {
      return e.message.includes('Cannot parse');
    } finally { clean(dir); }
  });

  await test('Duplicate task key stops', () => {
    const dir = tmpDir('duplicate');
    try {
      const ctx = makeCtx(dir);
      const out = new OutputManager(ctx, { baseDir: dir });
      const r: ResultRecord = { taskId: 'task_0', trueRuleId: 'EQ_x0_0', predictedRuleId: 'EQ_x0_0', correct: true, queriesMade: 3, finalVersionSpaceSize: 1, initialVersionSpaceSize: 1, conversation: [], queryResults: [], config: {}, taskKey: '', responseSources: [] };
      out.appendResult(r);
      out.appendResult(r);
      out.close();
      new OutputManager(ctx, { resume: true, baseDir: dir });
      return false;
    } catch (e: any) {
      return e.message.includes('Duplicate task');
    } finally { clean(dir); }
  });

  await test('Result key differs across configs and tasks', () => {
    const dir = tmpDir('key');
    try {
      const ctx1 = makeCtx(dir, { condition: 'active' });
      const ctx2 = makeCtx(dir, { condition: 'passive' });
      return computeResultKey(ctx1, 'task_0') !== computeResultKey(ctx2, 'task_0');
    } finally { clean(dir); }
  });

  await test('401/402 stops immediately without retry', async () => {
    const dir = tmpDir('auth_err');
    try {
      const ledgerPath = path.join(dir, 'ledger.jsonl');
      const cacheDir = path.join(dir, 'cache');
      const ledger = new RequestLedger(ledgerPath);
      const cache = new ResponseCache(cacheDir, 'off');
      let calls = 0;
      const factory = {
        call: async () => { calls++; throw { status: 401, message: 'Unauthorized' }; },
      };
      const api = new ApiClientWrapper({ ledger, cache, baseUrl: 'http://mock', apiKey: undefined, clientFactory: factory });
      try {
        await api.call({ model: 'm', messages: [], temperature: 0, max_tokens: 10 }, 'v1');
        return false;
      } catch {
        return calls === 1;
      }
    } finally { clean(dir); }
  });

  await test('429 retries up to 3 times', async () => {
    const dir = tmpDir('rate_err');
    try {
      const ledgerPath = path.join(dir, 'ledger.jsonl');
      const cacheDir = path.join(dir, 'cache');
      const ledger = new RequestLedger(ledgerPath);
      const cache = new ResponseCache(cacheDir, 'off');
      let calls = 0;
      const factory = {
        call: async () => { calls++; throw { status: 429, message: 'Rate limit' }; },
      };
      const api = new ApiClientWrapper({ ledger, cache, baseUrl: 'http://mock', apiKey: undefined, clientFactory: factory });
      try {
        await api.call({ model: 'm', messages: [], temperature: 0, max_tokens: 10 }, 'v1');
        return false;
      } catch {
        return calls === 4;
      }
    } finally { clean(dir); }
  });

  await test('429 succeeds on second attempt', async () => {
    const dir = tmpDir('rate_recover');
    try {
      const ledgerPath = path.join(dir, 'ledger.jsonl');
      const cacheDir = path.join(dir, 'cache');
      const ledger = new RequestLedger(ledgerPath);
      const cache = new ResponseCache(cacheDir, 'off');
      let calls = 0;
      const factory = {
        call: async () => {
          calls++;
          if (calls < 2) throw { status: 429, message: 'Rate limit' };
          return { content: 'ok', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } };
        },
      };
      const api = new ApiClientWrapper({ ledger, cache, baseUrl: 'http://mock', apiKey: undefined, clientFactory: factory });
      const res = await api.call({ model: 'm', messages: [], temperature: 0, max_tokens: 10 }, 'v1');
      return res.content === 'ok' && res.response_source === 'api' && calls === 2;
    } finally { clean(dir); }
  });

  await test('Cache replay is labeled', async () => {
    const dir = tmpDir('cache_replay');
    try {
      const ledgerPath = path.join(dir, 'ledger.jsonl');
      const cacheDir = path.join(dir, 'cache');
      const ledger = new RequestLedger(ledgerPath);
      const cache = new ResponseCache(cacheDir, 'write');
      const factory = {
        call: async () => ({ content: 'cached-response', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }),
      };
      const api = new ApiClientWrapper({ ledger, cache, baseUrl: 'http://mock', apiKey: undefined, clientFactory: factory });
      const res1 = await api.call({ model: 'm', messages: [{ role: 'user', content: 'hi' }], temperature: 0, max_tokens: 10 }, 'v1');

      const cache2 = new ResponseCache(cacheDir, 'replay');
      const api2 = new ApiClientWrapper({ ledger, cache: cache2, baseUrl: 'http://mock', apiKey: undefined, clientFactory: factory });
      const res2 = await api2.call({ model: 'm', messages: [{ role: 'user', content: 'hi' }], temperature: 0, max_tokens: 10 }, 'v1');
      return res1.response_source === 'api' && res2.response_source === 'cache_replay';
    } finally { clean(dir); }
  });

  await test('Cache is off by default', async () => {
    const dir = tmpDir('cache_off');
    try {
      const ledgerPath = path.join(dir, 'ledger.jsonl');
      const cacheDir = path.join(dir, 'cache');
      const ledger = new RequestLedger(ledgerPath);
      const cache = new ResponseCache(cacheDir, 'off');
      let calls = 0;
      const factory = {
        call: async () => { calls++; return { content: 'x', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }; },
      };
      const api = new ApiClientWrapper({ ledger, cache, baseUrl: 'http://mock', apiKey: undefined, clientFactory: factory });
      await api.call({ model: 'm', messages: [{ role: 'user', content: 'hi' }], temperature: 0, max_tokens: 10 }, 'v1');
      await api.call({ model: 'm', messages: [{ role: 'user', content: 'hi' }], temperature: 0, max_tokens: 10 }, 'v1');
      return calls === 2;
    } finally { clean(dir); }
  });

  await test('Manifest contains required audit fields', () => {
    const dir = tmpDir('manifest');
    try {
      const ctx = makeCtx(dir);
      const out = new OutputManager(ctx, { baseDir: dir });
      const manifest = JSON.parse(fs.readFileSync(out.manifestPath, 'utf-8'));
      const required = ['rule_space_version', 'task_file_sha256', 'model', 'condition', 'prompt_version', 'temperature', 'max_tokens', 'max_queries', 'min_queries', 'parser_mode', 'seed', 'code_commit_or_source_hash', 'created_at', 'experiment_id'];
      return required.every(k => k in manifest);
    } finally { clean(dir); }
  });

  await test('Atomic append keeps JSONL valid', () => {
    const dir = tmpDir('atomic');
    try {
      const ctx = makeCtx(dir);
      const out = new OutputManager(ctx, { baseDir: dir });
      const r: ResultRecord = { taskId: 'task_0', trueRuleId: 'EQ_x0_0', predictedRuleId: 'EQ_x0_0', correct: true, queriesMade: 3, finalVersionSpaceSize: 1, initialVersionSpaceSize: 1, conversation: [], queryResults: [], config: {}, taskKey: '', responseSources: [] };
      out.appendResult(r);
      out.appendResult(r);
      out.close();
      const lines = fs.readFileSync(out.resultsPath, 'utf-8').split('\n').filter(l => l.trim());
      return lines.length === 2 && lines.every(l => { JSON.parse(l); return true; });
    } finally { clean(dir); }
  });

  await test('Request ledger records request lifecycle', async () => {
    const dir = tmpDir('ledger');
    try {
      const ledgerPath = path.join(dir, 'ledger.jsonl');
      const cacheDir = path.join(dir, 'cache');
      const ledger = new RequestLedger(ledgerPath);
      const cache = new ResponseCache(cacheDir, 'off');
      const factory = {
        call: async () => ({ content: 'ok', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }),
      };
      const api = new ApiClientWrapper({ ledger, cache, baseUrl: 'http://mock', apiKey: undefined, clientFactory: factory });
      await api.call({ model: 'm', messages: [], temperature: 0, max_tokens: 10 }, 'v1');
      const lines = fs.readFileSync(ledgerPath, 'utf-8').split('\n').filter(l => l.trim());
      const last = JSON.parse(lines[lines.length - 1]);
      return last.status === 'completed' && last.response_source === 'api';
    } finally { clean(dir); }
  });
}

runTests().then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
