# API 安全层审计报告

> 生成时间：2026-06-18  
> 约束：本次修改仅涉及代码与离线测试，未设置真实 API key，未发出任何网络请求。

---

## 1. 改动概览

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/apiSafety.ts` | API 安全层核心：输出保护、manifest、唯一 result key、原子写入、请求账本、响应缓存、API 重试、CLI 参数解析。`computeSourceHash` 改为基于文件内容 SHA256。 |
| `src/testApiSafety.ts` | 离线测试：覆盖输出保护、resume、manifest、缓存、重试、原子写入等 15 项。 |
| `src/testParseResponse.ts` | 离线测试：覆盖 strict/loose 解析、JSON query/final、推理文本中的 rule_id 等 11 项。 |
| `src/testRunnerMock.ts` | Mock 端到端测试：验证 MinQuery 在模型反复提前 final 时仍被强制满足。 |

### 修改文件

| 文件 | 主要改动 |
|------|----------|
| `src/runActive.ts` | 接入 API 安全层；prompt 强制短 JSON；`max_tokens` 默认 256；`parseResponse` 增加 strictMode；MinQuery 分支在模型提前 final 时自动执行一次探索查询并反馈；最终 fallback 也检查 minQueries。 |
| `src/runActiveMinQuery.ts` | 接入 API 安全层；prompt 版本 `v2_active_minquery`；minQueries=3；max_tokens=256。 |
| `src/runPassive.ts` | 接入 API 安全层；max_tokens=256。 |
| `src/runActiveBudgetReminder.ts` | 接入 API 安全层；max_tokens=256。 |
| `src/runActiveVSCount.ts` | 接入 API 安全层；max_tokens=256。 |
| `src/runScaffold.ts` | 接入 API 安全层；max_tokens=512；结构化 JSON prompt。 |
| `src/runFinalOnlyScaffold.ts` | 接入 API 安全层；max_tokens=512。 |
| `src/runQueryOnlyScaffold.ts` | 接入 API 安全层；max_tokens=512。 |
| `src/runOracleQueryModelFinal.ts` | 接入 API 安全层。 |
| `src/runModelQueryOracleFinal.ts` | 接入 API 安全层。 |
| `src/env.ts` | `query()` 增加 `force` 选项，允许在 version space 已收敛时仍计入查询次数，用于 MinQuery 强制。 |

---

## 2. 安全层实现要点

### 2.1 输出文件保护

- `OutputManager` 默认拒绝覆盖：若 `results.jsonl` 或 `manifest.json` 已存在且无 `--resume`/`--overwrite`，立即抛错退出。
- `--resume` 与 `--overwrite` 互斥，构造时即校验。
- 结果写入采用“读旧内容 → 写 `.tmp` → `renameSync`”的原子 append，防止进程中断破坏 JSONL。

### 2.2 安全续跑

- 不使用“跳过前 N 条”。
- 每条结果的唯一键：
  `SHA256(experimentId | condition | model | promptVersion | temperature | maxTokens | maxQueries | minQueries | parserMode | seed | ruleSpaceVersion | taskId)`
- resume 时逐行解析已有 JSONL，校验：
  - 每行必须可解析；
  - 不能缺少 `taskId`；
  - `taskKey` 必须与当前配置计算出的 key 一致；
  - 同一 `taskId` 不能重复。

### 2.3 实验 Manifest

每次运行生成/校验 `manifest.json`，字段包括：

- `rule_space_version`
- `task_file_sha256`
- `model`
- `condition`
- `prompt_version`
- `temperature`
- `max_tokens`
- `max_queries`
- `min_queries`
- `parser_mode`
- `seed`
- `code_commit_or_source_hash`
- `created_at`
- `experiment_id`

resume 时除 `created_at` 外任何字段不一致都会禁止续跑。

### 2.4 响应缓存

- 默认关闭（`--cache-mode=off`）。
- 显式模式：`read` / `write` / `replay`。
- Cache key：完整 messages、model、temperature、max_tokens、base_url、prompt_version 的 SHA256。
- 缓存命中返回 `response_source: "cache_replay"`。
- 默认统计应排除 `cache_replay`，不得混入 API 样本。

### 2.5 API 重试

- 可重试：429、502、503、504、网络超时（`timeout` / `ETIMEDOUT` / `ECONNRESET`）。
- 立即停止：400、401、402、403。
- 最多重试 3 次，指数退避 + jitter（上限 10s）。
- 每次请求前写入 `pending` ledger，完成后更新为 `completed` / `failed` / `ambiguous`。
- 超时且无法确认服务端状态时标记为 `ambiguous_request`，不再无限重试。

### 2.6 Token 控制

| Condition | 默认 max_tokens |
|-----------|-----------------|
| Passive / Active / MinQuery / BudgetReminder / VSCount | 256 |
| Scaffold / FinalOnly / QueryOnly | 512 |

- Prompt 强制短 JSON，禁止自由长篇推理。
- `usage.prompt_tokens`、`usage.completion_tokens`、`usage.total_tokens` 保存接口返回值；未返回时记为 `null`，不估造。

### 2.7 文件隔离

输出目录固定为：

```text
results/<experiment_id>/<condition>/
```

每个 condition 只写自己的：

- `results.jsonl`
- `manifest.json`
- `run.log`
- `request_ledger.jsonl`
- `cache/`

---

## 3. 测试结果

### 3.1 `npx tsx src/testApiSafety.ts`

```text
=== API Safety Offline Tests ===
  ✓ OutputManager refuses to overwrite by default
  ✓ --resume and --overwrite are mutually exclusive
  ✓ Resume skips completed tasks by unique key
  ✓ Config change rejects resume
  ✓ Corrupted JSONL stops
  ✓ Duplicate task key stops
  ✓ Result key differs across configs and tasks
  ✓ 401/402 stops immediately without retry
  ✓ 429 retries up to 3 times
  ✓ 429 succeeds on second attempt
  ✓ Cache replay is labeled
  ✓ Cache is off by default
  ✓ Manifest contains required audit fields
  ✓ Atomic append keeps JSONL valid
  ✓ Request ledger records request lifecycle

