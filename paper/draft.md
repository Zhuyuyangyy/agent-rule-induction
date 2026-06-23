# Active Theory Discovery: External Verifiable Search Outperforms Raw LLM Reasoning in Controlled Discovery Benchmarks

## Abstract

We study whether external verifiable search mechanisms can outperform raw large language model (LLM) reasoning in controlled theory-discovery benchmarks. We introduce four benchmarks: P0 (boolean rule induction over 48 candidate rules), P1 (symbolic expression discovery over 265 candidate formulas under varying noise), P2 (physics-constrained law rediscovery over 29 physics formulas with dimensional annotations), and P3 (anomaly-driven theory refinement over 8 planted-anomaly scenarios). In P0, algorithmic information-gain query selection achieves 100.0% accuracy [95% CI: 100%, 100%] across 6 seeds, matching the oracle upper bound, while LLM baselines achieve only 3.6%--21.0%. In P1, active infogain achieves the highest symbolic equivalence rate among non-oracle baselines at all noise levels (98.5% at noise=0, 96.2% at noise=0.1). In P2, verifier constraints reject 87.5% of invalid candidates, and all non-random baselines achieve 100% SymEq at noise=0. In P3, active methods recover 75-100% of planted corrections while the verifier eliminates false positives. We additionally prototype P4 (open-ended candidate generation with simulated LLM proposals), showing that template-based candidate generation achieves ~88% parse success but only ~23% correction recovery, compared to 100% for library-based search. These results provide controlled evidence that external verifiable search mechanisms outperform uninformed or LLM-based approaches across increasingly complex discovery settings. We discuss limitations including fixed hypothesis spaces, simplified dimensional models, and the absence of physical law discovery. This paper does not claim discovery of new physical laws.

## 1. Introduction

A central ambition in AI-for-science is to build systems that can autonomously discover, refine, and validate scientific theories. Recent advances in large language models (LLMs) have demonstrated impressive scientific reasoning capabilities, yet these systems also exhibit systematic failures: they hallucinate, overconfidently guess, and fail to systematically narrow hypothesis spaces.

We ask a more focused question: **in controlled settings where the hypothesis space is known and searchable, do external verifiable search mechanisms outperform raw LLM reasoning?** This question matters because the answer determines whether AI scientific discovery should rely primarily on LLM reasoning or on external scaffolding that enforces verifiable search.

We propose the **Active Theory Discovery** framework, which decomposes theory discovery into three stages:

1. **Hypothesis space definition**: enumerate or generate candidate theories
2. **Active querying**: select informative experiments to discriminate between candidates
3. **Version space narrowing**: eliminate inconsistent hypotheses based on observations

The key insight is that **the search mechanism matters more than the reasoner**: a simple algorithmic information-gain strategy can systematically eliminate candidates, while even a sophisticated LLM may fail to leverage observations effectively.

We evaluate this thesis through two controlled benchmarks:

- **P0 (Rule Induction)**: Discover a boolean rule from 48 candidates by querying input-output pairs
- **P1 (Symbolic Discovery)**: Discover a symbolic expression from 265 candidates by querying function values under noise

**We do not claim that this system discovers new physical laws.** P0 and P1 are controlled benchmarks with known hypothesis spaces. They provide early evidence for the Active Theory Discovery thesis, not evidence for autonomous scientific discovery.

## 2. Contributions

We make the following contributions:

1. **A controlled Active Theory Discovery framing.** We formalize theory discovery as version-space narrowing with active query selection, providing a structured alternative to raw LLM reasoning for scientific discovery tasks.

2. **P0 rule induction benchmark with multi-seed evidence.** We show that algorithmic information-gain search reaches oracle-level performance (100.0% accuracy) across 6 seeds, while LLM baselines achieve only 3.6%--21.0%.

