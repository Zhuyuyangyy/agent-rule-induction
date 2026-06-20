# Tasks

> 当前交付范围:P0/P1 可验证闭环。P2–P4 仅路线图,不拆任务。
>
> 核心主张:把科学理论发现转化为可评分、可反驳、可压缩、可主动查询的搜索问题。
> 抓手定义:在最小复杂度下,解释最多已知事实,并预测最多隐藏事实,同时经受住最强反例搜索。

## 阶段 0:框架定位与规范奠基(文档与规范,不写物理代码)

- [x] Task 1: 重写项目定位文档,把 `p0-vs` 重新定义为「主动理论发现」框架的 P0 微缩环境
  - [x] SubTask 1.1: 创建/重写 README,明确 P0–P4 路线图、三层结算目标、项目新主张("Active Theory Discovery: A Self-Improving Framework for Falsifiable Scientific Hypothesis Search")
  - [x] SubTask 1.2: 更新 [package.json](file:///workspace/package.json) 的 description 字段,反映新定位
  - [x] SubTask 1.3: README 语气控制:明确「长期愿景是构建可验证的理论搜索框架;当前阶段只验证 P0/P1」,不写「发现统一理论」
  - [x] SubTask 1.4: README 明确标注当前所处阶段为 P0,并说明 P0 验收指标
- [x] Task 2: 定义 TheoryScore 分阶段可计算评分规范
  - [x] SubTask 2.1: 给出长期愿景 7 项公式(仅参考,P2+ 启用)
  - [x] SubTask 2.2: 给出 P0 可计算评分:`heldout_accuracy - rule_length_penalty - query_cost_penalty`
  - [x] SubTask 2.3: 给出 P1 可计算评分:`heldout_prediction_accuracy + symbolic_equivalence_score - expression_complexity - query_cost`
  - [x] SubTask 2.4: 定义评分附带输出:`Score + Confidence + EvidenceLevel + known_failures`
  - [x] SubTask 2.5: 说明 P0 Score 与现有 [src/metrics.ts](file:///workspace/src/metrics.ts) 的 accuracy/query_count 对齐方式
  - [x] SubTask 2.6: 明确禁止在 P0/P1 阶段使用完整 7 项公式
- [x] Task 3: 定义 6 大模块接口规范与 P0/P1 最小实现
  - [x] SubTask 3.1: KnownFacts — 定义 Type A(input-output)/Type B(equation)/Type C(constraint)可计算 schema,P0/P1 不引入物理事实
  - [x] SubTask 3.2: Theory DSL — 给出分档表(P0 布尔/P1 符号为当前交付,P2–P4 路线图)
  - [x] SubTask 3.3: Theory Proposer — 给出多角色(Generator/Mutator/Combiner/Simplifier/Analogy),P0/P1 退化实现
  - [x] SubTask 3.4: Verifier — 给出分阶段最小实现表(P0: `rule(input)==label`;P1: heldout 误差+symbolic equivalence),不引入 Lean/Isabelle
  - [x] SubTask 3.5: Falsifier — P0 退化为 active-infogain 主动查询
  - [x] SubTask 3.6: Theory Arena — 给出排行榜维度 + Anti-Goodhart 6 条硬约束

## 阶段 1:P0 规则归纳实验完成(当前仓库核心目标,P0-ready)

- [x] Task 4: 补齐 P0 benchmark 验收指标,达成 P0-ready 结项标准
  - [x] SubTask 4.1: 确认任务数 ≥ 100 的随机任务生成器([src/taskGenerator.ts](file:///workspace/src/taskGenerator.ts))
  - [x] SubTask 4.2: 确认 5 个 baseline 齐全:passive / scaffold / active-random / active-infogain / oracle
  - [x] SubTask 4.3: 确认结果输出为 JSONL + manifest + report,含 SHA256 审计链
  - [x] SubTask 4.4: 确认指标含 accuracy / query_count / token / failure_type
  - [x] SubTask 4.5: 补齐失败案例分析输出
  - [x] SubTask 4.6: 确认 README 一键复现命令
- [x] Task 5: 评估 Active-InfoGain 是否优于 baseline(允许负结果)
  - [x] SubTask 5.1: 运行完整 benchmark 并生成对比报告(100 任务,3 算法 baseline 已跑;LLM baseline 需 API key,管线就绪)
  - [x] SubTask 5.2: 报告显著性检验 + 效应量(3 条 paired t-test + Cohen's d)
  - [x] SubTask 5.3: 在报告中标注 oracle version-space 作为理论上限(accuracy=1.0, avgQueries=3.34)
  - [x] SubTask 5.4: 不论 active 是否显著优于 scaffold,如实报告结果与失败条件(active-infogain 显著优于 active-random, p<0.0001, d=0.779;LLM 对比待 API key)

## 阶段 2:P1 符号规律发现(P1-ready,可与 P0 后期并行原型)

- [x] Task 6: 扩展 Theory DSL 从 P0 布尔规则到 P1 符号表达式
  - [x] SubTask 6.1: 设计符号表达式 DSL(支持 `+`、`*`、`^`、`∝` 等)— [src/p1/symbolicExpr.ts](file:///workspace/src/p1/symbolicExpr.ts)
  - [x] SubTask 6.2: 实现表达式复杂度计算(节点数/深度)— `complexity(expr)`
  - [x] SubTask 6.3: 实现符号等价性判断(借助 SymPy 或自研简化器)— `isSymbolicallyEquivalent` 数值采样近似(无新依赖)
- [x] Task 7: 构建 P1 符号规律发现 benchmark(含防记忆污染设计)— [src/p1/p1Benchmark.ts](file:///workspace/src/p1/p1Benchmark.ts)
  - [x] SubTask 7.1: 合成公式库 ≥ 50 条(随机生成表达式,如 `y = 3x^2 - 2z + 5`,LLM 不可能记忆)— 主要证据(实际 60 条)
  - [x] SubTask 7.2: 经典公式 ≥ 10 条(`y=2x+1`、`E=mc^2`、`T^2∝r^3` 等)— 附加 demo(实际 10 条)
  - [x] SubTask 7.3: 支持无噪声 / 有噪声两种条件(`--noise 0` / `--noise 0.05`)
  - [x] SubTask 7.4: 必测 heldout prediction 与 symbolic equivalence(p1Score 含两项)
  - [x] SubTask 7.5: 报告中区分合成公式与经典公式两类任务的准确率(aggregated.synthetic / aggregated.classic)
- [x] Task 8: 在 P1 上评估 active-infogain 是否优于 passive/scaffold/random(允许负结果)
  - 评估结果:greedy(≈active-infogain 的 P1 退化)显著优于 random(配对符号检验 p≈2.2e-8,greedy 胜 58/random 胜 12)
  - 负结果:经典公式上 greedy 表现差(avgAcc 0.43,过拟合+复杂度惩罚),合成公式上表现好(avgAcc 0.91)— 如实报告

## 阶段 3:P2–P4 路线图(仅记录,不拆任务,非当前交付)

- [ ] Task 9: P2 物理定律恢复(开普勒/牛顿/时间膨胀等)— 路线图,可行性约 45%,待 P1 验收后小范围拆解
- [ ] Task 10: P3 跨理论统一 — 路线图,可行性约 20%,不适合短期承诺
- [ ] Task 11: P4 开放科学探索 — 路线图,不可作为工程承诺

# Task Dependencies

- Task 2 依赖 Task 1(定位文档先行,TheoryScore 才有归属)
- Task 3 依赖 Task 2(模块接口需引用 TheoryScore)
- Task 4 依赖 Task 3(P0 实验需对齐模块接口规范)
- Task 5 依赖 Task 4(对比实验需 benchmark 就绪)
- Task 6 可与 Task 4/Task 5 部分并行(P0/P1 允许并行原型,但 P0 主指标未达成不宣称 P1 结论)
- Task 7 依赖 Task 6(P1 benchmark 需 DSL 就绪)
- Task 8 依赖 Task 7(P1 对比实验需 benchmark 就绪)
- Task 9 依赖 Task 8(P2 需 P1 验收通过,仅路线图)
- Task 10 依赖 Task 9(仅路线图)
- Task 11 依赖 Task 10(仅路线图)
- Task 1、Task 2、Task 3 可与 Task 4 部分并行(文档规范与 P0 实验补齐互不阻塞)
