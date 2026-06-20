# 6 大模块接口规范

> 本文档定义「主动理论发现(Active Theory Discovery)」框架的 6 大核心模块接口,及 P0/P1 最小实现。
> 当前交付范围:P0/P1。P2–P4 仅路线图。
> 对齐代码:[src/rules.ts](../src/rules.ts)、[src/env.ts](../src/env.ts)、[src/taskGenerator.ts](../src/taskGenerator.ts)、[src/metrics.ts](../src/metrics.ts)、[src/runActive.ts](../src/runActive.ts)。

---

## 模块 1:KnownFacts 已知事实库

**职责**:提供结构化的已知事实库作为整个系统的地基,**禁止 AI 凭空发明理论**。事实库必须先成为可计算对象,再谈物理层级;不从物理文本开始。

### 1.1 事实类型(Type A / B / C 可计算 schema)

| 类型 | 含义 | 启用阶段 | 可计算性 |
| ---- | ---- | ---- | ---- |
| **Type A** | input-output facts(输入输出对) | P0 | `(input, label)` 直接可验证 |
| **Type B** | equation facts(方程关系) | P1 | `variables/relation/conditions/tolerance` 机器可读、可数值验证 |
| **Type C** | constraint facts(硬约束) | P2+ | 守恒律、洛伦兹不变性等,需形式化检查器 |

### 1.2 Type A 示例(P0)

P0 阶段 KnownFacts 即隐藏规则生成的 `(input, label)` 样本对,部分作为已知事实(训练)、部分作为 heldout(对 Proposer 严格不可见)。

```json
{
  "id": "fact_0001",
  "type": "io",
  "input": [3, 7, 2],
  "label": true
}
```

**对齐代码**:对应 [src/env.ts](../src/env.ts) 的 `Observation = { input: [number,number,number], output: boolean }`,以及 [src/taskGenerator.ts](../src/taskGenerator.ts) 中 `Task.initialObservations`(已知事实)与未暴露的 heldout 子集。`label` 由 `Rule.call(input)` 生成。

### 1.3 Type B 示例(P1,完整 JSON)

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

**字段说明**:
- `variables`:方程中出现的变量符号列表。
- `relation`:方程关系字符串(可被符号引擎解析)。
- `conditions`:方程成立的前提条件(如惯性系)。
- `tolerance`:数值验证容差,可计算验证而非自然语言断言。
- `source_status`:事实来源等级(`textbook` / `experiment` / `derived`),用于置信度加权。

### 1.4 Type C 示例(P2+,硬约束)

Type C 为硬约束,如守恒律、对称性,违反即理论直接淘汰。

```json
{
  "id": "conservation_momentum",
  "type": "constraint",
  "domain": "classical_mechanics",
  "constraint": "sum(m_i * v_i) = const",
  "scope": "closed_system",
  "checker": "symbolic_conservation_checker"
}
```

### 1.5 物理领域分层(仅 P2+ 远期组织维度)

物理领域分层 **Level 0–7**(数学 / 经典力学 / 电磁学 / 狭义相对论 / 广义相对论 / 量子力学 / 标准模型 / 开放问题)仅作为 P2+ 的远期组织维度。

**P0/P1 不引入物理事实**:
- P0 事实库仅为 Type A(布尔规则生成的 io 对)。
- P1 事实库为 Type B(方程事实),但优先使用**合成公式**(防 LLM 记忆污染),经典物理公式仅作附加 demo。
- 物理层级分层在 P2+ 具备真实物理事实库后才启用。

---

## 模块 2:Theory DSL 理论语言

**职责**:定义结构化的理论描述语言,使 AI 提出的理论可被机器验证,**禁止输出无法结算的自然语言断言**。

### 2.1 分档表

| 阶段 | 理论语言 | 当前交付 | 复杂度度量 |
| ---- | ---- | ---- | ---- |
| **P0** | 布尔规则(当前 `RULE_SPACE`) | 是 | 谓词数 / `naturalLanguage().length` |
| **P1** | 符号表达式 | 是 | AST 节点数 / 深度 |
| P2 | 方程 / 微分方程 | 否(路线图) | 方程阶数 / 参数数 |
| P3 | 公理系统 + 推导链 | 否(路线图) | 公理数 / 推导步数 |
| P4 | 可仿真物理模型 | 否(路线图) | 模型自由度 / 仿真代价 |

### 2.2 P0 DSL 即现有 Rule 接口

P0 阶段 Theory DSL 实例化为 [src/rules.ts](../src/rules.ts) 中的 `Rule` 接口:

```ts
export interface Rule {
  id: string;
  call: (x: [number, number, number]) => boolean;
  naturalLanguage: () => string;
}
```

- `call`:理论的可执行判定,输入 `(x0, x1, x2)` ∈ `{0..9}^3`,输出布尔。
- `naturalLanguage`:理论的人类可读描述,用于审计与 `rule_length_penalty` 计算。
- `RULE_SPACE`(48 条候选规则)即 P0 理论空间;`INPUT_SPACE`(1000 个输入)即 P0 查询空间。

