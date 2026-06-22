# Active Theory Discovery: External Verifiable Search Outperforms Raw LLM Reasoning in Controlled Discovery Benchmarks

## Abstract

We investigate whether external verifiable search mechanisms can outperform raw large language model (LLM) reasoning in theory discovery tasks. We introduce two controlled benchmarks: P0 (boolean rule induction over 48 candidate rules) and P1 (symbolic expression discovery over 265 candidate formulas). In P0, algorithmic information-gain query selection achieves 100.0% accuracy [95% CI: 100%, 100%] across 6 random seeds, matching the oracle upper bound, while LLM baselines achieve only 3.6%-21.0%. In P1, active infogain (variance-based query selection) achieves the highest symbolic equivalence rate among non-oracle baselines at all noise levels (98.5% at noise=0, 96.2% at noise=0.1), while using 35-56% fewer queries than greedy search. These results provide early controlled evidence that external verifiable search mechanisms consistently outperform uninformed or LLM-based approaches in both boolean rule induction and symbolic expression discovery. We discuss limitations, including a fixed hypothesis space and single-model LLM validation, and outline a roadmap toward physics-constrained discovery benchmarks.

## 1. Introduction

A central question in AI-for-science is whether large language models can autonomously discover new scientific theories. Recent work has shown impressive capabilities in scientific reasoning, but also systematic failures in hypothesis evaluation and self-correction. We ask a more modest question: in controlled settings where the hypothesis space is known and searchable, do external verifiable search mechanisms outperform raw LLM reasoning?

We propose the **Active Theory Discovery** framework, which decomposes theory discovery into three stages:

1. **Hypothesis space definition**: enumerate or generate candidate theories
2. **Active querying**: select informative experiments to discriminate between candidates
3. **Version space narrowing**: eliminate inconsistent hypotheses based on observations

This framework is inspired by active learning, version-space learning, and the scientific method itself. The key insight is that **the search mechanism matters more than the reasoner**: a simple algorithmic information-gain strategy can systematically eliminate candidates, while even a sophisticated LLM may fail to leverage observations effectively.

We evaluate this thesis through two benchmarks:

- **P0 (Rule Induction)**: Discover a boolean rule from 48 candidates by querying input-output pairs
- **P1 (Symbolic Discovery)**: Discover a symbolic expression from 265 candidates by querying function values, with noise

Our main contributions are:

1. A controlled benchmark showing algorithmic infogain reaches oracle performance in P0 (100.0% accuracy), while LLM baselines achieve only 3.6%-21.0%
2. An extension to P1 showing active infogain maintains the highest symbolic equivalence rate under noisy conditions (96.2% at noise=0.1)
3. A failure analysis characterizing where and why baselines fail
4. A roadmap toward physics-constrained discovery benchmarks

**We do not claim that this system discovers new physical laws.** P0 and P1 are controlled benchmarks with known hypothesis spaces. They provide early evidence for the Active Theory Discovery thesis, not evidence for autonomous scientific discovery.

## 2. Related Work

**Active Learning.** Our work builds on pool-based active learning, where a learner selects the most informative examples from a pool. Standard strategies include uncertainty sampling, query-by-committee, and expected information gain. Our algorithmic infogain baseline is a direct application of maximum information gain to version-space narrowing.

**Symbolic Regression.** Symbolic regression seeks to discover closed-form expressions that fit data. Recent approaches include genetic programming (Schmidt & Lipson, 2009), neural-guided search (Petersen et al., 2019), and pre-trained transformers (Biggio et al., 2021). Our P1 benchmark differs in that we search within a fixed library rather than generating novel expressions.

**LLM-based Science.** Large language models have been applied to scientific reasoning, hypothesis generation, and experimental design. However, LLMs are known to hallucinate, overconfidently guess, and fail to systematically narrow hypothesis spaces. Our P0 results quantify these failures in a controlled setting.

**Version-Space Learning.** The version space is the set of hypotheses consistent with all observations. Mitchell (1982) showed that version-space learning converges to the correct hypothesis given sufficient observations. Our algorithmic infogain baseline is a greedy approximation to optimal version-space narrowing.

## 3. Active Theory Discovery Framework

The Active Theory Discovery framework consists of three components:

### 3.1 Hypothesis Space

A finite set H = {h1, h2, ..., hN} of candidate theories. In P0, H is a set of 48 boolean rules over three integer variables. In P1, H is a set of 265 symbolic expressions over 1-3 continuous variables.

