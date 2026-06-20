# Active Theory Discovery 框架升级 Spec

## Why

当前仓库 `p0-vs` 只是一个封闭的规则归纳实验框架(48 条候选规则、三维整数输入、版本空间筛选),GitHub 描述也仅是 "Rule induction experiment framework (p0-vs) with API safety layer"。这只是项目真正野心的外壳。

项目的长期愿景是:给 AI 一个像 AlphaGo「赢棋」一样明确的抓手,让它能不断提出、检验、压缩、迭代理论,最终寻找一个能统一解释已知物理事实的更深层理论。AlphaGo 之所以成功,是因为它有一个极其清晰的闭环(局面 → 搜索 → 落子 → 胜负 → 更新策略 → 自博弈);本项目也需要一个等价的闭环,把「科学理论发现」转化为一个可评分、可反驳、可压缩、可主动查询的搜索问题。

但本 spec 不承诺「发现终极理论」。当前 `p0-vs` 是这个宏大框架的 **P0 级微缩宇宙**:它已经实现了最小闭环(隐藏规则 → 少量样本 → 主动查询 → 缩小版本空间 → 猜规则),对应科学发现的极简版(自然规律 → 少量观测 → 做实验 → 排除错误理论 → 提出更好理论)。

**本 spec 的当前交付范围严格收敛为 P0/P1 可验证闭环**:先把 P0 做成可复现的硬 benchmark,再用 P1 证明主动查询机制能迁移到符号规律发现。P2–P4 仅作为长期路线图记录,不作为当前交付目标。P0 active query 有效 ≠ AI 可以发现深层物理理论;更严谨的说法是:P0 验证了主动查询和版本空间压缩在封闭规则空间中的有效性,P1/P2 将逐步测试该机制是否能迁移到更复杂的理论语言。

## What Changes

- **重新定位项目**:把 `agent-rule-induction` / `p0-vs` 定义为更宏大「主动理论发现(Active Theory Discovery)」框架的 P0 微缩实验环境,而非独立 demo。对外表达控制:不写「发现统一理论」,写「长期愿景是构建可验证的理论搜索框架;当前阶段只验证 P0/P1」。
- **确立核心抓手(目标函数)**:定义 `TheoryScore`,把「赢棋」翻译成「在最小复杂度下,解释最多已知事实,并预测最多隐藏事实,同时经受住最强反例搜索」。但 P0/P1 阶段只使用可计算的退化形式,不使用完整 7 项公式。
- **定义 6 大核心模块**:KnownFacts(已知事实库)、Theory DSL(理论语言)、Theory Proposer(理论生成器)、Verifier(验证器)、Falsifier(反例搜索器)、Theory Arena(理论排行榜),每个模块给出 P0/P1 最小实现。
- **定义 P0–P4 五阶段路线图**:规则归纳 → 符号规律 → 物理定律恢复 → 跨理论统一 → 开放科学探索。**当前只交付 P0/P1,P2–P4 仅路线图**。
- **定义三层结算目标**:P0-ready(当前版本)、P1-ready(下一版本)、论文结项(active theory induction 方法论文)。允许负结果:active 未显著优于 scaffold 也是重要发现,如实报告。
- **升级项目主张与命名**:对外主张为 "Active Theory Discovery: A Self-Improving Framework for Falsifiable Scientific Hypothesis Search"。
- **BREAKING**:项目语义从「规则归纳实验」升级为「理论发现框架」,README、文档、对外描述需同步重写;`RULE_SPACE` 从「项目核心」降级为「P0 理论语言实例」。

## Impact