**结论**:`Rule` 接口就是 P0 DSL 的实例,无需新增抽象;P1 起才需扩展为符号表达式 DSL(支持 `+`、`*`、`^`、`∝` 等)。

### 2.3 P1 DSL 扩展方向

P1 Theory DSL 扩展为符号表达式(如 `y = 2x + 1`、`T^2 ∝ r^3`):
- 表达式复杂度可计算(节点数 / 深度)。
- 符号等价性可判断(借助 SymPy 或自研简化器)。
- 防记忆污染:主要证据来自合成公式(≥50 条),经典公式(≥10 条)仅附加 demo。

---

## 模块 3:Theory Proposer 理论生成器

**职责**:提供多角色理论生成器,模拟理论进化过程,而非单一 agent。

### 3.1 多角色定义

| 角色 | 职责 | 启用阶段 |
| ---- | ---- | ---- |
| **Generator** | 提出新理论 | P0 |
| **Mutator** | 修改旧理论(变异) | P0 |
| **Combiner** | 组合两个理论 | P1 |
| **Simplifier** | 压缩理论、删除多余假设 | P1 |
| **Analogy** | 从其他领域迁移结构 | P2+ |

### 3.2 P0/P1 退化实现

**P0 退化**:
- Proposer 退化为「从 `RULE_SPACE` 中基于版本空间筛选候选规则」。
- Generator = 枚举 `DISTINCT_RULES` 中与已知事实一致的规则(即 [src/taskGenerator.ts](../src/taskGenerator.ts) `computeVersionSpace`)。
- Mutator/Combiner/Simplifier 在 P0 不启用(规则为原子谓词,无组合/简化空间)。
- 真正的「主动选择」由 Falsifier(模块 5)承担。

**P1 退化**:
- Generator:LLM 基于已知 `(x, y)` 对提出候选符号表达式。
- Mutator:对表达式做局部变异(替换算子、增删项)。
- Combiner:组合两个表达式(如线性组合)。
- Simplifier:对 AST 做代数化简。
- Analogy:P2+ 启用。

### 3.3 理论进化循环

```
Arena 中存在理论种群
  → Proposer 基于高分理论进行 Generator/Mutator/Combiner/Simplifier
  → 生成的新理论进入 Verifier 与 Falsifier 流程
  → 通过则进入 Arena,失败则淘汰
```

---

## 模块 4:Verifier 验证器

**职责**:严格防止项目退化为「LLM 幻觉理论生成器」。**不一开始引入 Lean/Isabelle,按阶段给出最小可实现验证**。

### 4.1 分阶段最小实现表

| 阶段 | Verifier 最小实现 | 当前交付 |
| ---- | ---- | ---- |
| **P0** | `rule(input) == label`(规则在样本上是否一致) | 是 |
| **P1** | 表达式在 heldout 数据上的误差 + symbolic equivalence | 是 |
| P2 | 方程仿真结果是否匹配标准数据 | 否(路线图) |
| P3 | 局部形式化证明 + 约束检查 | 否(路线图) |
| P4 | 多工具验证 + 人类专家审查 | 否(路线图) |

### 4.2 P0 验证实现

P0 阶段 Verifier 仅为布尔判定:

```ts
verify(rule: Rule, x: [number,number,number], label: boolean): boolean {
  return rule.call(x) === label;
}
```

**对齐代码**:即 [src/env.ts](../src/env.ts) `RuleInductionEnv.query` 中 `rule.call(x) === result` 的版本空间过滤逻辑,以及 [src/taskGenerator.ts](../src/taskGenerator.ts) `computeVersionSpace` 的一致性筛选。

**P0 不引入符号推导 / 数值仿真 / 形式化证明**。

### 4.3 P1 验证实现

- **heldout 误差**:表达式在 heldout `(x, y)` 上数值求值,计算 `normalized_MSE`。
- **symbolic equivalence**:借助 SymPy `simplify(T - target) == 0` 判断 T 是否与目标公式符号等价。

### 4.4 长期四层验证方向(仅 P2+ 演进参考)

语法 / 逻辑 / 数学 / 经验四层验证,工具方向(SymPy / Lean / 数值仿真 / constraint checker / benchmark / adversarial search)仅作为 P2+ 演进参考。**P0/P1 不引入 Lean/Isabelle**。

---

## 模块 5:Falsifier 反例搜索器

**职责**:其任务不是证明理论对,而是**找理论哪里错**。没有 Falsifier,项目会变成「LLM 胡编理论生成器」;有了 Falsifier,它才有科学味道。

### 5.1 通用流程

```
给定理论 T
  → 找出 T 最脆弱的边界条件
  → 生成测试 case
  → 检查是否违反已知事实
  → 若找到反例,理论降分或淘汰
```

### 5.2 P0 退化:active-infogain 主动查询

P0 阶段 Falsifier 退化为「主动选择最能区分候选规则的 query」,即现有 active-infogain 策略。

