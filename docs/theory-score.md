# TheoryScore 分阶段可计算评分规范

> 本文档定义「主动理论发现(Active Theory Discovery)」框架的目标函数 `TheoryScore`。
> 当前交付范围:P0/P1 可计算退化形式。完整 7 项公式仅作为长期愿景,**P0/P1 阶段禁止使用**。
> 对齐代码:[src/metrics.ts](../src/metrics.ts)、[src/rules.ts](../src/rules.ts)、[src/runActive.ts](../src/runActive.ts)、[src/env.ts](../src/env.ts)。

---

## 1. 长期愿景公式(仅参考,P2+ 才逐步启用)

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

### 1.1 各维度含义

| 维度 | 含义 | 直觉 |
| ---- | ---- | ---- |
| `Consistency(T, KnownFacts)` | 理论 T 与已知事实库的一致程度 | T 不能解释错已知事实 |
| `Prediction(T, HeldoutFacts)` | T 对留出事实(heldout)的预测命中 | T 要能预测没见过的事实,而非只拟合训练集 |
| `Compression(T)` | T 对已知事实的压缩率 | 好理论用更短描述解释更多事实(MDL 倾向) |
| `Unification(T)` | T 是否统一了原本分散的多条规律 | 类似牛顿统一天体与地面力学 |
| `Falsifiability(T)` | T 的可证伪程度 | T 必须做出可被反例推翻的预测 |
| `Complexity(T)` | T 的描述复杂度(参数/节点/长度) | 越复杂越容易过拟合,需惩罚 |
| `Contradiction(T)` | T 内部或与硬约束的矛盾数 | 自相矛盾或违反守恒律的理论直接扣分 |

`α, β, γ, δ, ε, λ, μ` 为权重系数,其取值本身需要经验校准。

### 1.2 为什么 P0/P1 不能直接用完整 7 项公式

完整公式看起来「科学」,但在 P0/P1 阶段直接套用会退化为**「看起来科学的主观评分」**,原因有三:

1. **多数维度在 P0/P1 不可计算**。`Unification`、`Falsifiability`、`Compression` 在布尔规则 / 符号表达式阶段没有客观可结算的算法;若强行打分,只能靠 LLM 或人工主观赋值,引入不可复现的噪声。
2. **权重系数无校准依据**。`α..μ` 的取值需要大量跨理论对比数据才能校准;P0 只有 48 条规则、P1 只有合成公式,样本不足以支撑可信权重,任意权重都会污染结论。
3. **会掩盖真实信号**。P0 的核心科学问题是「主动查询是否比被动观察更快发现规则」,这只需要 `heldout_accuracy`、`query_cost`、`complexity` 三个可计算量即可回答;引入 7 项只会让结论不可解释。

因此 P0/P1 **必须使用下文的退化可计算形式**,把「不可计算的主观维度」留到 P2+ 在有真实物理事实和形式化工具时再逐步引入。

---

## 2. P0 可计算评分(当前交付)

```
P0Score(T) =
    heldout_accuracy(T)            // 规则 T 在 heldout 样本上的命中率
  - rule_length_penalty(T)         // 规则描述长度惩罚(防止堆特例)
  - query_cost_penalty(T)          // 查询次数 / token 惩罚
```

### 2.1 heldout_accuracy(T)

**定义**:规则 T 在留出样本集 `Heldout` 上的命中率。

```
heldout_accuracy(T) = |{ x ∈ Heldout : T.call(x) == trueLabel(x) }| / |Heldout|
```

**算法实现方向**:
- `Heldout` 由隐藏规则 `trueRule` 生成、对 Proposer 严格不可见(对应 [src/taskGenerator.ts](../src/taskGenerator.ts) 中未作为 `initialObservations` 暴露的输入子集)。
- `T.call(x)` 即 [src/rules.ts](../src/rules.ts) 中 `Rule.call` 的布尔返回值。
- 当 `T` 恰好等于 `trueRule` 时 `heldout_accuracy = 1.0`;否则为 T 与 trueRule 在 heldout 上的逐点一致率(连续值,提供比 0/1 更细的梯度)。

