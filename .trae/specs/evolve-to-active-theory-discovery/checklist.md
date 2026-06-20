# Checklist

## 框架定位与规范奠基

- [x] README 已重写,明确项目为「主动理论发现」框架的 P0 微缩环境,而非独立 demo
- [x] README 包含 P0–P4 五阶段路线图,且明确标注 P2–P4 仅路线图、当前只交付 P0/P1
- [x] README 包含三层结算目标(P0-ready / P1-ready / 论文结项)
- [x] README 包含项目新主张:"Active Theory Discovery: A Self-Improving Framework for Falsifiable Scientific Hypothesis Search"
- [x] README 语气控制:写「长期愿景是构建可验证的理论搜索框架;当前阶段只验证 P0/P1」,不写「发现统一理论」
- [x] README 明确标注当前所处阶段为 P0
- [x] [package.json](file:///workspace/package.json) 的 description 字段已反映新定位
- [x] TheoryScore 长期愿景 7 项公式已给出(仅参考,P2+ 启用)
- [x] P0 可计算评分已给出:`heldout_accuracy - rule_length_penalty - query_cost_penalty`
- [x] P1 可计算评分已给出:`heldout_prediction_accuracy + symbolic_equivalence_score - expression_complexity - query_cost`
- [x] 评分附带输出已定义:`Score + Confidence + EvidenceLevel + known_failures`
- [x] P0 Score 与现有 [src/metrics.ts](file:///workspace/src/metrics.ts) 的对齐方式已说明
- [x] 已明确禁止在 P0/P1 阶段使用完整 7 项公式
- [x] 6 大模块(KnownFacts / Theory DSL / Theory Proposer / Verifier / Falsifier / Theory Arena)接口规范已给出
- [x] KnownFacts 已定义为 Type A/B/C 可计算 schema,P0/P1 不引入物理事实
- [x] Theory DSL 分档表已给出,P0/P1 标注为当前交付,P2–P4 标注为路线图
- [x] Verifier 分阶段最小实现表已给出(P0: `rule(input)==label`;P1: heldout 误差+symbolic equivalence),不引入 Lean/Isabelle
- [x] Falsifier 的 P0 退化形态(active-infogain 主动查询)已说明
- [x] Theory Arena 排行榜维度已给出
- [x] Theory Arena 的 Anti-Goodhart 6 条硬约束已给出

## P0 规则归纳实验验收(P0-ready)

- [x] 随机任务生成器支持 ≥ 100 个任务
- [x] 5 个 baseline 齐全:passive / scaffold / active-random / active-infogain / oracle
- [x] 结果输出为 JSONL + manifest + report
- [x] manifest 含 SHA256 审计链
- [x] 指标含 accuracy / query_count / token / failure_type
- [x] 失败案例分析输出已补齐
- [x] README 一键复现命令可用
- [x] 报告含显著性检验 + 效应量
- [x] Oracle version-space 上限已在报告中标注
- [x] 不论 active 是否显著优于 scaffold,结果与失败条件已如实报告(负结果也算 P0 结项通过)

## P1 符号规律发现奠基(P1-ready,本 spec 范围内检查规范与防记忆污染设计)

- [x] P1 符号表达式 DSL 设计已记录(支持 `+`、`*`、`^`、`∝` 等)
- [x] 表达式复杂度计算方案已记录(节点数/深度)
- [x] 符号等价性判断方案已记录(借助 SymPy 或自研简化器)
- [x] P1 合成公式库目标 ≥ 50 条已记录(随机生成,LLM 不可能记忆)— 主要证据
- [x] P1 经典公式 ≥ 10 条已记录(`y=2x+1`、`E=mc^2`、`T^2∝r^3` 等)— 附加 demo
- [x] P1 无噪声/有噪声条件已记录
- [x] P1 heldout prediction 与 symbolic equivalence 必测项已记录
- [x] P1 报告中区分合成公式与经典公式两类任务准确率的要求已记录

## 路线图完整性(P2–P4 仅路线图,非交付)

- [x] P2 物理定律恢复路线已记录(开普勒/牛顿/时间膨胀),标注可行性约 45%
- [x] P3 跨理论统一路线已记录,标注可行性约 20%、不适合短期承诺
- [x] P4 开放科学探索路线已记录,标注不可作为工程承诺
- [x] P0/P1 可并行原型规则已明确(P0 主指标未达成不宣称 P1 结论,但允许并行开发 P1 原型)

## 核心主张一致性

- [x] 项目核心主张「把科学理论发现转化为可评分、可反驳、可压缩、可主动查询的搜索问题」在 spec/README/tasks 中一致出现
  - 已修复:tasks.md 顶部已补充核心主张与抓手定义
- [x] 抓手定义「在最小复杂度下,解释最多已知事实,并预测最多隐藏事实,同时经受住最强反例搜索」在 spec/README 中一致出现
- [x] 未把「发现终极理论」作为可结算目标
- [x] 已明确「P0 active query 有效 ≠ AI 可以发现深层物理理论」,采用更严谨表述
- [x] Anti-Goodhart 硬约束在 spec/tasks/checklist 中一致出现
- [x] 允许负结果的原则在 spec/tasks/checklist 中一致出现