3. **P1 symbolic discovery benchmark with multi-noise evidence.** We extend the mechanism from boolean rule induction to symbolic expression discovery over 265 formulas, showing that active infogain maintains the highest symbolic equivalence rate under noisy conditions (96.2% at noise=0.1).

4. **Evidence that active_infogain improves symbolic-equivalence robustness under noisy conditions.** Active infogain degrades more gracefully under noise (-2.3pp SymEq drop from noise=0 to 0.1) compared to active_random (-5.7pp) and greedy_symbolic_search (-2.7pp), while using 35--56% fewer queries.

5. **A reproducible artifact release with explicit claim boundaries and limitations.** All benchmarks, results, and analysis are publicly available with documented claim boundaries, forbidden claims, and known blockers.

These contributions provide early controlled evidence for the usefulness of external verifiable search in theory-discovery settings. They do not constitute physical theory discovery.

## 3. Background and Motivation

### Active Learning

Our work builds on pool-based active learning, where a learner selects the most informative examples from a pool. Standard strategies include uncertainty sampling, query-by-committee, and expected information gain (Settles, 2009). Our algorithmic infogain baseline is a direct application of maximum information gain to version-space narrowing.

### Symbolic Regression

Symbolic regression seeks to discover closed-form expressions that fit data. Recent approaches include genetic programming (Schmidt & Lipson, 2009), neural-guided search (Petersen et al., 2019), and pre-trained transformers (Biggio et al., 2021). Our P1 benchmark differs in that we search within a fixed library rather than generating novel expressions.

### LLM-based Science

Large language models have been applied to scientific reasoning, hypothesis generation, and experimental design. However, LLMs are known to hallucinate, overconfidently guess, and fail to systematically narrow hypothesis spaces. Our P0 results quantify these failures in a controlled setting.

### Version-Space Learning

The version space is the set of hypotheses consistent with all observations. Mitchell (1982) showed that version-space learning converges to the correct hypothesis given sufficient observations. Our algorithmic infogain baseline is a greedy approximation to optimal version-space narrowing.

## 4. Active Theory Discovery Framework

We formalize the Active Theory Discovery framework as follows.

### Definitions

- **Hypothesis space** H = {T_1, T_2, ..., T_N}: a finite set of candidate theories
- **Candidate set** C ⊆ H: theories consistent with observations so far
- **Query** x: an input to the target function
- **Observation** y = f(x) + ε: the target's response, possibly with noise ε
- **Active query policy** π(x | C): selects the next query given the current candidate set
- **Scoring function** S(T): evaluates the quality of a candidate theory

### Information-Gain Query Selection

The core mechanism selects queries that maximize information gain about the identity of the target theory. In P0 (discrete outputs), we use split entropy:

```
score(x) = H(C) - E[H(C | f(x))]
```

In P1 (continuous outputs), we use output variance across candidates:

```
score(x) = Var({ f_T(x) | T ∈ C })
```

This variance-based proxy selects the query point where candidate theories disagree most, which is the continuous analog of maximum information gain.

### Version Space Update

After observing y = f(x) (possibly with noise), we eliminate inconsistent hypotheses:

```
C' = { T ∈ C : |f_T(x) - y| ≤ τ }
```

In P0 (noiseless), τ = 0. In P1, τ scales with noise level (τ = 3σ for Gaussian noise at level σ).

### Long-Term Theory Score (Future Framing)

We envision a broader theory scoring function that goes beyond prediction accuracy:

```
S(T) = α · A_pred(T) + β · ΔC(T) + γ · R_anom(T) + δ · I_consist(T) + ε · I_exp(T) - λ · K(T)
```

where A_pred is predictive accuracy, ΔC is complexity reduction, R_anom is anomaly coverage, I_consist is internal consistency, I_exp is experimental support, and K is complexity penalty.

**Important**: P0/P1 currently instantiate only parts of this broader score (primarily A_pred and ΔC). SymPy-based consistency and dimensional checks (I_consist) are future work. Current results should not be interpreted as open-ended physics discovery.