15 passed, 0 failed
```

### 3.2 `npx tsx src/testParseResponse.ts`

```text
=== parseResponse strictMode Tests ===
  ✓ JSON query returns action query
  ✓ JSON final returns action final
  ✓ Markdown fenced JSON final works
  ✓ Legacy ANSWER: works in loose mode
  ✓ Rule ID in reasoning: not final in strict mode
  ✓ Rule ID in reasoning: final in loose mode (legacy)
  ✓ Scaffold reasoning JSON with query: strict mode extracts query
  ✓ Invalid format returns null in strict mode
  ✓ JSON final with extra fields works
  ✓ Out-of-range query digits rejected
  ✓ Non-integer query digits rejected

11 passed, 0 failed
```

### 3.3 `npx tsx src/testRunnerMock.ts`

```text
PASS: MinQuery enforced in mock runner
```

### 3.4 TypeScript 编译

```text
npx tsc --noEmit
# 0 errors
```

---

## 4. 剩余风险与后续建议

### 4.1 已缓解但需人工确认的风险

| 风险 | 当前状态 |
|------|----------|
| 结果文件被覆盖 | 默认拒绝，需 `--overwrite`；已测试。 |
| 不安全的“跳过前 N 条”续跑 | 改为按唯一 key + manifest 校验；已测试。 |
| 缓存污染正式实验 | 默认关闭，显式模式，强制标注 `cache_replay`；已测试。 |
| 401/402 无限重试 | 立即停止；已测试。 |
| 429/503 过度重试 | 最多 3 次 + 退避；已测试。 |
| MinQuery 被绕过 | 提前 final 时自动执行探索查询并继续对话；已测试。 |
| 推理文本中的 rule_id 被误判为 final | strictMode 下只认 JSON action；已测试。 |
| JSONL 损坏/重复导致静默错位 | 启动时校验并抛错；已测试。 |

### 4.2 仍存在的风险

1. **真实 API 运行时费用未经验证**
   - 当前所有测试均为 mock/offline，未验证实际 DeepSeek / MiniMax 的响应格式、usage 字段、超时行为。正式运行前建议先用 1-2 条 task 做小规模真实调用，确认 `usage` 字段被正确记录。

2. **~~Source hash 不稳定~~ 已修复**
   - ~~`computeSourceHash` 基于 `src/*.ts` 的文件大小和 mtime。~~ 已改为仅基于文件内容 SHA256，避免 mtime 变化导致合法 resume 被拒绝。

3. **原子写入非严格原子**
   - 当前实现是“读全文件 → 写 tmp → rename”。对于极大 JSONL 文件性能差，且 rename 在 Windows 上覆盖目标文件时通常是原子的，但仍依赖 OS/文件系统保证。未使用文件锁，多个 Node 进程同时写同一文件仍有竞态。

4. **强制查询的实验语义**
   - MinQuery 条件下，当模型提前 final 时，runner 会自动执行一次探索查询并把结果喂给模型。这保证了 `queriesMade >= 3`，但模型实际输出的是 final。分析时应明确：这些查询是“runner 强制”，不是“模型主动”。

5. **`ambiguous_request` 的人工处理**
   - 超时后 ledger 会记录 `ambiguous`，但当前代码不会自动基于 ledger 做幂等去重。若同一请求在服务端已处理，重试可能重复扣费。建议后续实现 request hash 级别的去重/确认机制。

6. **并行运行建议**
   - 虽然文件隔离 + 原子写入已降低覆盖风险，但项目近期经历三次数据丢失，仍建议正式实验串行执行，或至少为每个 condition 使用独立 `experiment_id` 并人工复核 manifest。

### 4.3 下一步建议

- 用真实 API key 做最小规模（1-2 task）的端到端验证，确认 `usage`、缓存标记、ledger 记录符合预期。
- 正式多 seed / 多重复实验时，为每次运行生成新的 `experiment_id`，避免依赖 `--overwrite`。
- 不要默认启用缓存作为正式样本来源；`cache_replay` 仅用于调试、崩溃恢复或完全相同的请求防重复调用。

---

## 5. 结论

API 安全层已按需求实现并通过全部离线测试。默认行为是：**文件存在 → 拒绝运行；想续跑 → `--resume`；想重跑 → 新建 `experiment_id`；想覆盖 → `--overwrite`**。在确认上述剩余风险并补充小规模真实 API 验证前，不建议启动正式实验批量调用。
