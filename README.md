# p0-vs · Active Theory Discovery 的 P0 微缩实验环境

> **Active Theory Discovery: A Self-Improving Framework for Falsifiable Scientific Hypothesis Search**
> (主动理论发现:一个面向可证伪科学假设搜索的自我迭代框架)

`p0-vs` 是「主动理论发现(Active Theory Discovery)」框架的 **P0 微缩实验环境**,而非独立 demo。它把科学理论发现的最小闭环(隐藏规则 → 少量样本 → 主动查询 → 缩小版本空间 → 猜规则)封装成一个可复现、可评分、可证伪的硬 benchmark。

## 长期愿景与当前范围(语气控制)

- **长期愿景**:构建一个面向科学理论发现的**主动搜索框架**,让 AI 能像 AlphaGo 不断落子那样,持续提出、检验、压缩、迭代理论。
- **当前阶段**:只验证 **P0/P1**。本项目**不承诺**「发现统一理论」「发现终极理论」之类的目标;P2–P4 仅作为路线图记录,不作为工程交付。
- **严谨表述**:**P0 active query 有效 ≠ AI 可以发现深层物理理论**。P0 只验证了主动查询与版本空间压缩在**封闭规则空间**中的有效性,P1/P2 将逐步测试该机制能否迁移到更复杂的理论语言。

## 核心主张

把科学理论发现转化为一个**可评分、可反驳、可压缩、可主动查询**的搜索问题。

**抓手(Grasp)定义**:在最小复杂度下,解释最多已知事实,并预测最多隐藏事实,同时经受住最强反例搜索。

- AlphaGo 的抓手是「赢棋」;
- 本项目的抓手是 `TheoryScore`(见下文)。
- 当前 `p0-vs` 是最小闭环:隐藏规则 → 少量样本 → 主动查询 → 缩小版本空间 → 猜规则,对应科学发现的极简版(自然规律 → 少量观测 → 做实验 → 排除错误理论 → 提出更好理论)。

## P0–P4 五阶段路线图

| 阶段 | 名称 | 状态 | 说明 |
| ---- | ---- | ---- | ---- |
| **P0** | 规则归纳世界 | **当前交付** | 证明 AI 能通过主动查询,比被动观察更快发现隐藏规则 |
| **P1** | 符号规律发现 | **当前交付** | 规则从布尔条件升级到符号表达式 |
| P2 | 物理定律恢复 | 路线图(非交付) | 从轨道数据恢复开普勒定律等,可行性约 45%,只能小范围开始 |
| P3 | 跨理论统一 | 路线图(非交付) | 寻找不同理论共同结构,可行性约 20%,不适合短期承诺 |
| P4 | 开放科学探索 | 路线图(非交付) | 产生形式化、可检验、未被立即证伪的新理论候选;**不可作为工程承诺**,更不等于「发现终极理论」 |

> **当前所处阶段:P0。** P2–P4 仅路线图,当前只交付 P0/P1。P0 主指标未达成前,不对外宣称 P1/P2 结论。

## 三层结算目标(允许负结果)

1. **P0-ready(当前版本)**:完成 Active Theory Discovery 的 P0 微缩环境,在封闭规则空间中比较 Passive / Scaffold / Active-Random / Active-InfoGain / Oracle Version-Space,评估主动查询能否提升规则发现的准确率、查询效率和稳定性。
2. **P1-ready(下一版本)**:扩展 Theory DSL 到符号表达式发现,在合成公式与少量经典公式任务上测试主动查询能否提高公式恢复能力。
3. **论文结项**:提出 Active Theory Discovery 框架,将理论发现建模为「候选理论空间中的主动查询、反例搜索、复杂度惩罚与可验证评分」问题,并在 P0/P1 中验证其可操作性。

> **允许负结果**:active 未显著优于 scaffold 也是重要发现,如实报告显著性、效应量与失败条件,不视为项目失败。

## P0 验收指标

