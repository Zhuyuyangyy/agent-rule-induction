# p0-vs · Active Theory Discovery — P0 Rule-Induction Benchmark

> This repository implements the P0 environment of Active Theory Discovery:
> a controlled rule-induction benchmark for testing whether active querying and version-space reasoning improve an agent's ability to discover hidden rules.
>
> The long-term vision is to transform scientific theory discovery into a searchable, falsifiable, compressible, and actively queried optimization process.
> However, this repository does not claim to discover a final theory of physics. Current work is limited to P0 and experimental P1.

**Current stage: P0**

---

## P0–P4 Roadmap

| Stage | Name | Status | Description |
| ----- | ---- | ------ | ----------- |
| **P0** | Rule Induction | **Current delivery** | Prove that active querying outperforms passive observation at discovering hidden rules in a closed rule space |
| **P1** | Symbolic Pattern Discovery | *Experimental prototype* | Upgrade rules from Boolean conditions to symbolic expressions; test whether active querying improves formula recovery |
| P2 | Physical Law Recovery | *Roadmap only, not implemented* | Recover laws such as Kepler's from orbital data; feasibility ~45% |
| P3 | Cross-Theory Unification | *Roadmap only, not implemented* | Find shared structure across theories; feasibility ~20% |
| P4 | Open Scientific Exploration | *Roadmap only, not implemented* | Produce formalised, testable, unfalsified novel theory candidates — not a promise of discovering a final theory |

> **We are at P0.** P2–P4 are roadmap entries only. No conclusions about P2+ will be claimed until P0's primary metric is met.

## Three Settlement Milestones (Negative Results Allowed)

1. **P0-ready (current version)**: Complete the P0 micro-environment for Active Theory Discovery. Compare Passive / Scaffold / Active-Random / Active-InfoGain / Oracle Version-Space in a closed rule space. Evaluate whether active querying improves rule-discovery accuracy, query efficiency, and stability.
2. **P1-ready (next version)**: Extend the Theory DSL to symbolic expression discovery. Test whether active querying improves formula recovery on synthetic and classic formula tasks.
3. **Paper milestone**: Propose the Active Theory Discovery framework, modelling theory discovery as active querying, counterexample search, complexity penalisation, and verifiable scoring over a candidate-theory space. Validate operability at P0/P1.

> **Negative results are valid.** If active does not significantly outperform scaffold, that is an important finding. We report significance, effect sizes, and failure conditions honestly.

## No Promise of a Final Theory

This project does **not** claim to discover a unified theory or a final theory of physics. P0 validates active querying and version-space compression in a **closed rule space** only. P1 is an experimental prototype. P2–P4 are roadmap entries, not engineering commitments. P0 active-query effectiveness ≠ AI can discover deep physical theories.

## P0 Acceptance Criteria

| Criterion | Target |
| --------- | ------ |
| Task count | ≥ 100 |
| Conditions (baselines) | passive / scaffold / active-random / active-infogain / oracle |
| Result artefacts | JSONL + manifest + report |
| Evaluation metrics | accuracy, query_count, token, failure_type |
| Statistics | Significance test + effect size |
| README | One-command reproducibility |
| Result orientation | **Negative results allowed** (report honestly whether active > scaffold) |

## TheoryScore (Objective Function, Stage-Gated Computable Forms)

`TheoryScore` is the framework's "win condition". **The full 7-term formula is a long-term vision only; P0/P1 must use computable degenerate forms. The full formula is forbidden at P0/P1.**

Full vision formula (reference only, not used until P2+):

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

**P0 computable score (current delivery)**:

```
P0Score(T) =
    heldout_accuracy(T)         // rule hit rate on heldout samples
  - rule_length_penalty(T)      // description-length penalty (prevent special-casing)
  - query_cost_penalty(T)       // query count / token penalty
```

**P1 computable score (experimental prototype)**:

```
P1Score(T) =
    heldout_accuracy(T)         // 1 - mean relative error on heldout
  + symbolic_equivalent(T)      // 1 if symbolically equivalent, 0 otherwise
  - 0.01 · complexity(T)        // expression complexity penalty
  - 0.001 · query_cost(T)       // query cost penalty
```

