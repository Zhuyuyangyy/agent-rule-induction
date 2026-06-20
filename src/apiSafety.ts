// API safety layer: output protection, resume, manifest, ledger, retry, cache.
// This module does NOT call any API by itself; it wraps and audits.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExperimentContext {
  experimentId: string;        // e.g. "p0.1_seed42"
  condition: string;           // e.g. "active"
  model: string;               // e.g. "deepseek-chat"
  promptVersion: string;       // e.g. "v1"
  temperature: number;
  maxTokens: number;
  maxQueries: number;
  minQueries: number;
  parserMode: 'strict' | 'loose';
  seed: number;
  ruleSpaceVersion: string;    // e.g. "48_rules_v1"
  taskFilePath: string;
}

export interface UsageRecord {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

export interface RequestLedgerEntry {
  id: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'ambiguous' | 'failed';
  cache_key_hash: string;
  error_code?: number | null;
  error_message?: string;
  usage?: UsageRecord;
  response_source?: 'api' | 'cache_replay';
}

export interface Manifest {
  rule_space_version: string;
  task_file_sha256: string;
  model: string;
  condition: string;
  prompt_version: string;
  temperature: number;
  max_tokens: number;
  max_queries: number;
  min_queries: number;
  parser_mode: 'strict' | 'loose';
  seed: number;
  code_commit_or_source_hash: string;
  created_at: string;
  experiment_id: string;
}

export interface ResultRecord {
  taskId: string;
  trueRuleId: string;
  predictedRuleId: string | null;
  correct: boolean;
  queriesMade: number;
  finalVersionSpaceSize: number;
  initialVersionSpaceSize: number;
  conversation: { role: string; content: string; usage?: UsageRecord; response_source?: 'api' | 'cache_replay' }[];
  queryResults: any[];
  config: any;
  taskKey: string;
  responseSources?: ('api' | 'cache_replay')[];
}

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hashObject(obj: any): string {
  return sha256(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Code source hash
// ---------------------------------------------------------------------------

export function computeSourceHash(srcDir: string = 'src'): string {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(srcDir)
    .filter(f => f.endsWith('.ts'))
    .sort();
  for (const f of files) {
    const p = path.join(srcDir, f);
    hash.update(`${f}:`);
    hash.update(fs.readFileSync(p));
  }
  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// Result key
// ---------------------------------------------------------------------------

export function computeResultKey(ctx: ExperimentContext, taskId: string): string {
  const configPart = [
    ctx.condition,
    ctx.model,
    ctx.promptVersion,
    ctx.temperature,
    ctx.maxTokens,
    ctx.maxQueries,
    ctx.minQueries,
    ctx.parserMode,
    ctx.seed,
    ctx.ruleSpaceVersion,
  ].join('|');
  return sha256(`${ctx.experimentId}|${configPart}|${taskId}`);
}

// ---------------------------------------------------------------------------
// OutputManager
// ---------------------------------------------------------------------------

export class OutputManager {
  public readonly baseDir: string;
  public readonly resultsPath: string;
  public readonly manifestPath: string;
  public readonly logPath: string;
  public readonly ledgerPath: string;
  public readonly cacheDir: string;
  private readonly context: ExperimentContext;
  private readonly sourceHash: string;
  private readonly resume: boolean;
  private readonly overwrite: boolean;
  private completedKeys: Map<string, ResultRecord> = new Map();
  private closed: boolean = false;

  constructor(ctx: ExperimentContext, opts: { resume?: boolean; overwrite?: boolean; baseDir?: string }) {
    if (opts.resume && opts.overwrite) {
      throw new Error('--resume and --overwrite cannot be used together');
    }
    this.context = ctx;
    this.resume = !!opts.resume;
    this.overwrite = !!opts.overwrite;
    this.sourceHash = computeSourceHash();
    this.baseDir = opts.baseDir ?? path.join('results', ctx.experimentId, ctx.condition);
    this.resultsPath = path.join(this.baseDir, 'results.jsonl');
    this.manifestPath = path.join(this.baseDir, 'manifest.json');
    this.logPath = path.join(this.baseDir, 'run.log');
    this.ledgerPath = path.join(this.baseDir, 'request_ledger.jsonl');
    this.cacheDir = path.join(this.baseDir, 'cache');

    fs.mkdirSync(this.baseDir, { recursive: true });
    fs.mkdirSync(this.cacheDir, { recursive: true });

    try {
      this._checkOutputFileProtection();
      this._loadOrCreateManifest();
      this._loadCompletedResults();
      this.log(`OutputManager initialized. resume=${this.resume}, overwrite=${this.overwrite}`);
    } catch (e: any) {
      this.close();
      throw e;
    }
  }

  private _checkOutputFileProtection(): void {
    const resultsExist = fs.existsSync(this.resultsPath) && fs.statSync(this.resultsPath).size > 0;
    const manifestExist = fs.existsSync(this.manifestPath) && fs.statSync(this.manifestPath).size > 0;

    if (resultsExist || manifestExist) {
      if (!this.resume && !this.overwrite) {
        throw new Error(
          `Output already exists at ${this.baseDir}. ` +
          `Use --resume to continue or --overwrite to start fresh. ` +
          `Default behavior is to refuse to run to prevent data loss.`
        );
      }
      if (this.overwrite) {
        // Atomic-ish: write to temp, then we will truncate results.jsonl only after manifest is validated
        fs.writeFileSync(this.resultsPath, '');
        fs.writeFileSync(this.manifestPath, '');
      }
    }
  }

  private _loadOrCreateManifest(): void {
    const taskHash = sha256File(this.context.taskFilePath);
    const desired: Manifest = {
      rule_space_version: this.context.ruleSpaceVersion,
      task_file_sha256: taskHash,
      model: this.context.model,
      condition: this.context.condition,
      prompt_version: this.context.promptVersion,
      temperature: this.context.temperature,
      max_tokens: this.context.maxTokens,
      max_queries: this.context.maxQueries,
      min_queries: this.context.minQueries,
      parser_mode: this.context.parserMode,
      seed: this.context.seed,
      code_commit_or_source_hash: this.sourceHash,
      created_at: new Date().toISOString(),
      experiment_id: this.context.experimentId,
    };

    if (fs.existsSync(this.manifestPath) && fs.statSync(this.manifestPath).size > 0) {
      const existing: Manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
      // If we are overwriting, replace manifest
      if (this.overwrite) {
        fs.writeFileSync(this.manifestPath, JSON.stringify(desired, null, 2));
        return;
      }
      // Resume mode: validate manifest matches (skip created_at)
      const mismatch: string[] = [];
      for (const key of Object.keys(existing) as (keyof Manifest)[]) {
        if (key === 'created_at') continue;
        if ((existing as any)[key] !== (desired as any)[key]) {
          mismatch.push(`${key}: existing=${(existing as any)[key]} desired=${(desired as any)[key]}`);
        }
      }
      if (mismatch.length > 0) {
        throw new Error(`Manifest mismatch. Cannot resume.\n${mismatch.join('\n')}`);
      }
    } else {
      fs.writeFileSync(this.manifestPath, JSON.stringify(desired, null, 2));
    }
  }

  private _loadCompletedResults(): void {
    if (!fs.existsSync(this.resultsPath)) return;
    const content = fs.readFileSync(this.resultsPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const seenKeys = new Set<string>();
    for (const line of lines) {
      let record: ResultRecord;
      try {
        record = JSON.parse(line);
      } catch (e: any) {
        throw new Error(`Cannot parse results.jsonl line: ${line.substring(0, 100)}...`);
      }
      const taskId = record.taskId;
      if (!taskId) throw new Error('results.jsonl line missing taskId');
      const expectedKey = computeResultKey(this.context, taskId);
      if (record.taskKey && record.taskKey !== expectedKey) {
        throw new Error(`Result key mismatch for task ${taskId}. Config or task changed. Cannot resume.`);
      }
      if (seenKeys.has(taskId)) {
        throw new Error(`Duplicate task ${taskId} in results.jsonl. Cannot resume.`);
      }
      seenKeys.add(taskId);
      this.completedKeys.set(taskId, record);
    }
    this.log(`Loaded ${this.completedKeys.size} completed results from ${this.resultsPath}`);
  }

  log(message: string): void {
    if (this.closed) return;
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(line);
    try { fs.appendFileSync(this.logPath, line + '\n'); } catch {}
  }

  isTaskCompleted(taskId: string): boolean {
    return this.completedKeys.has(taskId);
  }

  getCompletedRecord(taskId: string): ResultRecord | undefined {
    return this.completedKeys.get(taskId);
  }

  appendResult(record: ResultRecord): void {
    record.taskKey = computeResultKey(this.context, record.taskId);
    const line = JSON.stringify(record) + '\n';
    const tmpPath = this.resultsPath + '.tmp';
    const existing = fs.existsSync(this.resultsPath) ? fs.readFileSync(this.resultsPath, 'utf-8') : '';
    fs.writeFileSync(tmpPath, existing + line);
    fs.renameSync(tmpPath, this.resultsPath);
  }

  close(): void {
    this.closed = true;
  }
}

// ---------------------------------------------------------------------------
// Request ledger
// ---------------------------------------------------------------------------

export class RequestLedger {
  private path: string;

  constructor(ledgerPath: string) {
    this.path = ledgerPath;
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  }

  add(entry: RequestLedgerEntry): void {
    fs.appendFileSync(this.path, JSON.stringify(entry) + '\n');
  }

  update(entry: RequestLedgerEntry): void {
    if (!fs.existsSync(this.path)) {
      this.add(entry);
      return;
    }
    const lines = fs.readFileSync(this.path, 'utf-8').split('\n').filter(l => l.trim());
    const out: string[] = [];
    let found = false;
    for (const line of lines) {
      const obj = JSON.parse(line);
      if (obj.id === entry.id) {
        out.push(JSON.stringify(entry));
        found = true;
      } else {
        out.push(line);
      }
    }
    if (!found) out.push(JSON.stringify(entry));
    fs.writeFileSync(this.path, out.join('\n') + '\n');
  }
}

// ---------------------------------------------------------------------------
// Cache layer (off by default)
// ---------------------------------------------------------------------------

export type CacheMode = 'off' | 'read' | 'write' | 'replay';

export class ResponseCache {
  private cacheDir: string;
  private mode: CacheMode;

  constructor(cacheDir: string, mode: CacheMode) {
    this.cacheDir = cacheDir;
    this.mode = mode;
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  static computeKey(messages: any[], model: string, temperature: number, maxTokens: number, baseUrl: string, promptVersion: string): string {
    const payload = { messages, model, temperature, maxTokens, baseUrl, promptVersion };
    return sha256(JSON.stringify(payload));
  }

  private path(key: string): string {
    return path.join(this.cacheDir, key + '.json');
  }

  get(key: string): { content: string; usage: UsageRecord } | null {
    if (this.mode === 'off' || this.mode === 'write') return null;
    const p = this.path(key);
    if (!fs.existsSync(p)) return null;
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch { return null; }
  }

  set(key: string, content: string, usage: UsageRecord): void {
    if (this.mode === 'off' || this.mode === 'replay') return;
    fs.writeFileSync(this.path(key), JSON.stringify({ content, usage, cached_at: new Date().toISOString() }, null, 2));
  }

  isReplay(): boolean {
    return this.mode === 'replay';
  }
}

// ---------------------------------------------------------------------------
// ApiClientWrapper
// ---------------------------------------------------------------------------

export interface ApiCallOptions {
  model: string;
  messages: any[];
  temperature: number;
  max_tokens: number;
}

export interface ApiClientFactory {
  call(opts: ApiCallOptions): Promise<{ content: string; usage: UsageRecord }>;
}

export class ApiClientWrapper {
  private ledger: RequestLedger;
  private cache: ResponseCache;
  private baseUrl: string;
  private apiKey: string | undefined;
  private requestCounter: number = 0;
  private clientFactory?: ApiClientFactory;

  constructor(opts: { ledger: RequestLedger; cache: ResponseCache; baseUrl: string; apiKey?: string; clientFactory?: ApiClientFactory }) {
    this.ledger = opts.ledger;
    this.cache = opts.cache;
    this.baseUrl = opts.baseUrl;
    this.apiKey = opts.apiKey;
    this.clientFactory = opts.clientFactory;
  }

  getApiKey(): string | undefined { return this.apiKey; }
  getBaseUrl(): string { return this.baseUrl; }
  getCallCount(): number { return this.requestCounter; }

  // Note: this method is async and makes real network calls when cache miss.
  // It is the caller's responsibility to avoid invoking it in tests unless mocking.
  async call(opts: ApiCallOptions, promptVersion: string): Promise<{ content: string; usage: UsageRecord; response_source: 'api' | 'cache_replay' }> {
    const cacheKey = ResponseCache.computeKey(opts.messages, opts.model, opts.temperature, opts.max_tokens, this.baseUrl, promptVersion);

    // Cache read / replay
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: cached.content, usage: cached.usage, response_source: 'cache_replay' };
    }

    if (this.cache.isReplay()) {
      throw new Error(`Cache replay mode enabled but cache miss for key ${cacheKey}`);
    }

    // Real API call with retry
    const requestId = `req_${Date.now()}_${this.requestCounter++}`;
    this.ledger.add({
      id: requestId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      cache_key_hash: cacheKey,
    });

    const result = await this._callWithRetry(opts, requestId);

    // Cache write
    this.cache.set(cacheKey, result.content, result.usage);

    return result;
  }

  private async _callWithRetry(opts: ApiCallOptions, requestId: string): Promise<{ content: string; usage: UsageRecord; response_source: 'api' }> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let content: string;
        let usage: UsageRecord;
        if (this.clientFactory) {
          const res = await this.clientFactory.call(opts);
          content = res.content;
          usage = res.usage;
        } else {
          // Dynamic import to allow injection of mock clients in tests
          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseUrl });
          const completion = await client.chat.completions.create({
            model: opts.model,
            messages: opts.messages as any,
            temperature: opts.temperature,
            max_tokens: opts.max_tokens,
          });
          content = completion.choices[0]?.message?.content || '';
          usage = completion.usage ? {
            prompt_tokens: completion.usage.prompt_tokens ?? null,
            completion_tokens: completion.usage.completion_tokens ?? null,
            total_tokens: completion.usage.total_tokens ?? null,
          } : { prompt_tokens: null, completion_tokens: null, total_tokens: null };
        }
        this.ledger.update({
          id: requestId,
          timestamp: new Date().toISOString(),
          status: 'completed',
          cache_key_hash: '',
          usage,
          response_source: 'api',
        });
        return { content, usage, response_source: 'api' };
      } catch (e: any) {
        lastError = e;
        const status = e.status || e.code || 0;
        const message = e.message || String(e);

        // Non-retryable errors: stop immediately
        if ([400, 401, 402, 403].includes(status)) {
          this.ledger.update({
            id: requestId,
            timestamp: new Date().toISOString(),
            status: 'failed',
            cache_key_hash: '',
            error_code: status,
            error_message: message,
          });
          throw e;
        }

        // Retryable errors
        const retryable = [429, 502, 503, 504].includes(status) ||
          message.toLowerCase().includes('timeout') ||
          message.toLowerCase().includes('etimedout') ||
          message.toLowerCase().includes('econnreset');

        if (!retryable || attempt === maxRetries) {
          // Mark ambiguous if timeout and we can't confirm server status
          const ambiguous = message.toLowerCase().includes('timeout');
          this.ledger.update({
            id: requestId,
            timestamp: new Date().toISOString(),
            status: ambiguous ? 'ambiguous' : 'failed',
            cache_key_hash: '',
            error_code: status,
            error_message: message,
          });
          throw e;
        }

        // Exponential backoff with jitter
        const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 10000);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    throw lastError;
  }
}

