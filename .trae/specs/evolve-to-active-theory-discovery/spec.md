# Active Theory Discovery 框架升级 Spec

## Why

当前仓库 `p0-vs` 只是一个封闭的规则归纳实验框架(48 条候选规则、三维整数输入、版本空间筛选),GitHub 描述也仅是 "Rule induction experiment framework (p0-vs) with API safety layer"。这只是项目真正野心的外壳。

项目的真正目标是:给 AI 一个像 AlphaGo「赢棋」一样明确的抓手,让它能不断提出、检验、压缩、迭代理论,最终寻找一个能统一解释已知物理事实的更深层理论。AlphaGo 之所以成功,是因为它有一个极其清晰的闭环(局面 → 搜索 → 落子 → 胜负 → 更新策略 → 自博弈);本项目也需要一个等价的闭环,把「科学理论发现」转化为一个可评分、可反驳、可压缩、可主动查询的搜索问题。

当前 `p0-vs` 不是最终项目,而是这个宏大框架的 **P0 级微缩宇宙**:它已经实现了最小闭环(隐藏规则 → 少量样本 → 主动查询 → 缩小版本空间 → 猜规则),对应科学发现的极简版(自然规律 → 少量观测 → 做实验 → 排除错误理论 → 提出更好理论)。但规则空间太小,离「发掘更深理论」还有几层台阶。

## What Changes

- **重新定位项目**:把 `agent-rule-induction` / `p0-vs` 定义为更宏大「主动理论发现(Active Theory Discovery)」框架的 P0 微缩实验环境,而非独立 demo。
- **确立核心抓手(目标函数)**:定义 `TheoryScore`,把「赢棋」翻译成「在最小复杂度下,解释最多已知事实,并预测最多隐藏事实,同时经受住最强反例搜索」。
- **定义 6 大核心模块**:KnownFacts(已知事实库)、Theory DSL(理论语言)、Theory Proposer(理论生成器)、Verifier(验证器)、Falsifier(反例搜索器)、Theory Arena(理论排行榜)。
- **定义 P0–P4 五阶段路线图**:规则归纳 → 符号规律 → 物理定律恢复 → 跨理论统一 → 开放科学探索。
- **定义三层结算目标**:短期项目结算(可复现 benchmark)、中期论文结算(active theory induction 方法论文)、长期愿景结算(可验证逼近更好理论的搜索过程)。
- **升级项目主张与命名**:对外主张为 "Active Theory Discovery: A Self-Improving Framework for Falsifiable Scientific Hypothesis Search"。
- **BREAKING**:项目语义从「规则归纳实验」升级为「理论发现框架」,README、文档、对外描述需同步重写;`RULE_SPACE` 从「项目核心」降级为「P0 理论语言实例」。

## Impact