### 3.2 Query Selection

Given the current version space V (subset of H consistent with observations so far), select an input x to query. The information gain of querying x is:

```
IG(x) = H(V) - E[H(V | f(x))]
```

where H(V) is the entropy of the version space. In P0, we use split entropy (binary outcomes). In P1, we use output variance across candidates:

```
score(x) = variance({ f(x) | f in V })
```

### 3.3 Version Space Update

After observing y = f(x) (possibly with noise), eliminate hypotheses inconsistent with the observation:

```
V' = { h in V : |h(x) - y| <= tolerance }
```

In P0 (noiseless), tolerance = 0. In P1, tolerance scales with noise level (3 * sigma for Gaussian noise at level sigma).

### 3.4 Baselines

We compare five strategies:

1. **random_search**: randomly select a hypothesis (no querying)
2. **greedy_symbolic_search**: evaluate all candidates on fixed query points, pick the best
3. **active_random**: query at random points, filter candidates
4. **active_infogain**: query at max-information-gain points, filter candidates
5. **oracle**: always return the correct hypothesis (upper bound)

## 4. P0: Rule Induction Benchmark

### 4.1 Setup

- **Hypothesis space**: 48 boolean rules over (x0, x1, x2), where xi in {0..9}
- **Rule types**: equality, even/odd, greater-than, less-than, ordering
- **Input space**: 1000 possible inputs (10^3)
- **Budget**: 6 queries per task
- **Seeds**: 6 (42, 1, 2, 3, 4, 5), 100 tasks per seed
- **LLM**: deepseek-chat via OpenAI-compatible API

### 4.2 Results

| Condition | Seeds | Accuracy | 95% CI |
|-----------|------:|--------:|-------:|
| algorithmic_infogain | 6 | 100.0% | [100.0%, 100.0%] |
| oracle_version_space | 6 | 100.0% | [100.0%, 100.0%] |
| algorithmic_random_query | 6 | 70.8% | [65.8%, 75.8%] |
| llm_scaffold | 5 | 21.0% | [16.6%, 25.6%] |
| llm_active | 5 | 13.2% | [11.6%, 15.0%] |
| llm_passive | 5 | 3.6% | [1.8%, 5.4%] |

*Evidence: `docs/p0_multiseed_report.md`*

### 4.3 Analysis

Algorithmic infogain reaches oracle performance (100.0%) across all 6 seeds, confirming that the version-space mechanism is both sufficient and efficient for this task. The average query count is 3.37 (out of 6), meaning infogain typically identifies the correct rule in just over 3 queries.

LLM baselines dramatically underperform. Even llm_scaffold, which provides structured reasoning templates and active querying capabilities, achieves only 21.0%. Llm_passive, which receives only observations without querying, achieves 3.6%. This gap is not a seed artifact — it holds across all seeds tested.

### 4.4 Failure Analysis

LLM failures fall into four categories:

- **wrong_rule** (3 cases): LLM chose wrong rule from narrowed version space
- **version_space_mismatch** (3 cases): LLM predicted rule outside remaining version space
- **overconfident_guess** (2 cases): LLM answered too early with insufficient queries
- **timeout** (1 case): Budget exhausted without final answer

*Evidence: `docs/failure_analysis.md`*

## 5. P1: Symbolic Discovery Benchmark

### 5.1 Setup

- **Hypothesis space**: 265 symbolic expressions (245 synthetic + 20 classic)
- **Categories**: linear (49), polynomial (44), rational (40), trigonometric (42), sqrt/log/abs (40), physics-style (30), classic (20)
- **Input dimension**: 1-3 continuous variables
- **Budget**: 10 queries per task
- **Noise levels**: 0, 0.01, 0.05, 0.10 (additive Gaussian)
- **Seeds**: 3 (42, 43, 44)

### 5.2 Results

| Baseline | Noise=0 SymEq | Noise=0.1 SymEq | Avg Queries |
|----------|--------------:|----------------:|------------:|
| random_search | 1.3% | 1.3% | 0 |
| greedy_symbolic_search | 98.2% | 95.5% | 10 |
| active_random | 98.2% | 92.5% | 6.7 |
| **active_infogain** | **98.5%** | **96.2%** | **6.5** |
| oracle | 100.0% | 100.0% | 0 |

*Evidence: `docs/artifacts/p1_multi_noise/summary.csv`*

### 5.3 Noise Robustness

Active infogain shows the most graceful degradation under noise:

