# Tasks

## 阶段 0:框架定位与规范奠基(不写物理代码,只立框架)

- [ ] Task 1: 重写项目定位文档,把 `p0-vs` 重新定义为「主动理论发现」框架的 P0 微缩环境
  - [ ] SubTask 1.1: 创建/重写 README,明确 P0–P4 路线图、三层结算目标、项目新主张("Active Theory Discovery: A Self-Improving Framework for Falsifiable Scientific Hypothesis Search")
  - [ ] SubTask 1.2: 更新 [package.json](file:///workspace/package.json) 的 description 字段,反映新定位
  - [ ] SubTask 1.3: 在 README 中明确标注当前所处阶段为 P0,并说明 P0 验收指标
- [ ] Task 2: 定义 TheoryScore 目标函数规范与 P0 退化映射
  - [ ] SubTask 2.1: 在文档中给出 `Score(T)` 完整公式与 α/β/γ/δ/ε/λ/μ 权重说明
  - [ ] SubTask 2.2: 给出 P0 阶段权重退化表(仅 Consistency/Prediction/Complexity 非零)
  - [ ] SubTask 2.3: 说明 TheoryScore 与现有 [src/metrics.ts](file:///workspace/src/metrics.ts) 的 accuracy/query_count 对齐方式
- [ ] Task 3: 定义 6 大模块接口规范(KnownFacts / Theory DSL / Theory Proposer / Verifier / Falsifier / Theory Arena)
  - [ ] SubTask 3.1: 给出每个模块的职责、输入输出、P0 退化形态
  - [ ] SubTask 3.2: 给出 Theory DSL 分档表(P0 布尔 → P1 符号 → P2 方程 → P3 公理 → P4 仿真)
  - [ ] SubTask 3.3: 给出 KnownFacts 机器可读 JSON Schema 与分层 Level 0–7

## 阶段 1:P0 规则归纳实验完成(当前仓库核心目标)

- [ ] Task 4: 补齐 P0 benchmark 验收指标,达成短期项目结算标准
  - [ ] SubTask 4.1: 确认任务数 ≥ 100 的随机任务生成器([src/taskGenerator.ts](file:///workspace/src/taskGenerator.ts))
  - [ ] SubTask 4.2: 确认 5 个 baseline 齐全:passive / scaffold / active-random / active-infogain / oracle
  - [ ] SubTask 4.3: 确认结果输出为 JSONL + manifest + report,含 SHA256 审计链
  - [ ] SubTask 4.4: 确认指标含 accuracy / query_count / token / failure_type
  - [ ] SubTask 4.5: 补齐失败案例分析输出
  - [ ] SubTask 4.6: 确认 README 一键复现命令
- [ ] Task 5: 验证 Active-InfoGain 显著优于 Passive/Scaffold/Active-Random,并给出 Oracle 上限
  - [ ] SubTask 5.1: 运行完整 benchmark 并生成对比报告
  - [ ] SubTask 5.2: 在报告中标注 oracle version-space 作为理论上限

## 阶段 2:P1 符号规律发现(下一阶段,本 spec 仅奠基)

- [ ] Task 6: 扩展 Theory DSL 从 P0 布尔规则到 P1 符号表达式
  - [ ] SubTask 6.1: 设计符号表达式 DSL(支持 `+`、`*`、`^`、`∝` 等)
  - [ ] SubTask 6.2: 实现表达式复杂度计算
  - [ ] SubTask 6.3: 实现符号等价性判断(借助 SymPy 或自研简化器)
- [ ] Task 7: 构建 P1 符号规律发现 benchmark
  - [ ] SubTask 7.1: 建立公式库 ≥ 50 条(含 `y=2x+1`、`E=mc^2`、`T^2∝r^3` 等)
  - [ ] SubTask 7.2: 支持无噪声 / 有噪声两种条件
  - [ ] SubTask 7.3: 必测 heldout prediction 与 symbolic equivalence
- [ ] Task 8: 在 P1 上验证 active-infogain 优于 passive/scaffold/random

## 阶段 3+:P2–P4(远期,本 spec 仅记录路线,不拆任务)

- [ ] Task 9: P2 物理定律恢复(开普勒/牛顿/时间膨胀等)— 远期,待 P1 验收后拆解
- [ ] Task 10: P3 跨理论统一 — 远期,待 P2 验收后拆解
- [ ] Task 11: P4 开放科学探索 — 远期,待 P3 验收后拆解

# Task Dependencies

- Task 2 依赖 Task 1(定位文档先行,TheoryScore 才有归属)
- Task 3 依赖 Task 2(模块接口需引用 TheoryScore)
- Task 4 依赖 Task 3(P0 实验需对齐模块接口规范)
- Task 5 依赖 Task 4(对比实验需 benchmark 就绪)
- Task 6 依赖 Task 5(P1 扩展需 P0 验收通过)
- Task 7 依赖 Task 6(P1 benchmark 需 DSL 就绪)
- Task 8 依赖 Task 7(P1 对比实验需 benchmark 就绪)
- Task 9 依赖 Task 8(P2 需 P1 验收通过)
- Task 10 依赖 Task 9
- Task 11 依赖 Task 10
- Task 1、Task 2、Task 3 可与 Task 4 部分并行(文档规范与 P0 实验补齐互不阻塞)