- Affected specs: 无前置 spec(本 spec 为框架奠基)。
- Affected code:
  - [src/rules.ts](file:///workspace/src/rules.ts) — `RULE_SPACE` 重新定位为 P0 Theory DSL 实例,后续需抽象出通用 Theory DSL 接口。
  - [src/runActive.ts](file:///workspace/src/runActive.ts) / [src/runPassive.ts](file:///workspace/src/runPassive.ts) / [src/runScaffold.ts](file:///workspace/src/runScaffold.ts) 等 runner — 作为 P0 阶段实验主体,需补齐 benchmark 验收指标。
  - [src/metrics.ts](file:///workspace/src/metrics.ts) — 现有 accuracy/query_count/token 指标是 TheoryScore 的子集,需扩展为完整评分维度。
  - [src/apiSafety.ts](file:///workspace/src/apiSafety.ts) — API 安全层保留,作为整个框架的基础设施。
  - [package.json](file:///workspace/package.json) — 项目名/描述需反映新定位。
  - README(待创建)— 需重写为框架级说明,明确 P0–P4 路线图与三层结算目标。
- 新增(规划中,非本 spec 实现):KnownFacts 数据格式、Theory DSL 接口、Theory Proposer 多角色、Verifier 四层验证、Falsifier 反例搜索、Theory Arena 排行榜。

## ADDED Requirements

### Requirement: TheoryScore 目标函数

系统 SHALL 定义一个可计算的理论评分函数,作为整个框架的「赢棋」目标,使理论发现成为可优化问题。

评分公式:

```
Score(T) =
  α · Consistency(T, KnownFacts)      // 是否符合已知实验、定理、观测
+ β · Prediction(T, HeldoutFacts)     // 是否能预测被隐藏的事实
+ γ · Compression(T)                  // 是否用更少假设解释更多现象
+ δ · Unification(T)                  // 是否把多个理论统一到同一套结构下
+ ε · Falsifiability(T)               // 是否能提出可被验证/证伪的新结论
- λ · Complexity(T)                   // 是否只是堆参数、堆特例
- μ · Contradiction(T)                // 是否违反相对论、量子力学、守恒律等硬约束
```

其中 α、β、γ、δ、ε、λ、μ 为可配置权重,各阶段(P0–P4)可取不同默认值。

#### Scenario: P0 阶段评分退化
- **WHEN** 系统处于 P0 规则归纳阶段
- **THEN** TheoryScore 退化为 `Consistency(命中已知样本) + Prediction(heldout 样本) - Complexity(规则描述长度)`,其余维度权重置 0
- **AND** 评分结果可与现有 accuracy/query_count 指标对齐

#### Scenario: 评分可比较
- **WHEN** 两个候选理论 T1、T2 进入 Arena
- **THEN** 系统能输出各自 Score 并判定优劣
- **AND** 评分各分项可解释、可审计

### Requirement: KnownFacts 已知事实库

系统 SHALL 提供一个结构化的已知事实库作为整个系统的地基,禁止 AI 凭空发明理论。

事实库按领域分层:

```
Level 0: 数学事实
Level 1: 经典力学事实
Level 2: 电磁学事实
Level 3: 狭义相对论事实
Level 4: 广义相对论事实
Level 5: 量子力学事实
Level 6: 标准模型事实
Level 7: 未解释异常 / 开放问题
```

每条事实为机器可读格式:

```json
{
  "id": "sr_time_dilation_001",
  "domain": "special_relativity",
  "level": 3,
  "statement": "moving clocks run slower relative to inertial observers",
  "formal_form": "...",
  "evidence_type": "experiment",
  "confidence": 0.99,
  "constraints": ["Lorentz invariance", "c <= speed_of_light"],
  "source": "..."
}
```

#### Scenario: P0 阶段事实库
- **WHEN** 系统处于 P0 阶段
- **THEN** KnownFacts 退化为「隐藏规则生成的 (input, label) 样本对」,其中部分作为已知事实、部分作为 heldout
- **AND** 不引入物理事实,避免过早复杂化

### Requirement: Theory DSL 理论语言

系统 SHALL 定义一个结构化的理论描述语言,使 AI 提出的理论可被机器验证,禁止输出无法结算的自然语言断言。

理论描述格式:

```json
{
  "theory_id": "T_042",
  "primitive_entities": ["event", "observer", "field"],
  "axioms": ["...", "..."],
  "derived_equations": ["..."],
  "free_parameters": 3,
  "claimed_explains": ["sr_time_dilation_001", "mass_energy_equivalence_001"],
  "novel_predictions": ["..."]
}
```

理论语言分档:

| 阶段 | 理论语言 |
| ---- | ---- |
| P0 | 布尔规则(当前 `RULE_SPACE`) |
| P1 | 符号表达式 |
| P2 | 方程 / 微分方程 |
| P3 | 公理系统 + 推导链 |
| P4 | 可仿真物理模型 |

#### Scenario: P0 DSL 即现有规则
- **WHEN** 系统处于 P0 阶段
- **THEN** Theory DSL 实例化为 [src/rules.ts](file:///workspace/src/rules.ts) 中的 `Rule` 接口
- **AND** 每条规则可被 `(x) => boolean` 调用并给出自然语言描述

#### Scenario: P1 DSL 扩展
- **WHEN** 系统进入 P1 阶段
- **THEN** Theory DSL 扩展为符号表达式(如 `y = 2x + 1`、`T^2 ∝ r^3`)
- **AND** 表达式复杂度可计算、符号等价性可判断

### Requirement: Theory Proposer 理论生成器

系统 SHALL 提供多角色理论生成器,而非单一 agent,以模拟理论进化过程。

至少包含以下角色:
- Generator Agent:提出新理论
- Mutator Agent:修改旧理论
- Combiner Agent:组合两个理论(如尝试统一相对论与量子理论共同结构)
- Simplifier Agent:压缩理论、删除多余假设
- Analogy Agent:从其他领域迁移结构

#### Scenario: 理论进化循环
- **WHEN** Arena 中存在理论种群
- **THEN** Proposer 能基于高分理论进行变异、组合、简化
- **AND** 生成的新理论进入 Verifier 与 Falsifier 流程

### Requirement: Verifier 验证器

系统 SHALL 提供至少四层验证,严格防止项目退化为「LLM 幻觉理论生成器」。

四层验证:
- 语法验证:格式对不对
- 逻辑验证:推导有没有跳步
- 数学验证:方程是否成立
- 经验验证:是否符合已知实验/观测

对应工具方向:

| 验证类型 | 工具方向 |
| ---- | ---- |
| 符号推导 | SymPy / Lean / Isabelle |
| 数值仿真 | Python / Julia |
| 物理约束检查 | 自定义 constraint checker |
| 数据拟合 | benchmark dataset |
| 反例搜索 | adversarial search |

#### Scenario: P0 阶段验证
- **WHEN** 系统处于 P0 阶段
- **THEN** Verifier 退化为「规则在已知样本上是否一致」的布尔判定
- **AND** 不引入符号推导/数值仿真

### Requirement: Falsifier 反例搜索器

系统 SHALL 提供反例搜索器,其任务不是证明理论对,而是找理论哪里错。

流程:

```
给定理论 T
  → 找出 T 最脆弱的边界条件
  → 生成测试 case
  → 检查是否违反已知事实
  → 若找到反例,理论降分或淘汰
```

#### Scenario: P0 阶段反例搜索即主动查询
- **WHEN** 系统处于 P0 阶段
- **THEN** Falsifier 退化为「主动选择最能区分候选规则的 query」(即现有 active-infogain 策略)
- **AND** 在物理版中对应「主动选择最能区分候选理论的实验/观测/推导任务」

### Requirement: Theory Arena 理论排行榜

系统 SHALL 维护一个理论种群与排行榜,使理论发现成为持续迭代过程,而非单次输出。

排行榜比较维度:
- 谁解释事实更多
- 谁参数更少
- 谁预测 heldout facts 更准
- 谁违反硬约束更少
- 谁能产生更有价值的新预测

迭代循环:

```
选择高分理论 → 变异 → 组合 → 验证 → 淘汰 → 保留
```

#### Scenario: 理论种群维护
- **WHEN** 系统运行中
- **THEN** Arena 维护形如 `T_001: score 82.1 / T_002: score 79.4 / ...` 的种群
- **AND** 可导出种群快照供审计

### Requirement: P0–P4 五阶段路线图

系统 SHALL 按以下五阶段递进,禁止跳级到「统一相对论与量子力学」:

- **P0 规则归纳世界**(当前所在):证明 AI 能通过主动查询,比被动观察更快发现隐藏规则。结项目标:Active-InfoGain 在规则归纳任务上显著优于 Passive/Scaffold。
- **P1 符号规律发现**:规则从布尔条件升级到符号表达式(如 `y = 2x + 1`、`E = mc^2`、`T^2 ∝ r^3`)。结项目标:AI 能在主动查询下恢复一批经典公式。
- **P2 物理定律恢复**:从轨道数据恢复开普勒定律、从运动数据恢复牛顿第二定律、从高速运动数据恢复时间膨胀关系等。结项目标:系统能从部分观测中恢复已知物理定律,并在隐藏测试集上预测正确。
- **P3 跨理论统一**:寻找不同理论共同结构,用更少公理解释更多现象,提出可检验的新桥接假设。结项目标:系统提出跨领域统一候选理论并通过形式化验证。
- **P4 开放科学探索**:探索超出现有理论的新候选结构。结项目标:产生若干形式化、可检验、未被立即证伪的新理论候选。

#### Scenario: 阶段不可跳级
- **WHEN** P0 验收指标未达成
- **THEN** 系统不进入 P1 实现
- **AND** 文档明确标注当前所处阶段

### Requirement: 三层结算目标

系统 SHALL 按三层结算,避免把「发现终极理论」作为可结算目标:

1. **短期项目结算**(当前 GitHub 仓库):构建可复现的主动规则归纳实验框架,证明主动查询和版本空间搜索能让 AI 在封闭规则空间中更高效发现隐藏规则。
2. **中期论文结算**(workshop/preprint):提出 "active theory induction" 框架,将科学发现抽象为候选理论空间中的主动查询、反例搜索与复杂度惩罚优化问题,并在规则归纳与符号规律发现任务上验证有效性。
3. **长期愿景结算**:建立面向科学理论发现的 AI 迭代系统,使 AI 能在已验证事实、数学约束和反例搜索共同约束下,持续生成、检验、压缩和进化候选理论。

#### Scenario: 短期结算验收标准
- **WHEN** 评估 P0 项目结算
- **THEN** 满足:一键运行 benchmark、≥100 个随机任务、≥5 个 baseline、自动生成实验报告、有 manifest 和 SHA256 审计链、有失败案例分析、README 可复现

## MODIFIED Requirements

### Requirement: P0 规则归纳实验框架

(原:作为独立 demo 的规则归纳实验框架)

`p0-vs` 不再是独立项目,而是「主动理论发现」框架的 P0 微缩实验环境。现有 [src/rules.ts](file:///workspace/src/rules.ts) 的 `RULE_SPACE`(48 条候选规则)、`INPUT_SPACE`(三维整数 0..9)即为 P0 阶段 Theory DSL 与查询空间的实例化。

P0 结项目标保持:Active-InfoGain 在规则归纳任务上显著优于 Passive/Scaffold/Active-Random,并给出 Oracle version-space 上限。

验收指标:

| 指标 | 目标 |
| ---- | ---- |
| 任务数 | ≥ 100 |
| 条件 | passive / scaffold / active-random / active-infogain / oracle |
| 结果 | JSONL + manifest + report |
| 指标 | accuracy、query_count、token、failure_type |
| README | 一键复现 |

## REMOVED Requirements

无。本 spec 为增量升级,不删除现有 P0 能力,仅重新定位。