// ---------------------------------------------------------------------------
// CLI argument parsing helpers
// ---------------------------------------------------------------------------

export interface CliOptions {
  experimentId: string;
  condition: string;
  model: string;
  promptVersion: string;
  temperature: number;
  maxTokens: number;
  maxQueries: number;
  minQueries: number;
  parserMode: 'strict' | 'loose';
  seed: number;
  ruleSpaceVersion: string;
  taskFilePath: string;
  resume: boolean;
  overwrite: boolean;
  cacheMode: CacheMode;
  baseUrl: string;
  apiKey?: string;
}

export function parseCommonArgs(args: string[], defaults: Partial<CliOptions>): CliOptions {
  const opt: any = {
    experimentId: 'exp_default',
    condition: 'unknown',
    model: 'deepseek-chat',
    promptVersion: 'v1',
    temperature: 0,
    maxTokens: 256,
    maxQueries: 6,
    minQueries: 0,
    parserMode: 'strict',
    seed: 42,
    ruleSpaceVersion: '48_rules_v1',
    taskFilePath: 'results/tasks.json',
    resume: false,
    overwrite: false,
    cacheMode: 'off',
    baseUrl: '',
    apiKey: undefined,
    ...defaults,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => { const v = args[++i]; if (v === undefined) throw new Error(`Missing value for ${a}`); return v; };
    if (a === '--experiment-id') opt.experimentId = next();
    if (a === '--condition') opt.condition = next();
    if (a === '--model') opt.model = next();
    if (a === '--prompt-version') opt.promptVersion = next();
    if (a === '--temperature') opt.temperature = parseFloat(next());
    if (a === '--max-tokens') opt.maxTokens = parseInt(next());
    if (a === '--max-queries') opt.maxQueries = parseInt(next());
    if (a === '--min-queries') opt.minQueries = parseInt(next());
    if (a === '--parser-mode') opt.parserMode = next() as any;
    if (a === '--seed') opt.seed = parseInt(next());
    if (a === '--rule-space-version') opt.ruleSpaceVersion = next();
    if (a === '--tasks') opt.taskFilePath = next();
    if (a === '--resume') opt.resume = true;
    if (a === '--overwrite') opt.overwrite = true;
    if (a === '--cache-mode') opt.cacheMode = next() as CacheMode;
    if (a === '--base-url') opt.baseUrl = next();
    if (a === '--api-key') opt.apiKey = next();
  }
  if (opt.resume && opt.overwrite) throw new Error('--resume and --overwrite cannot be used together');
  return opt as CliOptions;
}