**对齐代码**:[src/env.ts](../src/env.ts) 的 `computeGreedyOptimalQuery`:
- 遍历 `INPUT_SPACE`(1000 个输入),对每个未查询的 `x` 计算 `computeSplitEntropy(x, vsRuleIds)`(候选规则集对该输入的分裂熵)。
- 选择分裂熵最大的 `x` 作为查询(最能区分剩余候选规则)。
- 查询结果用于过滤版本空间:保留 `rule.call(x) === result` 的规则。

**科学映射**:在物理版中,Falsifier 对应「主动选择最能区分候选理论的实验 / 观测 / 推导任务」。P0 的 active-infogain 是其最小可计算实例——通过信息增益最大化来「证伪」与真规则不一致的候选。

### 5.3 P1+ 演进方向

- P1:Falsifier 在符号表达式空间搜索使 T 预测误差最大的边界输入。
- P2+:Falsifier 主动设计实验/观测任务以区分候选物理理论。

---

## 模块 6:Theory Arena 理论排行榜(含 Anti-Goodhart 硬约束)

**职责**:维护理论种群与排行榜,使理论发现成为持续迭代过程。**一旦有评分函数,agent 会钻评分漏洞,Arena 必须加 Anti-Goodhart 硬约束**。

### 6.1 排行榜比较维度

| 维度 | 含义 | P0 可计算性 |
| ---- | ---- | ---- |
| 解释事实数 | T 能解释的已知事实数量 | P0:版本空间中存活规则数 |
| 参数数 | T 的参数/谓词数 | P0:谓词计数(原子规则=1) |
| heldout 预测准确率 | T 在 heldout 上的命中率 | P0:`heldout_accuracy(T)` |
| 硬约束违反数 | T 违反 Type C 约束数 | P0:0(P0 无 Type C) |
| 新预测价值 | T 做出的可证伪新预测价值 | P0:退化(无 novel prediction 则不进高等级榜单) |

### 6.2 迭代循环

```
选择高分理论 → 变异 → 组合 → 验证 → 淘汰 → 保留
```

- **选择**:按 `P0Score` / `P1Score` 排序取 top-k。
- **变异/组合**:由 Proposer(模块 3)执行。
- **验证**:由 Verifier(模块 4)执行。
- **淘汰**:未通过 Anti-Goodhart 硬约束或 Falsifier 反例的理论降分或移除。
- **保留**:通过所有检查的理论进入下一轮种群。

### 6.3 种群维护

Arena 维护形如 `T_001: score 82.1 / T_002: score 79.4 / ...` 的种群,可导出种群快照供审计。

### 6.4 Anti-Goodhart 6 条硬约束(不可绕过)

> 评分函数一旦上线,agent 必然钻漏洞。以下 6 条为硬约束,违反即拒绝进入榜单或降级。

1. **Heldout facts 对 Proposer 严格不可见**
   - heldout 样本集在生成后对 Proposer/Generator/Mutator 完全隔离;仅 Verifier/Falsifier 在评分时可访问。
   - 对齐:[src/taskGenerator.ts](../src/taskGenerator.ts) 中未作为 `initialObservations` 暴露的输入子集。

2. **Theory 不得直接枚举训练事实(禁止查表式理论)**
   - T 不能是 `{x → label}` 的查表结构;必须具有泛化形式(规则/表达式/方程)。
   - 检测:T 的描述长度远小于训练事实数(否则视为查表)。

3. **新预测必须可被 Verifier/Falsifier 解析(禁止不可证伪的空预测)**
   - T 必须输出可计算/可验证的预测;「可能是任何值」「取决于未知因素」等不可证伪预测直接拒绝。

4. **高分理论必须通过 adversarial test**
   - 进入高等级榜单前,T 必须通过 Falsifier 生成的对抗性测试 case;未通过则降分或淘汰。

5. **复杂度惩罚随训练事实数量增加(防止靠堆特例得高分)**
   - `rule_length_penalty` / `expression_complexity` 的权重 `w_len` 随训练事实数 `n_facts` 递增(如 `w_len ∝ log(n_facts)`)。
   - 对齐:见 [theory-score.md](./theory-score.md) §2.2。

6. **没有 novel prediction 的理论不能进入高等级榜单**
   - 防止「我不预测所以不被证伪」的钻空子理论;T 必须至少做出一个 heldout 上的可证伪预测才能进入高等级榜单。

### 6.5 Anti-Goodhart 拦截场景

- **WHEN** Proposer 提出一个无 novel prediction 的理论
- **THEN** 该理论被 Arena 拒绝进入高等级榜单
- **AND** 拦截原因(违反约束 #6)可审计,记入 `known_failures`

---

## 模块间数据流

```
KnownFacts(模块1)
   │
   ▼
Theory DSL(模块2) ──实例化──▶ Theory Proposer(模块3) ──生成候选──▶ Verifier(模块4)
   │                                                              │
   │                                                              ▼ 通过
   │                                                         Falsifier(模块5)
   │                                                              │
   │                                                              ▼ 存活
   └──────────────────────────────────────────────── Theory Arena(模块6)
                                                                  │
                                                                  ▼
                                                           TheoryScore 评分
                                                           (见 theory-score.md)
```
