# Active Theory Discovery

A staged framework for investigating whether external verifiable search mechanisms outperform raw LLM reasoning in rule induction and symbolic discovery tasks.

## Project Status

- **P0 (Rule Induction)**: Completed. Multi-seed validation confirms algorithmic_infogain reaches oracle performance (100%) while LLM baselines underperform (3.6%-21.0%).
- **P1 (Symbolic Expression Discovery)**: Paper-grade benchmark. 265 formulas, 5 baselines, multi-noise evaluation. Active-infogain achieves highest symbolic equivalence rate among non-oracle baselines.
- **P2 (Physics-Constrained Law Rediscovery)**: Completed. 29 physics formulas with dimensional annotations, 6 baselines. Verifier constraints reject 87.5% of invalid candidates. Controlled law rediscovery, not new physics.
- **P3 (Anomaly-Driven Theory Refinement)**: Completed. 8 scenarios, 7 correction families, 7 baselines. Verifier eliminates false positives. Controlled sandbox, not real physics.
- **P4 (Open-Ended Active Theory Search)**: Completed (prototype). Template-based simulated LLM candidate generation, 6 baselines. LLMs are proposal mechanisms, not final judges. External verification remains necessary.
- **P5 (Causal Mechanism Discovery)**: Completed. 8 graph configurations, 5 baselines. Active intervention selection improves graph recovery. Controlled causal benchmark, not real-world causal discovery.
- **Multi-Agent Workflow**: Completed. 6 bounded agents (proposer, experiment designer, verifier, skeptic, reviewer, archivist). LLM can only propose, never judge.
- **Current release**: `v2.0.0-active-theory-discovery-platform`

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

# Type checking and unit tests
npm run typecheck
npm test

# P0/P1 benchmarks
npm run p1:benchmark          # noise=0
npm run p1:benchmark:noisy    # noise=0.05
npm run p1:benchmark:multi-noise  # noise=0,0.01,0.05,0.1

# P2/P3/P4 benchmarks
npm run p2:benchmark
npm run p3:benchmark
npm run p4:benchmark

# P5 causal mechanism benchmark
npm run p5:benchmark

# Reproduce all core benchmarks
npm run reproduce:core

# Audit commands
npm run audit:claims
npm run audit:artifacts
```

All benchmarks are algorithmic and require no API keys.

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
  p2/
    p2Benchmark.ts       # P2 benchmark runner (6 baselines)
    p2Dataset.ts         # 29 physics formulas with dimensional annotations
    p2Score.ts           # P2 scoring metrics
    dimensionalConstraints.ts  # L,M,T dimension checking
    physicsExpr.ts       # Physics expression utilities
    physicsFormulaLibrary.ts   # Physics formula definitions
  p3/
    p3Benchmark.ts       # P3 benchmark runner (7 baselines)
    anomalyDataset.ts    # 8 anomaly scenarios
    anomalyScore.ts      # P3 scoring metrics
    candidateCorrections.ts  # 7 correction families
  p4/
    p4Benchmark.ts       # P4 benchmark runner (6 baselines)
    candidateGenerator.ts  # Template-based simulated LLM
    candidateParser.ts   # Candidate expression parser
    verifierFilteredSearch.ts  # Verifier-filtered search
  p5/
    p5Benchmark.ts       # P5 benchmark runner (5 baselines)
    causalGraph.ts       # DAG generation and analysis
    interventionDataset.ts  # Synthetic data with interventions
    p5Score.ts           # Causal discovery metrics
  core/
    types.ts             # Shared benchmark types
    seed.ts              # Seeded PRNG
    metrics.ts           # Bootstrap CI, mean, stddev
    artifactWriter.ts    # Standardized artifact output
    runner.ts            # Unified benchmark runner
  agents/
    proposerAgent.ts     # Template-based candidate generation
    experimentDesignerAgent.ts  # Max-variance query selection
    verifierAgent.ts     # SymPy-based constraint checking
    skepticAgent.ts      # Overfitting/complexity detection
    reviewerAgent.ts     # Forbidden claim checking
    archivistAgent.ts    # Audit log and manifest writing
    workflow.ts          # Multi-agent orchestration
  verifier/
    verifierClient.ts    # TypeScript IPC adapter for SymPy verifier
    verifierTypes.ts     # Verifier type definitions
    smokeTest.ts         # Verifier smoke tests
tools/
  sympy_verifier/
    verify_expr.py       # SymPy verifier (equivalence, dimension, canonicalize)
    requirements.txt     # Python dependencies
    examples/            # Example JSON inputs
    tests/               # pytest tests
docs/
  p0_multiseed_report.md
  p0_benchmark.md
  failure_analysis.md
  p1_prototype.md
  p1_failure_analysis.md
  final_project_report.md
  artifacts/
    p1_multi_noise/
      report.md, summary.csv, failure_cases.jsonl
    p2_physics_constrained/
      report.md, summary.csv, failure_cases.jsonl
    p3_anomaly_refinement/
      report.md, summary.csv, failure_cases.jsonl
    final/
      final_project_report.md
paper/
  draft.md, claims.md, limitations.md, reproducibility.md
  figures_plan.md, tables_plan.md
```

## Core Thesis

> External algorithmic information-gain mechanisms (version-space narrowing, variance-based query selection) consistently outperform raw LLM reasoning or simple heuristics across controlled discovery settings — from boolean rule induction (P0) through symbolic expression discovery (P1), physics-constrained law rediscovery (P2), anomaly-driven refinement (P3), open-ended candidate search (P4), and causal mechanism discovery (P5). This supports the need for verifiable search scaffolding rather than relying on LLM reasoning alone.

## What This Project Does NOT Claim

- It does NOT discover new physical laws
- It does NOT complete "AI scientist"
- It does NOT demonstrate deeper physics understanding
- P2/P3/P4/P5 remain controlled benchmark settings, not real physics or causal discovery

This project does not claim discovery of new physical laws. This project does not claim to be a complete AI scientist. P2 is controlled law rediscovery, P3 is a controlled sandbox, P4 uses simulated LLM proposals, and P5 is controlled causal benchmark. All benchmarks operate within fixed or bounded hypothesis spaces.