- Affected specs: 无前置 spec(本 spec 为框架奠基)。
- Affected code:
  - [src/rules.ts](file:///workspace/src/rules.ts) — `RULE_SPACE` 重新定位为 P0 Theory DSL 实例,后续需抽象出通用 Theory DSL 接口。
  - [src/runActive.ts](file:///workspace/src/runActive.ts) / [src/runPassive.ts](file:///workspace/src/runPassive.ts) / [src/runScaffold.ts](file:///workspace/src/runScaffold.ts) 等 runner — 作为 P0 阶段实验主体,需补齐 benchmark 验收指标。
  - [src/metrics.ts](file:///workspace/src/metrics.ts) — 现有 accuracy/query_count/token 指标是 P0 Score 的子集,需对齐 P0/P1 可计算评分定义。
  - [src/apiSafety.ts](file:///workspace/src/apiSafety.ts) — API 安全层保留,作为整个框架的基础设施。
  - [src/taskGenerator.ts](file:///workspace/src/taskGenerator.ts) — 需确认支持 ≥100 任务。
  - [package.json](file:///workspace/package.json) — 项目名/描述需反映新定位。
  - README(待创建)— 需重写为框架级说明,语气控制:明确当前只交付 P0/P1,P2–P4 仅路线图。
- 新增(规划中):KnownFacts Type A/B/C schema、Theory DSL 接口、Theory Proposer 多角色、Verifier 分阶段最小实现、Falsifier 反例搜索、Theory Arena 排行榜 + Anti-Goodhart 约束。

## ADDED Requirements

### Requirement: TheoryScore 目标函数(分阶段可计算)

系统 SHALL 定义一个理论评分函数,作为整个框架的「赢棋」目标。**完整 7 项公式仅作为长期愿景函数;P0/P1 阶段必须使用可计算的退化形式,避免陷入「看起来科学的主观评分」**。

长期愿景公式(仅供参考,P2+ 才逐步启用):

```
Score(T) =
  α · Consistency(T, KnownFacts)
+ β · Prediction(T, HeldoutFacts)
+ γ · Compression(T)
+ δ · Unification(T)
+ ε · Falsifiability(T)
- λ · Complexity(T)
- μ · Contradiction(T)
```

**P0 可计算评分(当前交付)**:

```
P0Score(T) =
    heldout_accuracy(T)              // 规则在 heldout 样本上的命中率
  - rule_length_penalty(T)           // 规则描述长度惩罚(防止堆特例)
  - query_cost_penalty(T)            // 查询次数/token 惩罚
```

**P1 可计算评分(下一阶段交付)**:

```
P1Score(T) =
    heldout_prediction_accuracy(T)   // 表达式在 heldout 数据上的误差
  + symbolic_equivalence_score(T)    // 是否符号等价于目标公式
  - expression_complexity(T)         // 表达式复杂度(节点数/深度)
  - query_cost(T)                    // 查询代价
```

P2 以后再逐步加 physics consistency、unification 等。**禁止在 P0/P1 阶段使用完整 7 项公式**。

#### Scenario: P0 评分可计算
- **WHEN** 系统处于 P0 阶段
- **THEN** 评分仅由 heldout_accuracy、rule_length_penalty、query_cost_penalty 三项组成
- **AND** 每一项都有明确算法实现,不依赖主观判断
- **AND** 评分结果可与现有 [src/metrics.ts](file:///workspace/src/metrics.ts) 的 accuracy/query_count 对齐

#### Scenario: 评分附带不确定性与证据等级
- **WHEN** 系统输出某理论的评分
- **THEN** 同时输出 `Score(T) + Confidence(T) + EvidenceLevel(T) + known_failures`
- **AND** 例如:`{"score": 82.1, "confidence": 0.74, "evidence_level": "P0_rule_benchmark", "known_failures": ["fails on EVEN rules with v=6"]}`
- **AND** 不同阶段(P0 规则得分 95 vs P2 物理理论得分 80)不可直接比较,需通过 evidence_level 标注

### Requirement: KnownFacts 已知事实库(Type A/B/C 可计算 schema)

系统 SHALL 提供一个结构化的已知事实库作为整个系统的地基,禁止 AI 凭空发明理论。**事实库必须先成为可计算对象,再谈物理层级;不从物理文本开始**。

事实按可计算类型分为三类(优先实现):

- **Type A: input-output facts** — 输入输出对(P0 阶段即 `(x, label)` 样本)
- **Type B: equation facts** — 方程关系(P1 阶段即 `(variables, relation, conditions, tolerance)`)
- **Type C: constraint facts** — 硬约束(P2+ 阶段即守恒律、洛伦兹不变性等)

Type B 事实机器可读格式:

```json
{
  "id": "linear_motion_001",
  "type": "equation",
  "domain": "classical_mechanics",
  "variables": ["F", "m", "a"],
  "relation": "F = m * a",
  "conditions": ["inertial_frame", "constant_mass"],
  "tolerance": 1e-6,
  "source_status": "textbook"
}
```

物理领域分层(Level 0–7:数学/经典力学/电磁学/狭义相对论/广义相对论/量子力学/标准模型/开放问题)仅作为 P2+ 的远期组织维度,**P0/P1 不引入物理事实**。

#### Scenario: P0 阶段事实库
- **WHEN** 系统处于 P0 阶段
- **THEN** KnownFacts 仅为 Type A:隐藏规则生成的 `(input, label)` 样本对,部分作为已知事实、部分作为 heldout
- **AND** heldout 对 Proposer 严格不可见

#### Scenario: P1 阶段事实库
- **WHEN** 系统处于 P1 阶段
- **THEN** KnownFacts 为 Type B:方程事实,含 variables/relation/conditions/tolerance
- **AND** tolerance 可计算验证,非自然语言断言

### Requirement: Theory DSL 理论语言

系统 SHALL 定义一个结构化的理论描述语言,使 AI 提出的理论可被机器验证,禁止输出无法结算的自然语言断言。

理论语言分档:

| 阶段 | 理论语言 | 当前交付 |
| ---- | ---- | ---- |
| P0 | 布尔规则(当前 `RULE_SPACE`) | 是 |
| P1 | 符号表达式 | 是 |
| P2 | 方程 / 微分方程 | 否(路线图) |
| P3 | 公理系统 + 推导链 | 否(路线图) |
| P4 | 可仿真物理模型 | 否(路线图) |

#### Scenario: P0 DSL 即现有规则
- **WHEN** 系统处于 P0 阶段
- **THEN** Theory DSL 实例化为 [src/rules.ts](file:///workspace/src/rules.ts) 中的 `Rule` 接口
- **AND** 每条规则可被 `(x) => boolean` 调用并给出自然语言描述

#### Scenario: P1 DSL 扩展
- **WHEN** 系统进入 P1 阶段
- **THEN** Theory DSL 扩展为符号表达式(如 `y = 2x + 1`、`T^2 ∝ r^3`)
- **AND** 表达式复杂度可计算(节点数/深度)、符号等价性可判断(借助 SymPy 或自研简化器)

### Requirement: Theory Proposer 理论生成器

系统 SHALL 提供多角色理论生成器,而非单一 agent,以模拟理论进化过程。

至少包含以下角色(P0/P1 可退化实现):
- Generator Agent:提出新理论
- Mutator Agent:修改旧理论
- Combiner Agent:组合两个理论
- Simplifier Agent:压缩理论、删除多余假设
- Analogy Agent:从其他领域迁移结构(P2+ 启用)

#### Scenario: 理论进化循环
- **WHEN** Arena 中存在理论种群
- **THEN** Proposer 能基于高分理论进行变异、组合、简化
- **AND** 生成的新理论进入 Verifier 与 Falsifier 流程

### Requirement: Verifier 验证器(分阶段最小实现)

系统 SHALL 提供验证器,严格防止项目退化为「LLM 幻觉理论生成器」。**不一开始就引入 Lean/Isabelle,按阶段给出最小可实现验证**。

分阶段最小实现:

| 阶段 | Verifier 最小实现 | 当前交付 |
| ---- | ---- | ---- |
| P0 | `rule(input) == label`(规则在样本上是否一致) | 是 |
| P1 | 表达式在 heldout 数据上的误差 + symbolic equivalence | 是 |
| P2 | 方程仿真结果是否匹配标准数据 | 否(路线图) |
| P3 | 局部形式化证明 + 约束检查 | 否(路线图) |
| P4 | 多工具验证 + 人类专家审查 | 否(路线图) |

长期四层验证方向(语法/逻辑/数学/经验)与工具方向(SymPy/Lean/数值仿真/constraint checker/benchmark/adversarial search)仅作为 P2+ 演进参考。

#### Scenario: P0 阶段验证
- **WHEN** 系统处于 P0 阶段
- **THEN** Verifier 仅为 `rule(input) == label` 的布尔判定
- **AND** 不引入符号推导/数值仿真

### Requirement: Falsifier 反例搜索器

系统 SHALL 提供反例搜索器,其任务不是证明理论对,而是找理论哪里错。**没有 Falsifier,项目会变成「LLM 胡编理论生成器」;有了 Falsifier,它才有科学味道**。

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

### Requirement: Theory Arena 理论排行榜(含 Anti-Goodhart 硬约束)

系统 SHALL 维护一个理论种群与排行榜,使理论发现成为持续迭代过程。**一旦有评分函数,agent 会钻评分漏洞,Arena 必须加 Anti-Goodhart 硬约束**。

排行榜比较维度:解释事实数、参数数、heldout 预测准确率、硬约束违反数、新预测价值。

迭代循环:`选择高分理论 → 变异 → 组合 → 验证 → 淘汰 → 保留`。

**Anti-Goodhart Rules(硬约束,不可绕过)**:

1. Heldout facts 对 Proposer 严格不可见
2. Theory 不得直接枚举训练事实(禁止查表式理论)
3. 新预测必须可被 Verifier/Falsifier 解析(禁止不可证伪的空预测)
4. 高分理论必须通过 adversarial test
5. 复杂度惩罚随训练事实数量增加(防止靠堆特例得高分)
6. 没有 novel prediction 的理论不能进入高等级榜单(防止「我不预测所以不被证伪」的钻空子理论)

#### Scenario: 理论种群维护
- **WHEN** 系统运行中
- **THEN** Arena 维护形如 `T_001: score 82.1 / T_002: score 79.4 / ...` 的种群
- **AND** 可导出种群快照供审计

#### Scenario: Anti-Goodhart 拦截
- **WHEN** Proposer 提出一个无 novel prediction 的理论
- **THEN** 该理论被 Arena 拒绝进入高等级榜单
- **AND** 拦截原因可审计

### Requirement: P0–P4 五阶段路线图(P2–P4 仅路线图,非交付)

系统 SHALL 按以下五阶段递进。**当前 spec 只交付 P0/P1,P2–P4 仅作为长期路线图记录,不作为当前交付目标**:

- **P0 规则归纳世界**(当前交付):证明 AI 能通过主动查询,比被动观察更快发现隐藏规则。
- **P1 符号规律发现**(当前交付):规则从布尔条件升级到符号表达式。
- **P2 物理定律恢复**(路线图,非交付):从轨道数据恢复开普勒定律等。可行性约 45%,只能小范围开始。
- **P3 跨理论统一**(路线图,非交付):寻找不同理论共同结构。可行性约 20%,接近科学哲学+形式化物理+自动定理证明+模型发现,不适合短期承诺。
- **P4 开放科学探索**(路线图,非交付):探索超出现有理论的新候选结构。不可作为工程承诺,正确写法是「产生形式化、可检验、未被立即证伪的新理论候选」,而非「发现终极理论」。

#### Scenario: P0/P1 可并行原型,但结论不可越级
- **WHEN** P0 主指标未达成
- **THEN** 不对外宣称 P1/P2 结论
- **AND** 但允许并行开发 P1 原型(工程上不死板阻塞)
- **AND** 文档明确标注当前所处阶段

### Requirement: 三层结算目标(允许负结果)

系统 SHALL 按三层结算,避免把「发现终极理论」作为可结算目标。**科学上允许结果不是 active 优于 scaffold,负结果也是重要发现,如实报告**:

1. **P0-ready(当前版本结项)**:完成 Active Theory Discovery 的 P0 微缩环境,在封闭规则空间中比较 Passive/Scaffold/Active-Random/Active-InfoGain/Oracle Version-Space,评估主动查询是否能提升规则发现的准确率、查询效率和稳定性。
2. **P1-ready(下一版本结项)**:扩展 Theory DSL 到符号表达式发现,在合成公式与少量经典公式任务上测试主动查询是否能提高公式恢复能力。
3. **论文结项**:提出 Active Theory Discovery 框架,将理论发现建模为「候选理论空间中的主动查询、反例搜索、复杂度惩罚和可验证评分」问题,并在 P0 规则归纳与 P1 符号规律发现中验证该框架的可操作性。

#### Scenario: P0-ready 验收标准
- **WHEN** 评估 P0 项目结算
- **THEN** 满足:README 完整解释愿景与当前 P0 范围、benchmark 一键运行、≥100 任务、≥5 baseline、JSONL+manifest+SHA256、自动 report、失败案例分析、显著性检验+效应量、**不论结果正负都如实报告**

#### Scenario: 负结果也算通过
- **WHEN** Active-InfoGain 未显著优于 Scaffold
- **THEN** 项目仍算 P0 结项通过,前提是如实报告显著性、效应量和失败条件
- **AND** 这本身是一个重要发现,不视为项目失败

### Requirement: P1 合成公式防记忆污染

P1 阶段 SHALL 同时包含两类任务,避免 LLM 靠记忆经典公式作弊:

- **A. 合成公式发现(主要证据)**:用随机生成的表达式(如 `y = 3x^2 - 2z + 5`、`y = a*b + c^2`、`y = sin(x) + x^2`),LLM 不可能记忆。真正的 P1 证据主要来自此类。
- **B. 经典公式恢复(附加 demo)**:含 `y=2x+1`、`E=mc^2`、`T^2∝r^3` 等,用来展示科学意义,但不作为主要证据。

#### Scenario: P1 证据来源
- **WHEN** 评估 P1 active vs passive
- **THEN** 主要证据来自合成公式(≥50 条),经典公式(≥10 条)仅作附加 demo
- **AND** 报告中区分两类任务的准确率

## MODIFIED Requirements

### Requirement: P0 规则归纳实验框架

(原:作为独立 demo 的规则归纳实验框架)

`p0-vs` 不再是独立项目,而是「主动理论发现」框架的 P0 微缩实验环境。现有 [src/rules.ts](file:///workspace/src/rules.ts) 的 `RULE_SPACE`(48 条候选规则)、`INPUT_SPACE`(三维整数 0..9)即为 P0 阶段 Theory DSL 与查询空间的实例化。

P0 结项目标(允许负结果):评估 Active-InfoGain 是否优于 Passive/Scaffold/Active-Random,并报告显著性、效应量和失败条件,给出 Oracle version-space 上限。

验收指标:

| 指标 | 目标 |
| ---- | ---- |
| 任务数 | ≥ 100 |
| 条件 | passive / scaffold / active-random / active-infogain / oracle |
| 结果 | JSONL + manifest + report |
| 指标 | accuracy、query_count、token、failure_type |
| 统计 | 显著性检验 + 效应量 |
| README | 一键复现 |

## REMOVED Requirements

无。本 spec 为增量升级,不删除现有 P0 能力,仅重新定位。
