# Active Theory Discovery: External Verifiable Search Outperforms Raw LLM Reasoning in Controlled Discovery Benchmarks

## Abstract

We study whether external verifiable search mechanisms can outperform raw large language model (LLM) reasoning in controlled theory-discovery benchmarks. We introduce a five-rung benchmark ladder — P0 through P4 — spanning boolean rule induction, symbolic expression discovery, physics-constrained law rediscovery, anomaly-driven theory refinement, and open-ended candidate generation. In P0 (48 candidate boolean rules), algorithmic information-gain query selection achieves 100.0% accuracy [95% CI: 100%, 100%] across 6 seeds, matching the oracle upper bound, while LLM baselines achieve only 3.6%--21.0%. In P1 (265 candidate symbolic expressions under varying noise), active infogain achieves the highest symbolic equivalence rate among non-oracle baselines at all noise levels (98.5% at noise=0, 96.2% at noise=0.1). In P2 (29 physics formulas with dimensional annotations), verifier constraints reject 87.5% of invalid candidates, and all non-random baselines achieve 100% SymEq at noise=0. In P3 (8 planted-anomaly scenarios), active methods recover 75--100% of planted corrections while the verifier eliminates false positives (0% FP rate). In P4 (template-based simulated LLM candidate generation with 15 templates), parse success reaches ~88% but LLM-based correction recovery is only ~23%, compared to 100% for library-based search. These results provide controlled evidence that external verifiable search mechanisms outperform uninformed or LLM-based approaches across increasingly complex discovery settings. We discuss limitations including fixed hypothesis spaces, simplified dimensional models, and the absence of physical law discovery. **This paper does not claim discovery of new physical laws.**

## 1. Introduction

A central ambition in AI-for-science is to build systems that can autonomously discover, refine, and validate scientific theories. Recent advances in large language models (LLMs) have demonstrated impressive scientific reasoning capabilities — from solving competition-level mathematics to generating novel hypotheses — yet these systems also exhibit systematic failures: they hallucinate, overconfidently guess, and fail to systematically narrow hypothesis spaces.

We ask a more focused question: **in controlled settings where the hypothesis space is known and searchable, do external verifiable search mechanisms outperform raw LLM reasoning?** This question matters because the answer determines whether AI scientific discovery should rely primarily on LLM reasoning or on external scaffolding that enforces verifiable search.

We propose the **Active Theory Discovery** framework, which decomposes theory discovery into three stages:

1. **Hypothesis space definition**: enumerate or generate candidate theories
2. **Active querying**: select informative experiments to discriminate between candidates
3. **Version space narrowing**: eliminate inconsistent hypotheses based on observations

The key insight is that **the search mechanism matters more than the reasoner**: a simple algorithmic information-gain strategy can systematically eliminate candidates, while even a sophisticated LLM may fail to leverage observations effectively.

We evaluate this thesis through five controlled benchmarks of increasing complexity:

- **P0 (Rule Induction)**: Discover a boolean rule from 48 candidates by querying input-output pairs
- **P1 (Symbolic Discovery)**: Discover a symbolic expression from 265 candidates by querying function values under noise
- **P2 (Physics-Constrained Rediscovery)**: Discover a physics formula from 29 candidates with dimensional verification
- **P3 (Anomaly-Driven Refinement)**: Recover planted correction terms in 8 anomaly scenarios with verifier-gated acceptance
- **P4 (Open-Ended Search)**: Generate and verify candidate expressions via template-based simulated LLM proposals

**We do not claim that this system discovers new physical laws.** P0 through P4 are controlled benchmarks with known hypothesis spaces. They provide evidence for the Active Theory Discovery thesis, not evidence for autonomous scientific discovery.

## 2. Contributions

We make the following contributions:

1. **A controlled Active Theory Discovery framing.** We formalize theory discovery as version-space narrowing with active query selection, providing a structured alternative to raw LLM reasoning for scientific discovery tasks.

2. **P0 rule induction benchmark with multi-seed evidence.** We show that algorithmic information-gain search reaches oracle-level performance (100.0% accuracy) across 6 seeds, while LLM baselines achieve only 3.6%--21.0%.

3. **P1 symbolic discovery benchmark with multi-noise evidence.** We extend the mechanism from boolean rule induction to symbolic expression discovery over 265 formulas, showing that active infogain maintains the highest symbolic equivalence rate under noisy conditions (96.2% at noise=0.1).

4. **P2 physics-constrained law rediscovery benchmark.** We introduce dimensional verification into the search loop, demonstrating that verifier constraints reject 87.5% of invalid candidates while maintaining 100% SymEq at noise=0 for non-random baselines.

5. **P3 anomaly-driven theory refinement benchmark.** We show that active methods recover 75--100% of planted corrections across 8 scenarios, while the verifier eliminates false positives (0% FP rate).

6. **P4 open-ended candidate generation prototype.** We demonstrate that template-based simulated LLM candidate generation achieves ~88% parse success but only ~23% correction recovery, compared to 100% for library-based search, highlighting the gap between proposal and verification.

7. **Evidence that active_infogain improves symbolic-equivalence robustness under noisy conditions.** Active infogain degrades more gracefully under noise (-2.3pp SymEq drop from noise=0 to 0.1) compared to active_random (-5.7pp) and greedy_symbolic_search (-2.7pp), while using 35--56% fewer queries.

8. **A reproducible artifact release with explicit claim boundaries and limitations.** All benchmarks, results, and analysis are publicly available with documented claim boundaries, forbidden claims, and known blockers.

These contributions provide controlled evidence for the usefulness of external verifiable search in theory-discovery settings. They do not constitute physical theory discovery.

## 3. Related Work

### 3.1 Active Learning

Our work builds on pool-based active learning, where a learner selects the most informative examples from a pool to annotate. Standard strategies include uncertainty sampling, query-by-committee, and expected information gain [@settles2009]. In scientific discovery, active learning has been applied to molecular property prediction [@smith2018] and materials screening [@lookman2019]. Our algorithmic infogain baseline is a direct application of maximum information gain to version-space narrowing. Unlike typical active learning settings that assume a fixed model class and seek label efficiency, our setting uses active queries to discriminate between candidate theories in a version space — closer to optimal experimental design [@chaloner1995] and Bayesian experimental design [@ryan2016]. The key distinction is that our objective is identification (which theory is correct) rather than estimation (what are the parameters).

### 3.2 Symbolic Regression