| 指标 | 目标 |
| ---- | ---- |
| 任务数 | ≥ 100 |
| 条件(baseline) | passive / scaffold / active-random / active-infogain / oracle |
| 结果产物 | JSONL + manifest + report |
| 评估指标 | accuracy、query_count、token、failure_type |
| 统计 | 显著性检验 + 效应量 |
| README | 一键复现 |
| 结果取向 | **允许负结果**(不论 active 是否显著优于 scaffold 都如实报告) |

## TheoryScore(目标函数,分阶段可计算)

`TheoryScore` 是整个框架的「赢棋」目标。**完整 7 项公式仅作为长期愿景;P0/P1 阶段必须使用可计算的退化形式,禁止使用完整公式。**

长期愿景公式(仅供参考,P2+ 才逐步启用):

```
Score(T) =
    α · Consistency(T, KnownFacts)      // 与已知事实一致
  + β · Prediction(T, HeldoutFacts)     // 预测隐藏事实
  + γ · Compression(T)                  // 可压缩性
  + δ · Unification(T)                  // 统一性
  + ε · Falsifiability(T)               // 可证伪性
  - λ · Complexity(T)                   // 复杂度惩罚
  - μ · Contradiction(T)                // 矛盾惩罚
```

**P0 可计算评分(当前交付)**:

```
P0Score(T) =
    heldout_accuracy(T)         // 规则在 heldout 样本上的命中率
  - rule_length_penalty(T)      // 规则描述长度惩罚(防止堆特例)
  - query_cost_penalty(T)       // 查询次数/token 惩罚
```

> P0 评分每一项都有明确算法实现,不依赖主观判断,并与 `src/metrics.ts` 的 accuracy / query_count 对齐。**禁止在 P0/P1 阶段使用完整 7 项公式。**

## 6 大核心模块

| 模块 | 作用 | P0 退化实现 |
| ---- | ---- | ---- |
| **KnownFacts**(已知事实库) | 系统地基,禁止 AI 凭空发明理论 | Type A:`(x, label)` 样本对,部分已知、部分 heldout |
| **Theory DSL**(理论语言) | 使理论可被机器验证 | `src/rules.ts` 的 `Rule` 接口(48 条布尔规则) |
| **Theory Proposer**(理论生成器) | 提出候选理论 | LLM agent + 候选规则集筛选 |
| **Verifier**(验证器) | 严格防止退化为「LLM 幻觉理论生成器」 | `rule(input) == label` 的布尔判定 |
| **Falsifier**(反例搜索器) | 找理论哪里错,而非证明对 | 退化为「主动选择最能区分候选规则的 query」(active-infogain) |
| **Theory Arena**(理论排行榜) | 持续迭代 + Anti-Goodhart 硬约束 | 版本空间排序;heldout 严格不可见、禁止查表式理论 |

## 快速开始

### 环境要求

- Node.js ≥ 18
- 一个 OpenAI 兼容的 Chat Completions 端点(通过环境变量配置)

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.deepseek.com/v1"   # 或其他兼容端点
npm install
```

### 1. 生成任务集(≥100 任务)

```bash
npx tsx src/taskGenerator.ts --n 120 --seed 42 --output results/tasks.json
```

### 2. 运行各 baseline / 条件

所有 runner 共享同一套 CLI 参数(`--experiment-id`、`--tasks`、`--model`、`--seed`、`--resume`、`--overwrite` 等),结果写入 `results/<experiment-id>/<condition>/`。

```bash
# Passive:仅凭初始观测直接猜规则,不查询
npx tsx src/runPassive.ts --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat

# Scaffold:结构化推理 + 查询
npx tsx src/runScaffold.ts --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat

# Active(LLM 自主选择查询):主实验条件
npx tsx src/runActive.ts --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat

# Oracle:Oracle 选最优查询,模型给最终答案(版本空间上限)
npx tsx src/runOracleQueryModelFinal.ts --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat
```

> `active-random`(随机查询)与 `active-infogain`(贪心最大信息增益查询)作为算法 baseline,由分析脚本在本地计算,无需额外 API 调用。

### 3. 分析结果

```bash
npx tsx src/analyzeResults.ts --dir results/exp_p0 --tasks results/tasks.json
```

该脚本会加载 `results/exp_p0/` 下各条件的 `results.jsonl`,计算 accuracy / avgQueries / avgFinalVS / queryEfficiency 等指标,并输出 `analysis_report.json`。

### 4. 运行测试(离线,无 API 调用)

```bash
npx tsx src/test.ts              # 规则、环境、任务生成单元测试
npx tsx src/testApiSafety.ts     # API 安全层(输出保护/manifest/ledger/cache)
npx tsx src/testRunnerMock.ts    # 端到端 runner(mock API,无网络)
```

### 断点续跑与缓存

```bash
# 续跑已中断的实验(只补未完成任务)
npx tsx src/runActive.ts --experiment-id exp_p0 --tasks results/tasks.json --resume

# 全部重跑(覆盖已有结果)
npx tsx src/runActive.ts --experiment-id exp_p0 --tasks results/tasks.json --overwrite

# 启用响应缓存(replay 模式:仅回放缓存,cache miss 即报错,适合离线复现)
npx tsx src/runActive.ts --experiment-id exp_p0 --tasks results/tasks.json --cache-mode replay
```

## 项目结构

```
src/
├── rules.ts                  # P0 Theory DSL 实例:48 条候选规则(EQ/EVEN/ODD/GT/LT/ORDER)+ INPUT_SPACE(0..9^3)
├── env.ts                    # RuleInductionEnv:版本空间、查询、computeGreedyOptimalQuery(最大信息增益)、computeRandomQuery
├── taskGenerator.ts          # 任务生成 + computeVersionSpace(根据观测筛选一致规则)
├── metrics.ts                # 指标计算:accuracy / avgQueries / avgFinalVS / queryEfficiency 等
├── apiSafety.ts              # API 安全层:OutputManager(JSONL+manifest+SHA256)、RequestLedger、ResponseCache、ApiClientWrapper(重试/缓存)、parseCommonArgs
├── runPassive.ts             # Passive baseline:无查询,直接猜
├── runScaffold.ts            # Scaffold baseline:结构化推理 + 查询
├── runActive.ts              # Active 主条件:LLM 自主选择查询(核心实验)
├── runActiveMinQuery.ts      # Active 变体:强制最少 3 次查询
├── runActiveBudgetReminder.ts# Active 变体:预算感知提示
├── runActiveVSCount.ts       # Active 变体:版本空间大小引导
├── runQueryOnlyScaffold.ts   # Scaffold 变体:仅查询式结构化推理
├── runFinalOnlyScaffold.ts   # Scaffold 变体:最终答案含 top-3 假设
├── runOracleQueryModelFinal.ts  # Oracle 查询 + 模型最终答案(版本空间上限)
├── runModelQueryOracleFinal.ts  # 模型查询 + Oracle 最终答案
├── analyzeResults.ts         # 汇总分析:加载各条件 JSONL,计算 random/greedy baseline,输出 report
├── test.ts                   # 单元测试(规则/环境/任务生成)
├── testApiSafety.ts          # API 安全层离线测试
├── testRunnerMock.ts         # 端到端 runner 测试(mock API)
└── testParseResponse.ts      # 响应解析测试
```

## 设计要点

- **API 安全层**(`apiSafety.ts`):所有 runner 共享输出保护(拒绝静默覆盖)、manifest(model+prompt+seed+task SHA256+source hash)、request ledger、响应缓存与重试,确保实验可审计、可复现。
- **版本空间**(`env.ts`):每次查询后,剔除与真规则在该输入上不一致的候选规则,`vs_size` 单调下降;`computeGreedyOptimalQuery` 选择使 split entropy 最大的输入,即 active-infogain 策略。
- **Anti-Goodhart**:heldout facts 对 Proposer 严格不可见;理论不得直接枚举训练事实;复杂度惩罚随训练事实数量增加。

## 许可与引用

本项目为研究原型。如需引用,请参考上述「Active Theory Discovery」框架定位与 P0/P1 阶段说明。