### 2.2 rule_length_penalty(T)

**定义**:规则 T 的描述长度惩罚,防止「堆特例」式理论靠枚举训练事实得高分。

```
rule_length_penalty(T) = w_len · length(T)
```

**算法实现方向**:
- P0 当前 `RULE_SPACE` 中每条规则为原子单谓词(`EQ_x0_4`、`EVEN_x1`、`ORDER_x0_x1` 等),`length(T)` 可取 `naturalLanguage().length` 或结构化谓词计数(常数 1),此时惩罚近似常数。
- 该项在 P0 主要为「占位 + 防御性约束」:一旦 Proposer 生成复合规则(如 `EVEN_x0 AND GT_x1_4`),`length` 随谓词数线性增长,直接抑制堆特例。
- 与 Anti-Goodhart 约束 #5(复杂度惩罚随训练事实数量增加)联动:当训练事实数增大时 `w_len` 上调。

### 2.3 query_cost_penalty(T)

**定义**:发现 T 所消耗的查询与 token 代价惩罚。

```
query_cost_penalty(T) = w_q · queriesMade(T) + w_tok · totalTokens(T)
```

**算法实现方向**:
- `queriesMade(T)` ← [src/env.ts](../src/env.ts) `RuleInductionEnv.queriesMade`(已去重计数,见 `is_duplicate` 处理)。
- `totalTokens(T)` ← [src/runActive.ts](../src/runActive.ts) `RunResult.conversation[].usage.total_tokens` 累加。
- 权重 `w_q`、`w_tok` 在 P0 benchmark 中固定为常数并写入 manifest,保证可复现。

---

## 3. P1 可计算评分(下一阶段交付)

```
P1Score(T) =
    heldout_prediction_accuracy(T)   // 表达式 T 在 heldout 数据上的预测准确率
  + symbolic_equivalence_score(T)    // T 是否符号等价于目标公式
  - expression_complexity(T)         // 表达式复杂度(节点数 / 深度)
  - query_cost(T)                    // 查询代价(同 P0 的 query_cost_penalty)
```

### 3.1 各项含义

| 项 | 含义 | 实现方向 |
| ---- | ---- | ---- |
| `heldout_prediction_accuracy(T)` | 表达式 T 在 heldout `(x, y)` 上的预测误差转准确率(如 `1 - normalized_MSE`) | 在合成公式 heldout 集上数值求值比对 |
| `symbolic_equivalence_score(T)` | T 是否与目标公式符号等价(如 `2x+1` ≡ `1+2x`) | 借助 SymPy `simplify(T - target) == 0` 或自研简化器,二值/连续 |
| `expression_complexity(T)` | T 的 AST 节点数 / 深度 | 直接对 DSL AST 计数 |
| `query_cost(T)` | 同 P0 的 `query_cost_penalty` | 复用 `queriesMade + totalTokens` |

P1 仍**不引入** `Consistency`(物理事实)、`Unification`、`Falsifiability` 的完整形式;`symbolic_equivalence_score` 是 P1 对「理论是否抓到本质」的最小可计算代理。

---

## 4. 评分附带输出(Score + Confidence + EvidenceLevel + known_failures)

**硬性要求**:每次评分必须同时输出以下四元组,缺一不可。

| 字段 | 类型 | 含义 |
| ---- | ---- | ---- |
| `score` | number | 当前阶段的 `P0Score` / `P1Score` 数值 |
| `confidence` | number ∈ [0,1] | 评分置信度,基于 heldout 样本量与方差估计 |
| `evidence_level` | string | 证据等级标签,标注该得分来自哪个阶段/何种基准 |
| `known_failures` | string[] | 已知失败案例(规则/输入模式),可审计 |

### 4.1 JSON 示例

```json
{
  "score": 82.1,
  "confidence": 0.74,
  "evidence_level": "P0_rule_benchmark",
  "known_failures": ["fails on EVEN rules with v=6"]
}
```