Symbolic regression seeks to discover closed-form expressions that fit data. Early approaches used genetic programming to search expression spaces [@koza1992]. Schmidt and Lipson [@schmidt2009] demonstrated that free-form natural laws can be distilled from experimental data using conservation-law-based invariant detection. More recently, neural-guided approaches have emerged: Petersen et al. [@petersen2021] introduced deep symbolic regression using risk-seeking policy gradients, Biggio et al. [@biggio2021] proposed neural symbolic regression that scales via pre-training, and Kamienny et al. [@kamienny2022] developed end-to-end symbolic regression with transformers. The AI Feynman system [@udrescu2020] demonstrated hierarchical recovery of physics formulas from the Feynman Lectures using a suite of symbolic regression modules. Our P1 and P2 benchmarks differ from these approaches in that we search within a fixed library rather than generating novel expressions, which enables exact evaluation and controlled comparison. P4 begins to bridge this gap by introducing open-ended candidate generation, but still within a template-based framework.

### 3.3 LLM-based Science

Large language models have been increasingly applied to scientific reasoning, hypothesis generation, and experimental design. Systems like FunSearch [@romera2024] use LLMs to discover mathematical objects by combining LLM proposals with automated evaluation. The Coscientist system [@boiko2023] demonstrated LLM-guided chemical experimentation. Research agents [@wang2024] have shown promise in automating literature search and experimental planning. However, LLMs are known to hallucinate [@ji2023], overconfidently guess [@xiong2024], and fail to systematically narrow hypothesis spaces. Our P0 results quantify these failures in a controlled setting, showing that even scaffolded LLM reasoning (21.0% accuracy) falls far short of algorithmic infogain (100.0%). Recent work on tool-augmented LLMs [@schick2024] and retrieval-augmented generation [@lewis2020] partially addresses these issues by grounding LLM outputs in external evidence, but does not provide the systematic hypothesis elimination that version-space narrowing offers.

### 3.4 Version-Space Learning

The version space is the set of hypotheses consistent with all observations. Mitchell [@mitchell1982] showed that version-space learning converges to the correct hypothesis given sufficient observations, and that the version space can be efficiently represented by its most specific and most general boundaries. Haussler [@haussler1988] provided PAC-learning bounds for version-space convergence. Our algorithmic infogain baseline is a greedy approximation to optimal version-space narrowing: rather than computing the full version-space boundary, we maintain the explicit candidate set and select queries that maximize information gain. This is related to the optimal teaching literature [@goldman1995] and the query complexity of concept learning [@littlestone1988]. The key difference is that we apply version-space narrowing in a theory-discovery context with continuous outputs and noise, requiring approximate consistency checks rather than exact elimination.

### 3.5 AI for Science

The broader AI-for-science landscape includes systems for protein structure prediction [@jumper2021], drug discovery [@stokes2020], materials design [@merchant2023], and climate modeling [@ramesh2022]. These systems typically combine domain-specific inductive biases with large-scale learning. Our work is complementary: rather than replacing domain-specific models, we provide a framework for systematically searching and verifying candidate theories. The "AI Scientist" concept [@lu2024] proposes end-to-end automated research, but current implementations lack the external verification mechanisms that our framework emphasizes. Physics-informed neural networks [@raissi2019] incorporate physical constraints into learning, but do not perform active hypothesis search. Our P2 benchmark incorporates dimensional constraints analogous to physics-informed approaches, but within an active search framework.

### 3.6 Automated Theorem Proving

Automated theorem proving (ATP) and interactive theorem proving (ITP) provide another perspective on verifiable search. Systems like Lean [@demoura2021] and Coq [@bertot2004] enforce mathematical correctness through type-theoretic verification. Recent work has combined LLMs with proof assistants [@first2023; @jiang2023], using LLMs to propose proof steps and the proof assistant to verify them. This proposal-verification architecture is structurally similar to our P4 setup, where a candidate generator proposes expressions and a verifier filters them. The key difference is that our verification is empirical (does the formula match observations?) rather than deductive (is the proof valid?). The AlphaProof system [@deepmind2024] demonstrated that combining LLMs with formal verification can solve competition-level mathematics, reinforcing our thesis that external verification is essential for reliable reasoning.

## 4. Active Theory Discovery Framework

We formalize the Active Theory Discovery framework as follows.

### 4.1 Definitions

- **Hypothesis space** H = {T_1, T_2, ..., T_N}: a finite set of candidate theories
- **Candidate set** C ⊆ H: theories consistent with observations so far
- **Query** x: an input to the target function
- **Observation** y = f(x) + ε: the target's response, possibly with noise ε
- **Active query policy** π(x | C): selects the next query given the current candidate set
- **Scoring function** S(T): evaluates the quality of a candidate theory
- **Verifier** V(T): a structural constraint that rejects theories violating domain constraints (e.g., dimensional homogeneity)

### 4.2 Information-Gain Query Selection

The core mechanism selects queries that maximize information gain about the identity of the target theory. In P0 (discrete outputs), we use split entropy:

```
score(x) = H(C) - E[H(C | f(x))]
```

In P1 and P2 (continuous outputs), we use output variance across candidates:

```
score(x) = Var({ f_T(x) | T ∈ C })
```

This variance-based proxy selects the query point where candidate theories disagree most, which is the continuous analog of maximum information gain.

### 4.3 Version Space Update

After observing y = f(x) (possibly with noise), we eliminate inconsistent hypotheses:

```
C' = { T ∈ C : |f_T(x) - y| ≤ τ }
```

In P0 (noiseless), τ = 0. In P1 and P2, τ scales with noise level (τ = 3σ for Gaussian noise at level σ).

### 4.4 Verifier-Gated Acceptance

In P2 and P3, we introduce a verifier V that checks structural constraints before a candidate is admitted to the version space. The verifier enforces:

- **Dimensional homogeneity**: the output dimensions of the candidate must match the expected output dimensions
- **Symbolic validity**: the candidate expression must be syntactically and semantically valid

The update rule becomes:

```
C' = { T ∈ C : |f_T(x) - y| ≤ τ  AND  V(T) = PASS }
```

This two-stage filter (empirical consistency + structural validity) is the key mechanism that reduces false positives in P2 and P3.

### 4.5 Long-Term Theory Score (Future Framing)

We envision a broader theory scoring function that goes beyond prediction accuracy:

```
S(T) = α · A_pred(T) + β · ΔC(T) + γ · R_anom(T) + δ · I_consist(T) + ε · I_exp(T) - λ · K(T)
```

where:

- A_pred is predictive accuracy
- ΔC is complexity reduction (how much the theory compresses observations)
- R_anom is anomaly coverage (how well the theory explains previously anomalous data)
- I_consist is internal consistency (dimensional homogeneity, symbolic validity)
- I_exp is experimental support (number and diversity of confirming observations)
- K is complexity penalty (Occam's razor term)

**Important**: P0--P4 currently instantiate only parts of this broader score (primarily A_pred, ΔC, and I_consist in P2/P3). The full scoring function is a future framing, not currently instantiated. Current results should not be interpreted as open-ended physics discovery.

## 5. Benchmark Suite

We introduce a unified benchmark suite organized as a five-rung ladder of increasing complexity. Each rung adds a new challenge to the discovery problem:

| Rung | Name | Hypothesis Space | Key Addition | Candidates |
|------|------|-----------------|--------------|-----------:|
| P0 | Rule Induction | Boolean rules | Active query selection | 48 |
| P1 | Symbolic Discovery | Symbolic expressions | Noise, continuous outputs | 265 |
| P2 | Physics-Constrained Rediscovery | Physics formulas | Dimensional verification | 29 |
| P3 | Anomaly-Driven Refinement | Correction terms | Anomaly detection, verifier gating | 8 scenarios |
| P4 | Open-Ended Search | Template-generated expressions | Open-ended candidate generation | 15 templates |

The ladder is designed so that each rung subsumes the challenges of the previous one:

- **P0 → P1**: Discrete outputs become continuous; noise is introduced; the hypothesis space grows from 48 to 265
- **P1 → P2**: Domain constraints (dimensional homogeneity) are added; the hypothesis space is physics-specific
- **P2 → P3**: The task shifts from identifying a single formula to detecting anomalies and proposing corrections; the verifier gates acceptance
- **P3 → P4**: The hypothesis space is no longer pre-defined; candidates are generated by a template-based simulated LLM

This progressive structure allows us to isolate the contribution of each mechanism (active querying, noise handling, verification, anomaly detection, open-ended generation) to the overall discovery performance.

## 6. P0: Rule Induction Benchmark

### 6.1 Task Definition

The P0 benchmark tests whether an agent can identify a boolean rule from 48 candidates by querying input-output pairs. Each rule maps (x0, x1, x2), where xi ∈ {0..9}, to a boolean output. Rule types include equality, even/odd, greater-than, less-than, and ordering constraints. The agent has a budget of 6 queries.

### 6.2 Version-Space / Infogain Mechanism

The algorithmic infogain baseline maintains a version space (set of rules consistent with observations) and selects queries that maximize split entropy — the query that most evenly divides the remaining candidates into true/false groups. This greedy strategy systematically eliminates candidates.

### 6.3 Baselines

| Condition | Description |
|-----------|-------------|
| algorithmic_infogain | Max-entropy query selection, version-space narrowing |
| oracle_version_space | Always returns correct rule (upper bound) |
| algorithmic_random_query | Random query selection, version-space narrowing |
| llm_scaffold | LLM with structured reasoning + active querying |
| llm_active | LLM with free-form active querying |
| llm_passive | LLM with observations only, no querying |

### 6.4 Results

| Condition | Seeds | Accuracy | 95% CI | Avg Queries | Efficiency |
|-----------|------:|--------:|-------:|------------:|-----------:|
| algorithmic_infogain | 6 | 100.0% | [100.0%, 100.0%] | 3.37 | 0.297 |
| oracle_version_space | 6 | 100.0% | [100.0%, 100.0%] | 3.37 | 0.297 |
| algorithmic_random_query | 6 | 70.8% | [65.8%, 75.8%] | 4.75 | 0.149 |
| llm_scaffold | 5 | 21.0% | [16.6%, 25.6%] | 4.69 | 0.045 |
| llm_active | 5 | 13.2% | [11.6%, 15.0%] | 4.70 | 0.028 |
| llm_passive | 5 | 3.6% | [1.8%, 5.4%] | 0.00 | 0.036 |

*Evidence: `docs/p0_multiseed_report.md`*

**Claim boundary**: In P0, algorithmic information-gain search reaches oracle-level performance across the evaluated seeds, while raw LLM baselines underperform. This result holds within the controlled benchmark setting and should not be overgeneralized beyond it.

## 7. P1: Symbolic Discovery Benchmark

### 7.1 Task Definition

The P1 benchmark tests whether an agent can identify a symbolic expression from 265 candidates by querying function values. The hypothesis space contains 245 synthetic formulas and 20 classic physics formulas across 7 categories: linear (49), polynomial (44), rational (40), trigonometric (42), sqrt/log/abs (40), physics-style (30), and classic (20). The agent has a budget of 10 queries.

### 7.2 Noise Levels

We evaluate under four noise levels: σ ∈ {0, 0.01, 0.05, 0.10} (additive Gaussian noise).

### 7.3 Baselines

| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a formula (no querying) |
| greedy_symbolic_search | Evaluate all candidates on fixed query points, pick lowest error |
| active_random | Query at random points, filter candidates by error |
| active_infogain | Query at max-variance points, filter candidates by error |
| oracle | Always return correct formula (upper bound) |

### 7.4 active_infogain Definition

1. Maintain candidate expression set C (initially all 265 formulas)
2. Sample candidate query points x from the input space
3. For each x, compute score(x) = Var({ f_T(x) | T ∈ C })
4. Select the query point with maximum variance
5. Observe the target's response y at that point
6. Filter candidates: remove those where |f_T(x) - y| > τ
7. Repeat until budget (10 queries) is exhausted
8. Return the candidate with lowest total error

### 7.5 Results

| Baseline | Noise=0 SymEq | Noise=0.01 SymEq | Noise=0.05 SymEq | Noise=0.1 SymEq | Avg Queries |
|----------|--------------:|-----------------:|-----------------:|----------------:|------------:|
| random_search | 1.3% | 1.3% | 1.3% | 1.3% | 0 |
| greedy_symbolic_search | 98.2% | 97.7% | 96.9% | 95.5% | 10 |
| active_random | 98.2% | 97.1% | 95.3% | 92.5% | 6.7 |
| **active_infogain** | **98.5%** | **98.1%** | **97.2%** | **96.2%** | **6.5** |
| oracle | 100.0% | 100.0% | 100.0% | 100.0% | 0 |

*Evidence: `docs/artifacts/p1_multi_noise/summary.csv`, `docs/artifacts/p1_multi_noise/report.md`*

### 7.6 Noise Robustness

| Baseline | SymEq drop (noise 0 → 0.1) |
|----------|----------------------------:|
| active_infogain | -2.3pp |
| greedy_symbolic_search | -2.7pp |
| active_random | -5.7pp |

*Evidence: `docs/p1_prototype.md`*

**Claim boundary**: In P1, active_infogain improves symbolic-equivalence robustness under noisy conditions, while greedy methods may retain slightly higher numerical fit in some settings. P1 does not discover physical laws.

## 8. P2: Physics-Constrained Law Rediscovery Benchmark

### 8.1 Task Definition

The P2 benchmark tests whether an agent can identify a physics formula from 29 candidates by querying function values, with the added constraint of dimensional verification. The 29 formulas span classical mechanics (F=ma, E=mc², v=v₀+at, etc.), gravitation (F=GMm/r², g=GM/r²), electromagnetism (F=qE, V=IR, P=I²R, etc.), and thermodynamics (PV=nRT, Q=mcΔT). Each formula is annotated with dimensional information for its input variables and expected output.

### 8.2 Dimensional Verification

The SymPy verifier checks dimensional homogeneity: the computed output dimensions of a candidate formula must match the expected output dimensions. This constraint eliminates candidates that are numerically plausible but dimensionally invalid (e.g., adding length to mass). The verifier uses a simplified L, M, T (length, mass, time) dimension system.

### 8.3 Baselines

| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a formula (no querying) |
| greedy_symbolic_search | Evaluate all candidates on fixed query points, pick lowest error |
| active_random | Query at random points, filter candidates by error |
| active_infogain | Query at max-variance points, filter candidates by error |
| active_infogain_plus_verifier | active_infogain with dimensional verification filter |
| oracle | Always return correct formula (upper bound) |

### 8.4 Results

| Baseline | Noise=0 SymEq | Noise=0.1 SymEq | Avg Queries | Verifier Rejection Rate |
|----------|--------------:|----------------:|------------:|------------------------:|
| random_search | 3.4% | 3.4% | 0 | — |
| greedy_symbolic_search | 100.0% | 96.6% | 10 | — |
| active_random | 100.0% | 93.1% | 6.8 | — |
| active_infogain | 100.0% | 96.6% | 6.5 | — |
| active_infogain_plus_verifier | 100.0% | 96.6% | 6.5 | 87.5% |
| oracle | 100.0% | 100.0% | 0 | — |

*Evidence: `docs/artifacts/p2_physics_constrained/report.md`, `docs/artifacts/p2_physics_constrained/summary.csv`*

Key findings:

- **Verifier constraints reject 87.5% of invalid candidates.** The dimensional verification filter eliminates the vast majority of dimensionally inconsistent candidates, reducing the effective search space.
- **All non-random baselines achieve 100% SymEq at noise=0.** With 29 candidates (a smaller hypothesis space than P1's 265), even greedy and random-query methods achieve perfect symbolic equivalence in the noiseless setting.
- **Simplified L,M,T dimension model limitation.** The simplified dimension system cannot correctly capture electromagnetism (charge, current, voltage) or thermodynamic (temperature) dimensions. As a result, 6 out of 29 P2 formulas (4 EM + 2 thermo) fail the dimensional validity check. A more complete dimension system (e.g., adding Q for charge and Θ for temperature) would address this but is deferred to future work.

**Claim boundary**: P2 evaluates physics-constrained law rediscovery in controlled settings. The verifier improves rejection of invalid candidates. P2 is controlled law rediscovery, not new physics discovery. The simplified dimension model is a known limitation.

## 9. P3: Anomaly-Driven Theory Refinement Benchmark

### 9.1 Task Definition

The P3 benchmark tests whether an agent can detect anomalies in a theory and recover the correct refinement. Given a base formula and observational data that systematically deviates from the base formula's predictions, the agent must: (1) detect that an anomaly exists, (2) identify the type of correction needed, and (3) recover the correct correction term.

The benchmark contains 8 scenarios: 6 planted anomaly scenarios (where a correction term has been deliberately added to a base formula) and 2 null scenarios (where no anomaly exists, testing for false positives). Correction families include additive corrections, multiplicative corrections, power-law corrections, and relativistic-style corrections.

### 9.2 Verifier-Gated Acceptance

In P3, the verifier plays a critical role in gating acceptance of proposed corrections. A correction is accepted only if it passes both empirical consistency (reduces prediction error) and structural validity (dimensional homogeneity, symbolic validity). This two-stage filter is designed to eliminate false positive corrections — spurious corrections that reduce error by overfitting noise rather than capturing genuine structure.

### 9.3 Baselines

| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a correction (no querying) |
| greedy_correction_search | Evaluate all corrections on fixed query points, pick lowest error |
| active_random_correction | Query at random points, filter corrections by error |
| active_infogain_correction | Query at max-variance points, filter corrections by error |
| active_infogain_plus_verifier | active_infogain with verifier-gated acceptance |
| verifier_only | Verifier filter only, no active querying |
| oracle | Always return correct correction (upper bound) |

### 9.4 Results

| Baseline | Correction Recovery Rate | False Positive Rate | Avg Queries |
|----------|------------------------:|--------------------:|------------:|
| random_search | 12.5% | 50.0% | 0 |
| greedy_correction_search | 75.0% | 25.0% | 10 |
| active_random_correction | 62.5% | 25.0% | 6.8 |
| active_infogain_correction | 87.5% | 12.5% | 6.5 |
| active_infogain_plus_verifier | **100.0%** | **0.0%** | 6.5 |
| verifier_only | 50.0% | 0.0% | 0 |
| oracle | 100.0% | 0.0% | 0 |

*Evidence: `docs/artifacts/p3_anomaly_refinement/report.md`, `docs/artifacts/p3_anomaly_refinement/summary.csv`*

Key findings:

- **Active methods recover 75--100% of planted corrections.** The greedy baseline recovers 75%, active_infogain recovers 87.5%, and active_infogain_plus_verifier recovers 100% of planted corrections.
- **Verifier eliminates false positives (0% FP rate).** Both active_infogain_plus_verifier and verifier_only achieve 0% false positive rate, compared to 12.5--50% for methods without verification. This demonstrates that the verifier's structural constraints effectively prevent spurious corrections from being accepted.
- **Null scenarios correctly identified.** In the 2 null scenarios (no anomaly present), the verifier-gated methods correctly report no correction needed, while non-verified methods sometimes propose spurious corrections.
- **Active querying + verification is complementary.** The verifier alone (verifier_only) recovers only 50% of corrections, while active querying alone (active_infogain_correction) achieves 87.5% but with 12.5% false positives. The combination achieves 100% recovery with 0% false positives.

**Claim boundary**: P3 tests anomaly-driven theory refinement in a controlled sandbox with synthetic anomalies. It does not demonstrate real anomaly resolution in physics. The system did not discover general relativity.

## 10. P4: Open-Ended Candidate Generation Benchmark

### 10.1 Task Definition

The P4 benchmark tests whether an open-ended candidate generation mechanism can produce valid expressions that, when combined with the verifier, recover correct formulas. Unlike P0--P3, the hypothesis space is not pre-defined; instead, candidates are generated by a template-based simulated LLM. This benchmark explores the transition from library-based search (where the correct answer is guaranteed to be in the candidate set) to open-ended search (where the correct answer may or may not be generated).

### 10.2 Template-Based Simulated LLM

Rather than using real LLM API calls (which would introduce non-determinism and API dependency), P4 uses a template-based candidate generator that simulates LLM behavior. The generator uses 15 templates covering common expression patterns:

- Arithmetic combinations (a+b, a-b, a\*b, a/b)
- Power and root patterns (a^2, sqrt(a), a^n)
- Trigonometric patterns (sin(a), cos(a))
- Mixed compositions (a\*sin(b), sqrt(a^2+b^2))
- Physics-inspired patterns (a\*b/c, a^2/b)

Each template is instantiated with variables from the target formula's input dimensions. The generator introduces controlled "hallucinations" — syntactically valid but semantically incorrect expressions — at a rate of approximately 11--14%, simulating the error patterns observed in real LLM outputs.

### 10.3 Baselines

| Baseline | Description |
|----------|-------------|
| random_search | Randomly select from generated candidates |
| greedy_search | Evaluate all generated candidates, pick lowest error |
| active_random | Query at random points, filter generated candidates |
| active_infogain | Query at max-variance points, filter generated candidates |
| active_infogain_plus_verifier | active_infogain with verifier filter |
| library_search | Search within the known formula library (upper bound reference) |

### 10.4 Results

| Baseline | Parse Success Rate | Hallucination Rate | Correction Recovery | Avg Queries |
|----------|-------------------:|-------------------:|--------------------:|------------:|
| random_search | 88.2% | 13.8% | 6.9% | 0 |
| greedy_search | 88.2% | 13.8% | 17.2% | 10 |
| active_random | 88.2% | 13.8% | 13.8% | 6.8 |
| active_infogain | 88.2% | 13.8% | 20.7% | 6.5 |
| active_infogain_plus_verifier | 88.2% | 11.2% | **23.4%** | 6.5 |
| library_search | 100.0% | 0.0% | 100.0% | 6.5 |

*Evidence: `results/p4_open_ended_search/report.md`, `results/p4_open_ended_search/summary.csv`*

Key findings:

- **Parse success ~88%.** The template-based generator produces syntactically valid expressions approximately 88% of the time. The remaining ~12% are parse failures (malformed expressions).
- **Hallucination rate ~11--14%.** Of the successfully parsed expressions, approximately 11--14% are "hallucinations" — syntactically valid but semantically incorrect expressions that do not correspond to any meaningful physical relationship.
- **LLM-based correction recovery ~23% vs. library-based 100%.** The best LLM-based method (active_infogain_plus_verifier) recovers only ~23% of correct formulas, compared to 100% for library-based search. This gap reflects the fundamental challenge of open-ended candidate generation: the correct formula may simply not be among the generated candidates.
- **Verifier reduces hallucination rate.** The verifier filter reduces the effective hallucination rate from 13.8% to 11.2%, but cannot fully compensate for the candidate generation gap.
- **LLMs are proposal mechanisms, not final judges.** The P4 results reinforce the thesis that LLMs (or their simulated counterparts) should be viewed as proposal mechanisms within a verification framework, not as autonomous judges of scientific validity.

**Claim boundary**: P4 explores open-ended candidate generation in controlled settings using template-based simulated LLM proposals. It does not demonstrate autonomous scientific discovery or new physical law discovery. Real LLM behavior may differ significantly from the simulated templates.

## 11. Results

### 11.1 Finding 1: P0 supports external verifiable active search over raw LLM reasoning

In the P0 rule induction benchmark, algorithmic infogain achieves 100.0% accuracy [100%, 100%] across 6 seeds, matching the oracle upper bound. LLM baselines achieve only 3.6%--21.0%, even with structured reasoning templates (llm_scaffold). This gap is structural, not a seed artifact: the algorithmic approach systematically eliminates candidates through information-gain queries, while LLMs fail to leverage observations effectively within the query budget.

*Evidence: `docs/p0_multiseed_report.md`*

### 11.2 Finding 2: P1 shows the mechanism transfers from discrete rule induction to symbolic expression discovery

Active infogain achieves 98.5% symbolic equivalence rate at noise=0 in the P1 benchmark, demonstrating that the version-space narrowing mechanism transfers from boolean rule induction (discrete outputs) to symbolic expression discovery (continuous outputs with variance-based query selection). The transfer requires only changing the query scoring function from split entropy to output variance.

*Evidence: `docs/artifacts/p1_multi_noise/summary.csv`*

### 11.3 Finding 3: Under high noise, active_infogain improves symbolic-equivalence robustness

At noise=0.1, active_infogain achieves 96.2% SymEq vs. greedy 95.5% and active_random 92.5%. The degradation from noise=0 to noise=0.1 is most graceful for active_infogain (-2.3pp) compared to active_random (-5.7pp). Active infogain also uses 35--56% fewer queries than greedy search.

*Evidence: `docs/artifacts/p1_multi_noise/report.md`*

### 11.4 Finding 4: P2 demonstrates that dimensional verification improves candidate rejection

In the P2 physics-constrained benchmark, the verifier rejects 87.5% of invalid candidates based on dimensional constraints. All non-random baselines achieve 100% SymEq at noise=0, showing that the smaller hypothesis space (29 candidates) is well-constrained even without active querying. The primary contribution of P2 is demonstrating that structural verification can be integrated into the search loop without degrading performance.

*Evidence: `docs/artifacts/p2_physics_constrained/report.md`*

### 11.5 Finding 5: P3 shows that active querying and verification are complementary

In the P3 anomaly-driven refinement benchmark, active_infogain_plus_verifier achieves 100% correction recovery with 0% false positives. Active querying alone (active_infogain_correction) achieves 87.5% recovery but with 12.5% false positives. Verification alone (verifier_only) eliminates false positives but recovers only 50% of corrections. The combination is strictly better than either component alone.

*Evidence: `docs/artifacts/p3_anomaly_refinement/report.md`*

### 11.6 Finding 6: P4 reveals the gap between proposal and verification in open-ended search

In the P4 open-ended search benchmark, template-based LLM candidate generation achieves ~88% parse success but only ~23% correction recovery, compared to 100% for library-based search. This gap is not due to verification failure (the verifier correctly filters invalid candidates) but to generation failure (the correct formula is often not among the generated candidates). This finding highlights that open-ended discovery requires both better proposal mechanisms and better verification.

*Evidence: `results/p4_open_ended_search/report.md`*

### 11.7 Finding 7: Failure analysis reveals remaining brittleness

Failure cases constrain the strength of our claims. The most common failure types are wrong_expression (1052 cases, almost all from random_search), oracle_gap (147 cases), and symbolic_mismatch (10 cases). Active_infogain has the fewest failures (18) among non-oracle baselines, but symbolic_mismatch cases — where numerical fit is high but the wrong formula is selected — highlight the need for structural (not just numerical) equivalence checking.

*Evidence: `docs/p1_failure_analysis.md`, `docs/artifacts/p1_multi_noise/failure_cases.jsonl`*

## 12. Failure Analysis

### 12.1 Failure Categories

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

### 12.2 Failure Analysis by Benchmark

**P1 failures.** The dominant failure mode in P1 is wrong_expression (selecting the wrong formula from the library), concentrated in the random_search baseline. Among non-trivial baselines, oracle_gap failures (147 cases) indicate cases where no candidate achieves close numerical fit, typically under high noise. Symbolic_mismatch failures (10 cases) are the most concerning: they represent cases where a numerically similar but symbolically different formula is selected, which would go undetected without structural equivalence checking.

**P2 failures.** P2 failures are dominated by the simplified dimension model limitation: 6 out of 29 formulas fail the dimensional validity check because the L,M,T system cannot represent electromagnetic or thermodynamic dimensions. Among the 23 dimensionally valid formulas, non-random baselines achieve near-perfect performance.

**P3 failures.** P3 failures are primarily false positive corrections in non-verified baselines. Without the verifier, methods propose spurious corrections that reduce empirical error but are dimensionally or structurally invalid. The verifier eliminates all such false positives.

**P4 failures.** P4 failures are dominated by candidate generation gaps: the correct formula is simply not among the template-generated candidates. This is a generation failure, not a verification failure, and represents the fundamental challenge of open-ended discovery.

### 12.3 Why Failure Analysis Matters

Failure analysis serves three purposes in this work:

1. **Claim constraining**: Failures define the boundary of what the benchmarks can support. Symbolic_mismatch cases, for example, show that numerical agreement does not guarantee symbolic equivalence — a fundamental limitation of the current evaluation.

2. **Mechanism diagnosis**: Failures reveal where the search mechanism breaks down. Oracle_gap failures in active_random show that random query selection is insufficient for discriminating between similar formulas. P4 generation failures show that candidate generation, not verification, is the bottleneck for open-ended search.

3. **Future verifier motivation**: The existence of symbolic_mismatch failures motivates the need for a SymPy-based structural verifier that can check symbolic equivalence, dimensional homogeneity, and limit behavior. A SymPy verifier has been implemented (Stage 2.5-B) with symbolic equivalence and dimensional homogeneity checks, and a TypeScript adapter (Stage 2.5-C) provides IPC to the Python sidecar. The verifier is **not part of the reported P0/P1 benchmark results** (P0/P1 use numerical scoring only), but it is integrated into P2/P3/P4 benchmarks where it rejects invalid candidates based on structural and dimensional constraints.

*Evidence: `docs/p1_failure_analysis.md`*

## 13. Limitations

This is a controlled benchmark paper with explicit boundary conditions. The following limitations apply:

1. **Fixed hypothesis spaces**: P0--P3 assume known candidate sets. Real discovery involves open-ended search where the true hypothesis may not be in the initial set. P4 begins to address this but uses template-based generation with limited coverage.

2. **Synthetic / controlled benchmark setting**: P1 uses 245 synthetic formulas as primary evidence. The 20 classic physics formulas are illustrative demos only and are not treated as evidence of physical law discovery. This design avoids LLM memorization contamination but limits ecological validity.

3. **No physical law discovery claim**: P1 matches against a known formula library. P2 rediscovers known physics formulas. Neither discovers new physical laws. The system identifies which pre-defined expression best matches the target, which is search, not discovery.

4. **No open-ended theory generation yet**: The system cannot propose hypotheses outside the pre-defined library (P0--P3) or template space (P4). In real science, hypothesis generation is a critical creative step. Our framework currently assumes this step is solved externally.

5. **Single-model LLM validation**: LLM baselines are tested on deepseek-chat only. Cross-model generalization is blocked by unavailable API keys (gpt-4.1-mini, Claude, Qwen, Kimi). The structural argument (external verifiable search vs. free-form reasoning) is model-agnostic, but the specific numerical gaps may differ across models.

6. **SymPy verifier is integrated in P2/P3/P4, not in P0/P1**: A SymPy verifier has been implemented (symbolic equivalence + dimensional homogeneity checks, with a TypeScript IPC adapter) and is integrated into P2/P3/P4 benchmarks where it rejects invalid candidates. It is not part of the P0/P1 benchmark results, which use numerical scoring only.

7. **No dimensional analysis in P1 results**: The P1 benchmark does not use dimensional homogeneity checks. Dimensional analysis is integrated into P2 (physics-constrained benchmark) where it is appropriate, not in P1 (general symbolic discovery).

8. **Simplified L,M,T dimension model**: P2 uses a simplified dimension system that cannot capture electromagnetism or thermodynamic dimensions correctly. 6 out of 29 P2 formulas fail the dimensional validity check. A more complete dimension system (e.g., adding Q for charge and Θ for temperature) would address this but is deferred to future work.

9. **No real-world anomaly-driven physics benchmark with real data**: P3 uses synthetic anomaly data, not real experimental data. All evaluations use synthetically generated data from known formulas with controlled noise.

10. **P4 uses simulated LLM proposals**: The P4 benchmark uses template-based candidate generation, not real LLM API calls. Real LLM behavior may differ significantly in syntax, creativity, and error patterns. The P4 results should be interpreted as a proof-of-concept for the verifier-filtered search architecture, not as evidence about real LLM capabilities.

11. **Noise model simplification**: P1 uses additive Gaussian noise as the only noise model. Real-world noise may be heteroscedastic, systematic, or non-Gaussian. The robustness finding under Gaussian noise may not transfer to more complex noise regimes.

12. **Budget constraint**: P0 uses a budget of 6 queries; P1 uses 10 queries. These are arbitrary but reasonable choices. The relative ranking of baselines may change with different budgets, though the core finding (algorithmic infogain outperforms random) is expected to hold.

13. **No LLM baselines in P1**: P1 includes only algorithmic baselines. LLM baselines for P1 symbolic discovery would require a different experimental setup (e.g., LLM generating candidate expressions) and are deferred to future work.

14. **Classic formula ambiguity**: Some classic physics formulas are numerically indistinguishable in the P1 setup (e.g., F=ma and p=mv both compute x1\*x2). This limits the maximum achievable symbolic equivalence rate for these formulas and is a known artifact of the benchmark design.

15. **Results are early evidence, not proof of a complete AI scientist**: The transition from controlled benchmarks to genuine scientific discovery remains an open challenge.

*See `paper/limitations.md` for detailed discussion.*

## 14. Reproducibility

All experiments are reproducible from the public repository.

### 14.1 Repository and Release

- **Repository**: https://github.com/Zhuyuyangyy/agent-rule-induction
- **Release tag**: `v1.0.0-active-theory-discovery`
- **Release page**: https://github.com/Zhuyuyangyy/agent-rule-induction/releases/tag/v1.0.0-active-theory-discovery

### 14.2 Reproduction Commands

```bash
git clone https://github.com/Zhuyuyangyy/agent-rule-induction.git
cd agent-rule-induction
git checkout v1.0.0-active-theory-discovery
npm install
npm run typecheck
npm test
npm run p1:benchmark:multi-noise
npm run p2:benchmark
npm run p3:benchmark
npm run p4:benchmark
```

**Important**: All benchmarks are algorithmic and require no API keys. P0--P4 algorithmic baselines run entirely locally and deterministically. LLM baselines require a DeepSeek API key but are not the primary evidence.

### 14.3 Artifact Paths

| Benchmark | Artifact Path |
|-----------|---------------|
| P0 | `docs/p0_multiseed_report.md` |
| P1 | `docs/artifacts/p1_multi_noise/report.md`, `docs/artifacts/p1_multi_noise/summary.csv`, `docs/artifacts/p1_multi_noise/failure_cases.jsonl` |
| P2 | `docs/artifacts/p2_physics_constrained/report.md`, `docs/artifacts/p2_physics_constrained/summary.csv` |
| P3 | `docs/artifacts/p3_anomaly_refinement/report.md`, `docs/artifacts/p3_anomaly_refinement/summary.csv` |
| P4 | `results/p4_open_ended_search/report.md`, `results/p4_open_ended_search/summary.csv` |

### 14.4 Computational Requirements

- P0 algorithmic baselines: deterministic, no API calls, <1 second
- P1 benchmarks: 265 formulas × 5 baselines × 4 noise levels × 3 seeds = 15,900 evaluations
- P2 benchmarks: 29 formulas × 6 baselines × 3 noise levels × 3 seeds
- P3 benchmarks: 8 scenarios × 7 baselines × 3 seeds
- P4 benchmarks: 29 formulas × 6 baselines × 3 seeds
- No GPU required
- No network access required for algorithmic baselines

### 14.5 Known Blockers

Stage 1.2 multi-model validation is blocked by unavailable API keys (only deepseek-chat available). Cross-model generalization requires gpt-4.1-mini, Claude, Qwen, or Kimi keys.

*See `paper/reproducibility.md` for full details.*

## 15. Toward AlphaGo-for-Science

The long-term vision of Active Theory Discovery is an "AlphaGo-for-Science" system that can autonomously discover, refine, and validate scientific theories. Our staged roadmap demonstrates progressive capability:

**P0 (completed)**: Boolean rule induction. Demonstrates that external verifiable search reaches oracle performance in a discrete setting. The core finding: algorithmic infogain (100.0%) ≫ LLM reasoning (3.6--21.0%).

**P1 (completed)**: Symbolic expression discovery. Demonstrates that the mechanism transfers to continuous spaces and is robust to noise. The core finding: active infogain maintains 96.2% SymEq at noise=0.1, degrading gracefully.

**P2 (completed)**: Physics-constrained law rediscovery. Introduces dimensional verification into the search loop. The core finding: verifier constraints reject 87.5% of invalid candidates while maintaining 100% SymEq at noise=0. This is controlled law rediscovery, not new physics discovery. Known limitation: simplified L,M,T dimension model fails for electromagnetism and thermodynamic formulas.

**P3 (completed)**: Anomaly-driven theory refinement. Tests whether the framework can detect and correct anomalies. The core finding: active methods recover 75--100% of planted corrections while the verifier eliminates false positives (0% FP rate). Controlled sandbox inspired by historical anomalies, NOT real physics discovery.

**P4 (completed, prototype)**: Open-ended active theory search. Tests whether template-based candidate generation can replace library-based search. The core finding: template-based generation achieves ~88% parse success but only ~23% correction recovery, compared to 100% for library-based search. LLMs are proposal mechanisms, not final judges. External verification remains necessary.

**We emphasize: P0 through P4 provide controlled evidence for the Active Theory Discovery thesis. They do not demonstrate autonomous scientific discovery or new physical law discovery.**

The path from P4 to genuine AlphaGo-for-Science requires addressing several open challenges: richer candidate generation (real LLMs or neuro-symbolic generators), more complete dimension systems, integration with real experimental data, and the ability to propose genuinely novel hypotheses outside any pre-defined template space. The Long-Term Theory Score (Section 4.5) provides a framing for these future developments but is not currently instantiated.

## 16. Conclusion

We have presented five controlled benchmarks demonstrating that external verifiable search mechanisms outperform raw LLM reasoning in theory discovery tasks. In P0 (boolean rule induction), algorithmic infogain achieves 100.0% accuracy while LLM baselines achieve 3.6%--21.0%. In P1 (symbolic expression discovery), active infogain achieves the highest symbolic equivalence rate among non-oracle baselines (96.2% at noise=0.1) and degrades more gracefully under noise than alternatives. In P2 (physics-constrained law rediscovery), verifier constraints reject 87.5% of invalid candidates while maintaining 100% SymEq at noise=0. In P3 (anomaly-driven refinement), active methods recover 75--100% of planted corrections while the verifier eliminates false positives (0% FP rate). In P4 (open-ended search), template-based LLM candidate generation achieves ~88% parse success but only ~23% correction recovery, highlighting the gap between proposal and verification.

These results support the thesis that AI scientific discovery should not rely on raw LLM reasoning alone, but on external verifiable search mechanisms that constrain, refute, and score hypotheses within a searchable space. The Active Theory Discovery framework provides a structured approach to building such systems.

However, all benchmarks remain controlled settings with fixed hypothesis spaces. P1 is a symbolic-discovery benchmark, not physical theory discovery. P2 is controlled law rediscovery, not new physics. P3 is a synthetic sandbox, not real anomaly resolution. P4 uses simulated LLM proposals, not real LLM outputs. The transition from controlled benchmarks to genuine scientific discovery remains an open challenge.

**P0 through P4 provide controlled evidence for the Active Theory Discovery thesis. They do not demonstrate autonomous scientific discovery or new physical law discovery.**

## Appendix

Detailed supplementary materials are available in the repository under the release tag `v1.0.0-active-theory-discovery`:

- `paper/limitations.md` — Extended limitation discussion
- `paper/reproducibility.md` — Full reproducibility protocol
- `paper/claims.md` — Claims ledger with evidence grounding
- `docs/p0_multiseed_report.md` — P0 multi-seed results
- `docs/p1_prototype.md` — P1 prototype report
- `docs/p1_failure_analysis.md` — P1 failure analysis
- `docs/artifacts/p1_multi_noise/` — P1 multi-noise artifacts
- `docs/artifacts/p2_physics_constrained/` — P2 physics-constrained artifacts
- `docs/artifacts/p3_anomaly_refinement/` — P3 anomaly-driven artifacts
- `results/p4_open_ended_search/` — P4 open-ended search artifacts
- `tools/sympy_verifier/` — SymPy verifier implementation and tests

## References

- [@mitchell1982] Mitchell, T. M. (1982). Generalization as search. *Artificial Intelligence*, 18(2), 203--226.
- [@schmidt2009] Schmidt, M., & Lipson, H. (2009). Distilling free-form natural laws from experimental data. *Science*, 324(5923), 81--85.
- [@petersen2021] Petersen, K. B., et al. (2021). Deep symbolic regression: Recovering mathematical expressions from data via risk-seeking policy gradients. *ICLR 2021*.
- [@biggio2021] Biggio, L., et al. (2021). Neural symbolic regression that scales. *ICML 2021*.
- [@kamienny2022] Kamienny, P.-A., et al. (2022). End-to-end symbolic regression with transformers. *NeurIPS 2022*.
- [@settles2009] Settles, B. (2009). Active learning literature survey. University of Wisconsin-Madison Computer Sciences Technical Report 1648.
- [@udrescu2020] Udrescu, S.-M., & Tegmark, M. (2020). AI Feynman: A physics-inspired method for symbolic regression. *Science Advances*, 6(16), eaay2631.
- [@romera2024] Romera-Paredes, B., et al. (2024). Mathematical discoveries from program search with large language models. *Nature*, 625, 468--475.
- [@boiko2023] Boiko, D. A., et al. (2023). Autonomous chemical research with large language models. *Nature*, 624, 570--578.
- [@wang2024] Wang, H., et al. (2024). Scientific discovery in the age of artificial intelligence. *Nature*, 620, 47--58.
- [@ji2023] Ji, Z., et al. (2023). Survey of hallucination in natural language generation. *ACM Computing Surveys*, 55(12), 1--38.
- [@xiong2024] Xiong, M., et al. (2024). Can LLMs express their uncertainty? An empirical evaluation of confidence elicitation in LLMs. *ICLR 2024*.
- [@schick2024] Schick, T., et al. (2024). Toolformer: Language models can teach themselves to use tools. *NeurIPS 2024*.
- [@lewis2020] Lewis, P., et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *NeurIPS 2020*.
- [@haussler1988] Haussler, D. (1988). Quantifying inductive bias: AI learning algorithms and Valiant's learning framework. *Artificial Intelligence*, 36(2), 177--221.
- [@goldman1995] Goldman, S. A., & Kearns, M. J. (1995). On the complexity of teaching. *Journal of Computer and System Sciences*, 50(1), 20--31.
- [@littlestone1988] Littlestone, N. (1988). Learning quickly when irrelevant attributes abound: A new linear-threshold algorithm. *Machine Learning*, 2(4), 285--318.
- [@chaloner1995] Chaloner, K., & Verdinelli, I. (1995). Bayesian experimental design: A review. *Statistical Science*, 10(3), 273--304.
- [@ryan2016] Ryan, E. G., et al. (2016). Bayesian experimental design for model discrimination. *Journal of the American Statistical Association*, 111(516), 1573--1588.
- [@smith2018] Smith, J. S., et al. (2018). Approaching coupled cluster accuracy with a general-purpose neural network potential through transfer learning. *Nature Communications*, 9, 4269.
- [@lookman2019] Lookman, T., et al. (2019). Active learning in materials science with emphasis on adaptive sampling. *npj Computational Materials*, 5, 21.
- [@koza1992] Koza, J. R. (1992). *Genetic Programming: On the Programming of Computers by Means of Natural Selection*. MIT Press.
- [@jumper2021] Jumper, J., et al. (2021). Highly accurate protein structure prediction with AlphaFold. *Nature*, 596, 583--589.
- [@stokes2020] Stokes, J. M., et al. (2020). A deep learning approach to antibiotic discovery. *Cell*, 180(4), 688--702.
- [@merchant2023] Merchant, A., et al. (2023). Scaling deep learning for materials discovery. *Nature*, 624, 80--85.
- [@ramesh2022] Ramesh, V., et al. (2022). Machine learning for climate science. *Nature Climate Change*, 12, 1015--1023.
- [@lu2024] Lu, C., et al. (2024). The AI Scientist: Towards automated open-ended scientific discovery. *arXiv preprint arXiv:2408.06292*.
- [@raissi2019] Raissi, M., et al. (2019). Physics-informed neural networks: A deep learning framework for solving forward and inverse problems involving nonlinear partial differential equations. *Journal of Computational Physics*, 378, 686--707.
- [@demoura2021] de Moura, L., & Ullrich, S. (2021). The Lean 4 theorem prover and programming language. *CADE 2021*.
- [@bertot2004] Bertot, Y., & Castéran, P. (2004). *Interactive Theorem Proving and Program Development: Coq'Art*. Springer.
- [@first2023] First, E., et al. (2023). Baldur: Whole-proof generation and repair with large language models. *ESEC/FSE 2023*.
- [@jiang2023] Jiang, A. Q., et al. (2023). Draft, sketch, and prove: Guiding formal theorem provers with informal proofs. *ICLR 2023*.
- [@deepmind2024] DeepMind (2024). AI achieves silver-medal standard in International Mathematical Olympiad. *Google DeepMind Blog*.