> Every term in P0/P1 scores has a concrete algorithmic implementation. No subjective judgment is involved. P0 scoring aligns with `src/metrics.ts` (accuracy / query_count). **Using the full 7-term formula at P0/P1 is forbidden.**

## Six Core Modules

| Module | Role | P0 Degenerate Implementation |
| ------ | ---- | ---------------------------- |
| **KnownFacts** (Known Fact Base) | System foundation; AI must not invent theories from nothing | Type A: `(x, label)` sample pairs; some known, some heldout |
| **Theory DSL** (Theory Language) | Make theories machine-verifiable | `src/rules.ts` `Rule` interface (48 Boolean rules) |
| **Theory Proposer** (Theory Generator) | Propose candidate theories | LLM agent + candidate rule set filtering |
| **Verifier** | Strictly prevent degeneration into "LLM hallucination generator" | `rule(input) == label` Boolean check |
| **Falsifier** (Counterexample Searcher) | Find where a theory is wrong, not prove it right | Degenerates to "select query that best splits candidate rules" (active-infogain) |
| **Theory Arena** (Theory Leaderboard) | Continuous iteration + Anti-Goodhart hard constraint | Version-space ranking; heldout strictly invisible; no lookup-table theories |

## Key Findings (P0 Benchmark, 100 tasks, seed=42)

> **Algorithmic Active-InfoGain reaches the Oracle upper bound in P0, while LLM agents underperform. This supports the need for external verifiable search mechanisms rather than relying on raw LLM reasoning.**

| Condition | Accuracy | Avg Queries | Notes |
|-----------|----------|-------------|-------|
| algorithmic_infogain | 100.0% | 3.34 | Matches oracle upper bound |
| oracle_version_space | 100.0% | 3.34 | Theoretical upper bound |
| algorithmic_random_query | 62.0% | 4.82 | Significantly worse (p<0.0001, d=0.779) |
| llm_scaffold | 27.0% | 4.53 | LLM agents do not effectively utilize active querying |
| llm_active | 17.0% | 4.74 | Overconfident guesses (30) + version-space mismatches (24) |
| llm_passive | 4.0% | 0.00 | Almost all failures are overconfident guesses (96) |

**Positive result**: The algorithmic active-infogain / version-space mechanism is validated — it achieves the oracle upper bound in the P0 closed rule space.

**Negative result (honestly reported)**: LLM agents (deepseek-chat) do not reliably leverage the active querying mechanism. This gap is itself a significant finding: it reinforces the project's core thesis that scientific theory discovery requires external verifiable search mechanisms, not raw LLM reasoning.

## Quick Start

### Prerequisites

- Node.js ≥ 18
- An OpenAI-compatible Chat Completions endpoint (configured via environment variables)

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.deepseek.com/v1"   # or other compatible endpoint
npm install
```

### Commands

```bash
# Type checking
npm run typecheck

# Generate P0 task set (≥100 tasks)
npm run p0:gen

# Run P0 full benchmark (algorithmic baselines + LLM baselines if API key present)
npm run p0:benchmark

# Run P0 benchmark without LLM (algorithmic baselines only, no API needed)
npm run p0:benchmark -- --skip-llm

# Analyze P0 results
npm run p0:analyze

# Run P1 benchmark (experimental prototype, no noise)
npm run p1:benchmark

# Run P1 benchmark with noise (experimental prototype)
npm run p1:benchmark:noisy

# Run all tests (offline, no API calls)
npm run test
```

### Manual Step-by-Step

All runners share the same CLI arguments (`--experiment-id`, `--tasks`, `--model`, `--seed`, `--resume`, `--overwrite`, etc.). Results are written to `results/<experiment-id>/<condition>/`.

```bash
# 1. Generate task set
npx tsx src/taskGenerator.ts --n 120 --seed 42 --output results/tasks.json

# 2. Run individual conditions
npx tsx src/runPassive.ts   --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat
npx tsx src/runScaffold.ts  --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat
npx tsx src/runActive.ts    --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat
npx tsx src/runActiveRandom.ts --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat
npx tsx src/runOracleQueryModelFinal.ts --experiment-id exp_p0 --tasks results/tasks.json --model deepseek-chat