## 5. P0: Rule Induction Benchmark

### Task Definition

The P0 benchmark tests whether an agent can identify a boolean rule from 48 candidates by querying input-output pairs. Each rule maps (x0, x1, x2), where xi ∈ {0..9}, to a boolean output. Rule types include equality, even/odd, greater-than, less-than, and ordering constraints.

### Version-Space / Infogain Mechanism

The algorithmic infogain baseline maintains a version space (set of rules consistent with observations) and selects queries that maximize split entropy — the query that most evenly divides the remaining candidates into true/false groups. This greedy strategy systematically eliminates candidates.

### Baselines

| Condition | Description |
|-----------|-------------|
| algorithmic_infogain | Max-entropy query selection, version-space narrowing |
| oracle_version_space | Always returns correct rule (upper bound) |
| algorithmic_random_query | Random query selection, version-space narrowing |
| llm_scaffold | LLM with structured reasoning + active querying |
| llm_active | LLM with free-form active querying |
| llm_passive | LLM with observations only, no querying |

### Results

| Condition | Seeds | Accuracy | 95% CI |
|-----------|------:|--------:|-------:|
| algorithmic_infogain | 6 | 100.0% | [100.0%, 100.0%] |
| oracle_version_space | 6 | 100.0% | [100.0%, 100.0%] |
| algorithmic_random_query | 6 | 70.8% | [65.8%, 75.8%] |
| llm_scaffold | 5 | 21.0% | [16.6%, 25.6%] |
| llm_active | 5 | 13.2% | [11.6%, 15.0%] |
| llm_passive | 5 | 3.6% | [1.8%, 5.4%] |

*Evidence: `docs/p0_multiseed_report.md`*

**Claim boundary**: In P0, algorithmic information-gain search reaches oracle-level performance across the evaluated seeds, while raw LLM baselines underperform. This result holds within the controlled benchmark setting and should not be overgeneralized beyond it.

## 6. P1: Symbolic Discovery Benchmark

### Task Definition

The P1 benchmark tests whether an agent can identify a symbolic expression from 265 candidates by querying function values. The hypothesis space contains 245 synthetic formulas and 20 classic physics formulas across 7 categories: linear (49), polynomial (44), rational (40), trigonometric (42), sqrt/log/abs (40), physics-style (30), and classic (20).

### Noise Levels

We evaluate under four noise levels: σ ∈ {0, 0.01, 0.05, 0.10} (additive Gaussian noise).

### Baselines

| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a formula (no querying) |
| greedy_symbolic_search | Evaluate all candidates on fixed query points, pick lowest error |
| active_random | Query at random points, filter candidates by error |
| active_infogain | Query at max-variance points, filter candidates by error |
| oracle | Always return correct formula (upper bound) |

### active_infogain Definition

1. Maintain candidate expression set C (initially all 265 formulas)
2. Sample candidate query points x from the input space
3. For each x, compute score(x) = Var({ f_T(x) | T ∈ C })
4. Select the query point with maximum variance
5. Observe the target's response y at that point
6. Filter candidates: remove those where |f_T(x) - y| > τ
7. Repeat until budget (10 queries) is exhausted
8. Return the candidate with lowest total error

### Results

| Baseline | Noise=0 SymEq | Noise=0.1 SymEq | Avg Queries |
|----------|--------------:|----------------:|------------:|
| random_search | 1.3% | 1.3% | 0 |
| greedy_symbolic_search | 98.2% | 95.5% | 10 |
| active_random | 98.2% | 92.5% | 6.7 |
| **active_infogain** | **98.5%** | **96.2%** | **6.5** |
| oracle | 100.0% | 100.0% | 0 |

*Evidence: `docs/artifacts/p1_multi_noise/summary.csv`, `docs/artifacts/p1_multi_noise/report.md`*

### Noise Robustness