| Baseline | SymEq drop (noise 0 -> 0.1) |
|----------|----------------------------:|
| active_infogain | -2.3pp |
| greedy_symbolic_search | -2.7pp |
| active_random | -5.7pp |

Active infogain also uses significantly fewer queries than greedy search (4.4-6.5 vs 10), achieving equal or better accuracy with 35-56% fewer observations.

### 5.4 Category-Specific Patterns

- **Linear/polynomial**: nearly perfect across all methods (even at noise=0.1)
- **Rational**: most sensitive to noise (greedy drops to 74.6% R^2 at noise=0.1)
- **Trigonometric**: active_infogain outperforms active_random by ~3pp SymEq at noise=0.1
- **Classic**: lower baseline due to formula ambiguity (e.g., F=ma and p=mv have same form)

## 6. Results

### 6.1 Main Finding

External verifiable search mechanisms (algorithmic infogain, version-space narrowing) consistently outperform raw LLM reasoning and simple heuristics across both benchmarks:

1. In P0, algorithmic infogain reaches 100.0% accuracy while LLM baselines achieve 3.6%-21.0%
2. In P1, active infogain achieves the highest symbolic equivalence rate (96.2% at noise=0.1) among non-oracle baselines
3. Active infogain degrades more gracefully under noise than random-query baselines
4. Active infogain uses 35-56% fewer queries than greedy search

### 6.2 Paired Comparisons

At noise=0.1, active_infogain vs other baselines (heldoutAccuracy):

| Comparison | Diff Mean | 95% CI | Significant |
|------------|----------:|-------:|:-----------:|
| active_infogain vs random_search | +0.883 | [0.849, 0.916] | Yes |
| active_infogain vs active_random | -0.011 | [-0.030, 0.006] | No |
| active_infogain vs greedy_symbolic_search | -0.018 | [-0.036, -0.004] | Yes |
| active_infogain vs oracle | -0.021 | [-0.038, -0.007] | Yes |

Active infogain significantly outperforms random search and is competitive with greedy search on R^2, while achieving higher symbolic equivalence rates.

*Evidence: `docs/artifacts/p1_multi_noise/report.md`*

## 7. Failure Analysis

### 7.1 P0 Failures

LLM failures in P0 are characterized by:

- Inability to systematically narrow the version space
- Overconfident guessing before sufficient observations
- Predicting rules outside the remaining version space

### 7.2 P1 Failures

| Failure Type | Count | Description |
|-------------|------:|-------------|
| wrong_expression | 1052 | random_search picking wrong formula |
| oracle_gap | 147 | significant gap from oracle (R^2 < 0.5) |
| symbolic_mismatch | 10 | numerically close but wrong formula |
| overfit_noise | 4 | fit noise rather than true function |

By baseline:

- random_search: 1052 failures
- active_random: 102 failures
- greedy_symbolic_search: 41 failures
- **active_infogain: 18 failures** (fewest among non-oracle baselines)

*Evidence: `docs/p1_failure_analysis.md`, `docs/artifacts/p1_multi_noise/failure_cases.jsonl`*

### 7.3 Failure Patterns

The most informative failure type is **symbolic_mismatch**: expressions that are numerically close (R^2 > 0.9) but symbolically different. These occur primarily with absolute-value expressions (e.g., |x-1| vs x-1 for x>1) and highlight a fundamental challenge — numerical agreement does not guarantee symbolic equivalence.

A SymPy-based symbolic verifier could address this limitation by checking structural equivalence, dimensional homogeneity, and limit behavior. However, such a verifier is future work and not part of the current results.

## 8. Limitations

This is a controlled benchmark paper with known boundary conditions. The following limitations apply:

1. **Fixed hypothesis spaces**: Both P0 and P1 assume known candidate sets. Real discovery involves open-ended search where the true hypothesis may not be in the initial set.
2. **Synthetic benchmark limitation**: P1 uses 245 synthetic formulas as primary evidence. The 20 classic physics formulas are illustrative demos only and are not treated as evidence of physical law discovery.
3. **Single-model LLM validation**: LLM baselines are tested on deepseek-chat only. Cross-model generalization is blocked by unavailable API keys (gpt-4.1-mini, Claude, Qwen, Kimi).
4. **No physical law discovery claim**: P1 matches against a known formula library. It does not discover new physical laws.
5. **No open-ended theory generation yet**: The system cannot propose hypotheses outside the pre-defined library.
6. **No SymPy verifier yet**: Symbolic equivalence is checked numerically, not structurally. A SymPy-based verifier would strengthen equivalence claims but is planned future work.
7. **No real-world anomaly-driven physics benchmark yet**: All data is synthetically generated with controlled noise. No real experimental data is used.
8. **Simplified noise model**: Only additive Gaussian noise is tested.
9. **No LLM baselines in P1**: P1 includes only algorithmic baselines. LLM baselines for symbolic discovery are deferred.
10. **Classic formula ambiguity**: Some classic formulas are numerically indistinguishable (e.g., F=ma and p=mv both compute x1*x2).

