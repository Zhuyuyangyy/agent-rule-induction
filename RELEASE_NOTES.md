# v0.1-p0-p1 Release Notes

## Completed

### P0: Rule Induction Benchmark

- 48 candidate boolean rules over (x0, x1, x2) where xi in {0..9}
- 6 experimental conditions:
  - `algorithmic_random_query` — random query selection from version space
  - `algorithmic_infogain` — greedy max-entropy (information gain) query selection
  - `oracle_version_space` — oracle baseline, always picks correct rule from version space
  - `llm_passive` — LLM receives observations only, no querying
  - `llm_scaffold` — LLM with structured reasoning prompt + active querying
  - `llm_active` — LLM with free-form active querying
- Core finding: **algorithmic_infogain reaches oracle_version_space accuracy; LLM agents underperform**
- API safety layer: output protection, resume, manifest, request ledger, response cache, retry logic
- Deterministic task generation with seed-based RNG

### P1: Symbolic Discovery Prototype (experimental)

- Roadmap and prototype structure defined
- Not yet at benchmark grade — see Stage 2 plan

### P2–P4: Roadmap Only

- P2: Physical law recovery from controlled data
- P3: Cross-theory unification
- P4: Open scientific exploration
- No implementation for P2–P4 in this release

## Not Claimed

- No final theory discovery
- No physical-law discovery yet
- No relativity/quantum unification
- No multi-seed or multi-model experiments yet (seed=42, model=deepseek-chat only)
- No confidence intervals or failure analysis yet

## Project Structure

```
src/
  rules.ts              — 48 candidate rules + input space
  env.ts                — RuleInductionEnv, version space, entropy
  taskGenerator.ts      — Deterministic task generation
  runActive.ts          — LLM active condition runner
  runPassive.ts         — LLM passive condition runner
  runScaffold.ts        — LLM scaffold condition runner
  runModelQueryOracleFinal.ts — LLM queries, oracle picks final
  runOracleQueryModelFinal.ts — Oracle queries, LLM picks final
  runQueryOnlyScaffold.ts     — Scaffold with structured reasoning
  runFinalOnlyScaffold.ts     — Scaffold with structured final
  runActiveBudgetReminder.ts  — Active with budget awareness prompt
  runActiveMinQuery.ts        — Active with minimum query enforcement
  runActiveVSCount.ts         — Active with version space count feedback
  apiSafety.ts          — API safety: output protection, resume, cache, retry
  analyzeResults.ts     — Result analysis + algorithmic baselines
  metrics.ts            — Metrics computation
  test.ts               — Core unit tests
  testApiSafety.ts      — API safety offline tests
  testParseResponse.ts  — Response parser tests
  testRunnerMock.ts     — Mock runner tests
```

## Reproducibility

```bash
npm install
npx tsc --noEmit          # typecheck
npx tsx src/test.ts       # core tests
npx tsx src/testApiSafety.ts    # API safety tests
npx tsx src/testParseResponse.ts # parser tests
npx tsx src/testRunnerMock.ts   # mock runner tests

# Generate tasks
npx tsx src/taskGenerator.ts --n 100 --seed 42 --output results/tasks_seed42.json

# Run algorithmic baselines (no API key needed)
npx tsx src/analyzeResults.ts --dir results/main_seed42 --tasks results/tasks_seed42.json
```

## Known Limitations

- Only single seed (42) and single model (deepseek-chat) tested
- LLM conditions require OPENAI_API_KEY environment variable
- No P1 benchmark implementation yet
- Condition naming in code uses legacy names (active, passive, scaffold, etc.) — formal renaming planned for Stage 1