| Baseline | SymEq drop (noise 0 → 0.1) |
|----------|----------------------------:|
| active_infogain | -2.3pp |
| greedy_symbolic_search | -2.7pp |
| active_random | -5.7pp |

*Evidence: `docs/p1_prototype.md`*

**Claim boundary**: In P1, active_infogain improves symbolic-equivalence robustness under noisy conditions, while greedy methods may retain slightly higher numerical fit in some settings. P1 does not discover physical laws.

## 7. Results

### Finding 1: P0 supports external verifiable active search over raw LLM reasoning

In the P0 rule induction benchmark, algorithmic infogain achieves 100.0% accuracy [100%, 100%] across 6 seeds, matching the oracle upper bound. LLM baselines achieve only 3.6%--21.0%, even with structured reasoning templates (llm_scaffold). This gap is structural, not a seed artifact.

*Evidence: `docs/p0_multiseed_report.md`*

### Finding 2: P1 shows the mechanism transfers from discrete rule induction to symbolic expression discovery

Active infogain achieves 98.5% symbolic equivalence rate at noise=0 in the P1 benchmark, demonstrating that the version-space narrowing mechanism transfers from boolean rule induction (discrete outputs) to symbolic expression discovery (continuous outputs with variance-based query selection).

*Evidence: `docs/artifacts/p1_multi_noise/summary.csv`*

### Finding 3: Under high noise, active_infogain improves symbolic-equivalence robustness

At noise=0.1, active_infogain achieves 96.2% SymEq vs. greedy 95.5% and active_random 92.5%. The degradation from noise=0 to noise=0.1 is most graceful for active_infogain (-2.3pp) compared to active_random (-5.7pp). Active infogain also uses 35--56% fewer queries than greedy search.

*Evidence: `docs/artifacts/p1_multi_noise/report.md`*

### Finding 4: Failure analysis reveals remaining brittleness

Failure cases constrain the strength of our claims. The most common failure types are wrong_expression (1052 cases, almost all from random_search), oracle_gap (147 cases), and symbolic_mismatch (10 cases). Active_infogain has the fewest failures (18) among non-oracle baselines, but symbolic_mismatch cases — where numerical fit is high but the wrong formula is selected — highlight the need for structural (not just numerical) equivalence checking.

*Evidence: `docs/p1_failure_analysis.md`, `docs/artifacts/p1_multi_noise/failure_cases.jsonl`*

## 8. Failure Analysis

### Failure Categories

| Failure Type | Count | Description |
|-------------|------:|-------------|
| wrong_expression | 1052 | Baseline selects wrong formula (predominantly random_search) |
| oracle_gap | 147 | Significant gap from oracle (R² < 0.5) |
| symbolic_mismatch | 10 | Numerically close (R² > 0.9) but symbolically different |
| overfit_noise | 4 | Fits noise patterns rather than true function |
| high_complexity | 0 | Predicted expression overly complex (not observed in current data) |
| invalid_numeric_output | 0 | Expression produces NaN/Inf (not observed in current data) |
| query_not_informative | 0 | Queries fail to reduce candidate set (not observed in current data) |

Note: high_complexity, invalid_numeric_output, and query_not_informative are defined failure categories that were not heavily represented in the current artifact. We include them for completeness and because they may emerge in future benchmarks with larger hypothesis spaces.

### Why Failure Analysis Matters

Failure analysis serves three purposes in this work:

1. **Claim constraining**: Failures define the boundary of what the benchmarks can support. Symbolic_mismatch cases, for example, show that numerical agreement does not guarantee symbolic equivalence — a fundamental limitation of the current evaluation.

2. **Mechanism diagnosis**: Failures reveal where the search mechanism breaks down. Oracle_gap failures in active_random show that random query selection is insufficient for discriminating between similar formulas.