### 4.2 不同阶段得分不可直接比较

**关键约束**:P0 规则得分 95 与 P2 物理理论得分 80 **不可直接比较**,因为:

- 评分公式不同(P0 三项 vs P2 多项);
- 证据强度不同(封闭规则空间 vs 真实物理数据);
- 可证伪性不同。

必须通过 `evidence_level` 标注来源,例如:

| evidence_level 取值 | 含义 |
| ---- | ---- |
| `P0_rule_benchmark` | P0 封闭规则归纳基准 |
| `P1_symbolic_benchmark` | P1 符号表达式发现基准 |
| `P2_physics_recovery` | P2 物理定律恢复(路线图) |

跨阶段比较时,只能比较「同一 evidence_level 内的相对排序」,不能跨 level 比绝对分数。

---

## 5. 与现有 metrics 的对齐

P0 Score 的三项与 [src/metrics.ts](../src/metrics.ts) 现有指标对齐关系如下:

| P0 Score 项 | 现有 metrics.ts 指标 | 对齐说明 |
| ---- | ---- | ---- |
| `heldout_accuracy(T)` | `Metrics.accuracy`(`correct/total`) | 现有 `accuracy` 是规则 ID 精确匹配的 0/1 量;`heldout_accuracy(T)` 是其连续细化版(逐点一致率)。`Metrics.partialCreditRate`(`correct OR finalVersionSpaceSize===1`)是朝该方向的一步粗代理。P0 Score 采用连续 heldout 命中率以提供更细梯度。 |
| `rule_length_penalty(T)` | (暂无直接对应) | 现有 `RULE_SPACE` 规则为原子谓词,长度近似常数;P0 Score 显式引入该项作为防御性约束,为 Proposer 生成复合规则时预留。实现取 `Rule.naturalLanguage().length` 或谓词计数。 |
| `query_cost_penalty(T)` | `Metrics.avgQueries` + `RunResult.conversation[].usage.total_tokens` | `avgQueries` 提供 query 计数;token 来自 `conversation` 中每条 assistant 消息的 `usage` 字段。现有 `Metrics.queryEfficiency = accuracy / avgQueries` 是效率比;P0 Score 改用线性惩罚 `w_q·queries + w_tok·tokens`,更易与其他项加权求和。 |

**辅助对齐指标**(P0 Score 不直接使用,但用于诊断):
- `Metrics.avgFinalVS` / `avgVSReduction`:反映版本空间压缩程度,用于解释为何某理论得分高(查询效率高)。
- `Metrics.duplicateQueryRate`:反映查询浪费,高重复率应导致 `query_cost_penalty` 实质上升(因有效查询少却消耗了 budget)。
- `Metrics.earlyStopRate`:反映提前收敛,与低 `query_cost` 相关。

**结论**:P0 Score 不需要新增数据采集字段,现有 `RunResult`(`correct`、`queriesMade`、`conversation[].usage`、`queryResults`)与 `Metrics` 已提供全部所需原始量;P0 Score 是对这些原始量的**加权组合**,而非新指标。

---

## 6. 明确禁止

**P0/P1 阶段禁止使用完整 7 项愿景公式**(`Consistency + Prediction + Compression + Unification + Falsifiability - Complexity - Contradiction`)。

理由见 §1.2:在 P0/P1 阶段,`Unification`、`Falsifiability`、`Compression`、`Contradiction`(物理意义)无可计算实现,强行使用会引入主观评分,破坏 benchmark 的可复现性与结论可信度。

- P0 **只能**使用 `heldout_accuracy - rule_length_penalty - query_cost_penalty`。
- P1 **只能**使用 `heldout_prediction_accuracy + symbolic_equivalence_score - expression_complexity - query_cost`。
- 完整 7 项公式自 P2 起、在具备真实物理事实库与形式化验证工具后,才逐步启用,且每引入一项必须给出可计算算法。
