# Active Theory Discovery

A staged framework for investigating whether external verifiable search mechanisms outperform raw LLM reasoning in rule induction and symbolic discovery tasks.

## Project Status

- **P0 (Rule Induction)**: Completed. Multi-seed validation confirms algorithmic_infogain reaches oracle performance (100%) while LLM baselines underperform (3.6%-21.0%).
- **P1 (Symbolic Expression Discovery)**: Paper-grade benchmark. 265 formulas, 5 baselines, multi-noise evaluation. Active-infogain achieves highest symbolic equivalence rate among non-oracle baselines.
- **P2 (Physics-Constrained Law Rediscovery)**: Completed. 29 physics formulas with dimensional annotations, 6 baselines. Verifier constraints reject 87.5% of invalid candidates. Controlled law rediscovery, not new physics.
- **P3 (Anomaly-Driven Theory Refinement)**: Completed. 8 scenarios, 7 correction families, 7 baselines. Verifier eliminates false positives. Controlled sandbox, not real physics.

### Stage 1.2 Multi-model Validation

- **Status**: blocked
- **Reason**: only deepseek-chat API key is currently available.
- **Next action**: resume when gpt-4.1-mini / claude / qwen / kimi keys are provided.

### Stage 2 P1

P1 symbolic discovery benchmark completed with reproducible scripts.

**Reproduction commands:**

```bash
npm install
npm run typecheck
npm test
npm run p1:benchmark
npm run p1:benchmark:noisy
npm run p1:benchmark:multi-noise
```

**Artifact paths:**

```text
docs/artifacts/p1_multi_noise/report.md
docs/artifacts/p1_multi_noise/summary.csv
docs/artifacts/p1_multi_noise/failure_cases.jsonl
```

**Academic limitation:**

P1 is a symbolic-discovery benchmark, not physical theory discovery.

### Stage 4 P2

P2 physics-constrained law rediscovery benchmark completed.

**Reproduction commands:**

```bash
npm run p2:benchmark
```

**Artifact paths:**

```text
docs/artifacts/p2_physics_constrained/report.md
docs/artifacts/p2_physics_constrained/summary.csv
docs/artifacts/p2_physics_constrained/failure_cases.jsonl
```

**Academic limitation:**

P2 is controlled law rediscovery, not new physics discovery. Simplified L,M,T dimension model has known limitations for EM/thermo formulas.

### Stage 5 P3

P3 anomaly-driven theory refinement benchmark completed.

**Reproduction commands:**

```bash
npm run p3:benchmark
```

**Artifact paths:**

```text
docs/artifacts/p3_anomaly_refinement/report.md
docs/artifacts/p3_anomaly_refinement/summary.csv
docs/artifacts/p3_anomaly_refinement/failure_cases.jsonl
```

**Academic limitation:**

P3 is a controlled sandbox inspired by historical anomalies, NOT real physics discovery.

## Quick Start

```bash
npm install

# P0 tests
npm test
npm run typecheck

# P1 benchmarks
npm run p1:benchmark          # noise=0
npm run p1:benchmark:noisy    # noise=0.05
npm run p1:benchmark:multi-noise  # noise=0,0.01,0.05,0.1
```

## Key Results

### P0: Boolean Rule Induction (6 seeds)

| Condition | Accuracy | 95% CI |
|-----------|--------:|-------:|
| algorithmic_infogain | 100.0% | [100%, 100%] |
| oracle_version_space | 100.0% | [100%, 100%] |
| algorithmic_random_query | 70.8% | [65.8%, 75.8%] |
| llm_scaffold | 21.0% | [16.6%, 25.6%] |
| llm_active | 13.2% | [11.6%, 15.0%] |
| llm_passive | 3.6% | [1.8%, 5.4%] |

### P1: Symbolic Expression Discovery (265 formulas, 3 seeds)

| Baseline | Noise=0 SymEq | Noise=0.1 SymEq | Avg Queries |
|----------|--------------:|----------------:|------------:|
| random_search | 1.3% | 1.3% | 0 |
| greedy_symbolic_search | 98.2% | 95.5% | 10 |
| active_random | 98.2% | 92.5% | 6.7 |
| **active_infogain** | **98.5%** | **96.2%** | **6.5** |
| oracle | 100.0% | 100.0% | 0 |

## Project Structure

```text
src/
  p0/  (root-level files)
    rules.ts, env.ts, taskGenerator.ts    # P0 core
    runActive.ts, runPassive.ts, ...      # LLM condition runners
    multiSeedAnalysis.ts                  # Multi-seed + bootstrap CI
    failureAnalysis.ts                    # P0 failure classification
    conditionNames.ts                     # Canonical naming
  p1/
    symbolicExpr.ts    # Core DSL for symbolic expressions
    formulaLibrary.ts  # 265 formulas across 7 categories
    dataset.ts         # Dataset generation with noise
    p1Score.ts         # Scoring metrics
    baselines.ts       # 5 baselines (random, greedy, active_random, active_infogain, oracle)
    p1Benchmark.ts     # Main benchmark runner
    p1FailureAnalysis.ts # Failure classification
docs/
  p0_multiseed_report.md
  p0_benchmark.md
  failure_analysis.md
  p1_prototype.md
  p1_failure_analysis.md
  artifacts/
    p1_multi_noise/
      report.md
      summary.csv
      failure_cases.jsonl
```

## Core Thesis

> External algorithmic information-gain mechanisms (version-space narrowing, variance-based query selection) consistently outperform raw LLM reasoning or simple heuristics in both boolean rule induction and symbolic expression discovery. This supports the need for verifiable search scaffolding rather than relying on LLM reasoning alone.

## What This Project Does NOT Claim

- It does NOT discover new physical laws
- It does NOT complete "AI scientist"
- It does NOT demonstrate deeper physics understanding
- P2 (physical law recovery) is roadmap only and has not been started

Active-infogain improves symbolic-equivalence robustness under noisy conditions, while P1 remains a symbolic-discovery benchmark rather than physical theory discovery.