3. **Future verifier motivation**: The existence of symbolic_mismatch failures motivates the need for a SymPy-based structural verifier that can check symbolic equivalence, dimensional homogeneity, and limit behavior. A SymPy verifier has been implemented (Stage 2.5-B) with symbolic equivalence and dimensional homogeneity checks, and a TypeScript adapter (Stage 2.5-C) provides IPC to the Python sidecar. The verifier is **not part of the reported P0/P1 benchmark results** (P0/P1 use numerical scoring only), but it is integrated into P2/P3/P4 benchmarks where it rejects invalid candidates based on structural and dimensional constraints.

*Evidence: `docs/p1_failure_analysis.md`*

## 9. Reproducibility

All experiments are reproducible from the public repository:

- **Repository**: https://github.com/Zhuyuyangyy/agent-rule-induction
- **Final release tag**: `v1.0.0-active-theory-discovery`
- **Release page**: https://github.com/Zhuyuyangyy/agent-rule-induction/releases/tag/v1.0.0-active-theory-discovery

### Reproduction Commands

```bash
npm install
npm run typecheck
npm test
npm run p1:benchmark:multi-noise
npm run p2:benchmark
npm run p3:benchmark
npm run p4:benchmark
```

**Important**: All benchmarks are algorithmic and require no API keys.

### Artifact Paths

- `docs/artifacts/p1_multi_noise/` — P1 multi-noise results
- `docs/artifacts/p2_physics_constrained/` — P2 physics-constrained results
- `docs/artifacts/p3_anomaly_refinement/` — P3 anomaly-driven results

### Known Blockers

Stage 1.2 multi-model validation is blocked by unavailable API keys (only deepseek-chat available). Cross-model generalization requires gpt-4.1-mini, Claude, Qwen, or Kimi keys.

*See `paper/reproducibility.md` for full details.*

## 10. Limitations

This is a controlled benchmark paper with explicit boundary conditions. The following limitations apply:

1. **Fixed hypothesis spaces**: Both P0 and P1 assume known candidate sets. Real discovery involves open-ended search where the true hypothesis may not be in the initial set.

2. **Synthetic / controlled benchmark setting**: P1 uses 245 synthetic formulas as primary evidence. The 20 classic physics formulas are illustrative demos only and are not treated as evidence of physical law discovery.

3. **No open-ended theory generation yet**: The system cannot propose hypotheses outside the pre-defined library. In real science, hypothesis generation is a critical creative step.

4. **No physical law discovery claim**: P1 matches against a known formula library. It does not discover new physical laws.

5. **Single-model LLM validation**: LLM baselines are tested on deepseek-chat only. Cross-model generalization is blocked by unavailable API keys (gpt-4.1-mini, Claude, Qwen, Kimi).

6. **SymPy verifier is integrated in P2/P3/P4, not in P0/P1**: A SymPy verifier has been implemented (symbolic equivalence + dimensional homogeneity checks, with a TypeScript IPC adapter) and is integrated into P2/P3/P4 benchmarks where it rejects invalid candidates. It is not part of the P0/P1 benchmark results, which use numerical scoring only.

7. **No dimensional analysis in P1 results**: The P1 benchmark does not use dimensional homogeneity checks. Dimensional analysis is integrated into P2 (physics-constrained benchmark) where it is appropriate, not in P1 (general symbolic discovery).

8. **No anomaly-driven physics benchmark with real data**: P3 uses synthetic anomaly data, not real experimental data.

9. **Simplified L,M,T dimension model**: P2 uses a simplified dimension system that cannot capture electromagnetism or thermodynamic dimensions correctly. 6 out of 29 P2 formulas fail the dimensional validity check.

10. **P4 uses simulated LLM proposals**: The P4 benchmark uses template-based candidate generation, not real LLM API calls. Real LLM behavior may differ significantly.

11. **Results are early evidence, not proof of a complete AI scientist**: The transition from controlled benchmarks to genuine scientific discovery remains an open challenge.

