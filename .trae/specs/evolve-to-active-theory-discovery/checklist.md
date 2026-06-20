# Checklist

## 框架定位与规范奠基

- [ ] README 已重写,明确项目为「主动理论发现」框架的 P0 微缩环境,而非独立 demo
- [ ] README 包含 P0–P4 五阶段路线图
- [ ] README 包含三层结算目标(短期项目 / 中期论文 / 长期愿景)
- [ ] README 包含项目新主张:"Active Theory Discovery: A Self-Improving Framework for Falsifiable Scientific Hypothesis Search"
- [ ] README 明确标注当前所处阶段为 P0
- [ ] [package.json](file:///workspace/package.json) 的 description 字段已反映新定位
- [ ] TheoryScore 公式已给出,含 α/β/γ/δ/ε/λ/μ 权重说明
- [ ] P0 阶段 TheoryScore 权重退化表已给出(仅 Consistency/Prediction/Complexity 非零)
- [ ] TheoryScore 与现有 [src/metrics.ts](file:///workspace/src/metrics.ts) 的对齐方式已说明
- [ ] 6 大模块(KnownFacts / Theory DSL / Theory Proposer / Verifier / Falsifier / Theory Arena)接口规范已给出
- [ ] 每个模块的 P0 退化形态已说明
- [ ] Theory DSL 分档表(P0–P4)已给出
- [ ] KnownFacts 机器可读 JSON Schema 与 Level 0–7 分层已给出

## P0 规则归纳实验验收

- [ ] 随机任务生成器支持 ≥ 100 个任务
- [ ] 5 个 baseline 齐全:passive / scaffold / active-random / active-infogain / oracle
- [ ] 结果输出为 JSONL + manifest + report
- [ ] manifest 含 SHA256 审计链
- [ ] 指标含 accuracy / query_count / token / failure_type
- [ ] 失败案例分析输出已补齐
- [ ] README 一键复现命令可用
- [ ] Active-InfoGain 显著优于 Passive/Scaffold/Active-Random(报告中有对比)
- [ ] Oracle version-space 上限已在报告中标注

## P1 符号规律发现奠基(本 spec 范围内仅检查规范是否就绪)

- [ ] P1 符号表达式 DSL 设计已记录(支持 `+`、`*`、`^`、`∝` 等)
- [ ] 表达式复杂度计算方案已记录
- [ ] 符号等价性判断方案已记录
- [ ] P1 公式库目标 ≥ 50 条已记录
- [ ] P1 无噪声/有噪声条件已记录
- [ ] P1 heldout prediction 与 symbolic equivalence 必测项已记录

## 路线图完整性

- [ ] P2 物理定律恢复路线已记录(开普勒/牛顿/时间膨胀)
- [ ] P3 跨理论统一路线已记录
- [ ] P4 开放科学探索路线已记录
- [ ] 阶段不可跳级规则已明确(P0 未验收不进 P1)

## 核心主张一致性

- [ ] 项目核心主张「把科学理论发现转化为可评分、可反驳、可压缩、可主动查询的搜索问题」在 spec/README/tasks 中一致出现
- [ ] 抓手定义「在最小复杂度下,解释最多已知事实,并预测最多隐藏事实,同时经受住最强反例搜索」在 spec/README 中一致出现
- [ ] 未把「发现终极理论」作为可结算目标