*See `paper/limitations.md` for detailed discussion.*

## 9. Toward AlphaGo-for-Science

The long-term vision of Active Theory Discovery is an "AlphaGo-for-Science" system that can autonomously discover, refine, and validate scientific theories. Our roadmap:

**P0 (completed)**: Boolean rule induction. Demonstrates that external verifiable search reaches oracle performance.

**P1 (completed)**: Symbolic expression discovery. Demonstrates that the mechanism transfers to continuous spaces and is robust to noise.

**P2 (roadmap)**: Physical law recovery. Will use physics-constrained formulas (dimensional homogeneity, conservation laws) and real experimental data. This is the next benchmark, not the current contribution.

**P3 (roadmap)**: Anomaly-driven theory refinement. Will test whether the system can detect when current theories fail and propose revisions.

**P4 (vision)**: Autonomous theory discovery. The long-term goal, but far beyond current evidence.

**We emphasize: P0 and P1 provide early controlled evidence for the Active Theory Discovery thesis. They do not demonstrate autonomous scientific discovery or new physical law discovery.**

## 10. Conclusion

We have presented two controlled benchmarks demonstrating that external verifiable search mechanisms outperform raw LLM reasoning in theory discovery tasks. In P0 (boolean rule induction), algorithmic infogain achieves 100.0% accuracy while LLM baselines achieve 3.6%-21.0%. In P1 (symbolic expression discovery), active infogain achieves the highest symbolic equivalence rate among non-oracle baselines (96.2% at noise=0.1) and degrades more gracefully under noise than alternatives.

These results support the thesis that AI scientific discovery should not rely on raw LLM reasoning alone, but on external verifiable search mechanisms that constrain, refute, and score hypotheses within a searchable space. The Active Theory Discovery framework provides a structured approach to building such systems.

However, P1 remains a symbolic-discovery benchmark, not physical theory discovery. The hypothesis space is fixed and known, the formulas are synthetic, and no real-world data is used. The transition from controlled benchmarks to genuine scientific discovery remains an open challenge.

## 11. Reproducibility

All experiments are reproducible from the public repository:

- **Repository**: https://github.com/Zhuyuyangyy/agent-rule-induction
- **Release tag**: `v0.2.0-stage2-p1`
- **Release page**: https://github.com/Zhuyuyangyy/agent-rule-induction/releases/tag/v0.2.0-stage2-p1

Reproduction commands:

```bash
npm install
npm run typecheck
npm test
npm run p1:benchmark
npm run p1:benchmark:noisy
npm run p1:benchmark:multi-noise
```

Artifact paths:

- `docs/artifacts/p1_multi_noise/report.md`
- `docs/artifacts/p1_multi_noise/summary.csv`
- `docs/artifacts/p1_multi_noise/failure_cases.jsonl`

Additional documentation:

- `docs/p0_multiseed_report.md` — P0 multi-seed results
- `docs/p1_prototype.md` — P1 prototype report
- `docs/p1_failure_analysis.md` — P1 failure analysis
- `docs/failure_analysis.md` — P0 failure analysis

Known blocker: Stage 1.2 multi-model validation is blocked by unavailable API keys (only deepseek-chat available). P1 benchmark reproduction requires no API keys.

*See `paper/reproducibility.md` for full details.*

## References

- Mitchell, T. M. (1982). Generalization as search. Artificial Intelligence, 18(2), 203-226.
- Schmidt, M., & Lipson, H. (2009). Distilling free-form natural laws from experimental data. Science, 324(5923), 81-85.
- Petersen, K. B., et al. (2019). Deep symbolic regression: Recovering mathematical expressions from data via risk-seeking policy gradients. ICLR 2021.
- Biggio, L., et al. (2021). Neural symbolic regression that scales. ICML 2021.
- Settles, B. (2009). Active learning literature survey. University of Wisconsin-Madison Computer Sciences Technical Report 1648.