# 3. Analyze results
npx tsx src/analyzeResults.ts --dir results/exp_p0 --tasks results/tasks.json
```

Output artifacts:
- `results/<condition>/results.jsonl` — per-task results in JSONL
- `results/<condition>/manifest.json` — experiment metadata (git_commit, seed, started_at, finished_at, etc.)
- `results/analysis_report.json` — full analysis report
- `results/report.md` — Markdown format report
- `results/summary.csv` — per-condition metrics summary
- `results/failure_cases.jsonl` — failure case analysis

> `active-random` and `active-infogain` are algorithmic baselines computed locally by the analysis script — no extra API calls needed.

### Resume & Cache

```bash
# Resume interrupted experiment (only completes unfinished tasks)
npx tsx src/runActive.ts --experiment-id exp_p0 --tasks results/tasks.json --resume

# Overwrite all results
npx tsx src/runActive.ts --experiment-id exp_p0 --tasks results/tasks.json --overwrite

# Replay mode (cache miss = error, suitable for offline reproduction)
npx tsx src/runActive.ts --experiment-id exp_p0 --tasks results/tasks.json --cache-mode replay
```

## Project Structure

```
src/
├── rules.ts                     # P0 Theory DSL: 48 candidate rules (EQ/EVEN/ODD/GT/LT/ORDER) + INPUT_SPACE(0..9^3)
├── env.ts                       # RuleInductionEnv: version space, queries, computeGreedyOptimalQuery, computeRandomQuery
├── taskGenerator.ts             # Task generation + computeVersionSpace
├── metrics.ts                   # Metrics: accuracy / avgQueries / avgFinalVS / queryEfficiency
├── apiSafety.ts                 # API safety: OutputManager (JSONL+manifest+SHA256), RequestLedger, ResponseCache, ApiClientWrapper
├── runPassive.ts                # Passive baseline: no queries, guess directly
├── runScaffold.ts               # Scaffold baseline: structured reasoning + queries
├── runActive.ts                 # Active condition: LLM autonomously selects queries (core experiment)
├── runActiveMinQuery.ts         # Active variant: enforce minimum 3 queries
├── runActiveBudgetReminder.ts   # Active variant: budget-aware prompting
├── runActiveVSCount.ts          # Active variant: version-space-size guidance
├── runQueryOnlyScaffold.ts      # Scaffold variant: query-only structured reasoning
├── runFinalOnlyScaffold.ts      # Scaffold variant: final answer with top-3 hypotheses
├── runOracleQueryModelFinal.ts  # Oracle query + model final answer (version-space upper bound)
├── runModelQueryOracleFinal.ts  # Model query + oracle final answer
├── runBenchmark.ts              # P0 benchmark orchestration: generate → run all → analyze
├── analyzeResults.ts            # Aggregate analysis: load JSONL, compute random/greedy baselines, output report
├── test.ts                      # Unit tests (rules / env / task generation)
├── testApiSafety.ts             # API safety layer offline tests
├── testRunnerMock.ts            # End-to-end runner tests (mock API)
├── testParseResponse.ts         # Response parsing tests
└── p1/
    ├── benchmark.ts             # P1 benchmark orchestration (experimental prototype)
    ├── p1Benchmark.ts           # P1 symbolic-expression benchmark with scoring & significance tests
    ├── expr.ts                  # P1 expression AST
    ├── symbolicExpr.ts          # P1 symbolic expression types and evaluation
    ├── formulaLib.ts            # P1 formula library (synthetic + classic)
    ├── score.ts                 # P1 scoring function
    └── test.ts                  # P1 tests
```

## Design Principles

- **API Safety Layer** (`apiSafety.ts`): All runners share output protection (refuse silent overwrite), manifest (model + prompt + seed + task SHA256 + source hash), request ledger, response cache & retry. Experiments are auditable and reproducible.
- **Version Space** (`env.ts`): After each query, candidate rules inconsistent with the true rule on that input are eliminated; `vs_size` decreases monotonically. `computeGreedyOptimalQuery` selects the input that maximises split entropy — the active-infogain strategy.
- **Anti-Goodhart**: Heldout facts are strictly invisible to the Proposer. Theories must not directly enumerate training facts. Complexity penalty increases with the number of training facts.

## License & Citation

This project is a research prototype. If you reference it, please refer to the "Active Theory Discovery" framework positioning and P0/P1 stage descriptions above.