*See `paper/limitations.md` for detailed discussion.*

## 11. Toward AlphaGo-for-Science

The long-term vision of Active Theory Discovery is an "AlphaGo-for-Science" system that can autonomously discover, refine, and validate scientific theories. Our staged roadmap:

**P0 (completed)**: Boolean rule induction. Demonstrates that external verifiable search reaches oracle performance in a discrete setting.

**P1 (completed)**: Symbolic expression discovery. Demonstrates that the mechanism transfers to continuous spaces and is robust to noise.

**P2 (completed)**: Physics-constrained law rediscovery. Uses 29 physics formulas with dimensional annotations. Verifier constraints (output dimension matching) reject 87.5% of invalid candidates. All non-random baselines achieve 100% SymEq at noise=0. This is controlled law rediscovery, not new physics discovery. Known limitation: simplified L,M,T dimension model fails for electromagnetism and thermodynamic formulas.

**P3 (completed)**: Anomaly-driven theory refinement. 8 scenarios (6 planted anomalies + 2 null), 7 correction families, 7 baselines. Greedy/active methods recover 75-100% of planted corrections. Verifier eliminates false positives. Controlled sandbox inspired by historical anomalies, NOT real physics discovery.

**P4 (completed, prototype)**: Open-ended active theory search. Template-based simulated LLM candidate generation with 15 templates. Parse success ~88%, hallucination rate ~11-14%. LLM-based approaches achieve ~23% correction recovery vs. 100% for library-based search. LLMs are proposal mechanisms, not final judges. External verification remains necessary.

**We emphasize: P0 through P4 provide controlled evidence for the Active Theory Discovery thesis. They do not demonstrate autonomous scientific discovery or new physical law discovery.**

## 12. Conclusion

We have presented four controlled benchmarks demonstrating that external verifiable search mechanisms outperform raw LLM reasoning in theory discovery tasks. In P0 (boolean rule induction), algorithmic infogain achieves 100.0% accuracy while LLM baselines achieve 3.6%--21.0%. In P1 (symbolic expression discovery), active infogain achieves the highest symbolic equivalence rate among non-oracle baselines (96.2% at noise=0.1) and degrades more gracefully under noise than alternatives. In P2 (physics-constrained law rediscovery), verifier constraints reject 87.5% of invalid candidates while maintaining 100% SymEq at noise=0. In P3 (anomaly-driven refinement), active methods recover 75-100% of planted corrections while the verifier eliminates false positives. In P4 (open-ended search), template-based LLM candidate generation achieves ~88% parse success but only ~23% correction recovery, highlighting the gap between proposal and verification.

These results support the thesis that AI scientific discovery should not rely on raw LLM reasoning alone, but on external verifiable search mechanisms that constrain, refute, and score hypotheses within a searchable space. The Active Theory Discovery framework provides a structured approach to building such systems.

However, all benchmarks remain controlled settings with fixed hypothesis spaces. P1 is a symbolic-discovery benchmark, not physical theory discovery. P2 is controlled law rediscovery, not new physics. P3 is a synthetic sandbox, not real anomaly resolution. P4 uses simulated LLM proposals, not real LLM outputs. The transition from controlled benchmarks to genuine scientific discovery remains an open challenge.

## References

- Mitchell, T. M. (1982). Generalization as search. *Artificial Intelligence*, 18(2), 203--226.
- Schmidt, M., & Lipson, H. (2009). Distilling free-form natural laws from experimental data. *Science*, 324(5923), 81--85.
- Petersen, K. B., et al. (2019). Deep symbolic regression: Recovering mathematical expressions from data via risk-seeking policy gradients. *ICLR 2021*.
- Biggio, L., et al. (2021). Neural symbolic regression that scales. *ICML 2021*.
- Settles, B. (2009). Active learning literature survey. University of Wisconsin-Madison Computer Sciences Technical Report 1648.
