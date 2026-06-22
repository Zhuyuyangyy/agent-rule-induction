# Tables Plan

## Table 1: P0 Multi-Seed Benchmark Summary

Source: `docs/p0_multiseed_report.md`

| Condition | Seeds | Accuracy | 95% CI | Avg Queries | Efficiency |
|-----------|------:|--------:|-------:|------------:|-----------:|
| algorithmic_infogain | 6 | 100.0% | [100.0%, 100.0%] | 3.37 | 0.297 |
| oracle_version_space | 6 | 100.0% | [100.0%, 100.0%] | 3.37 | 0.297 |
| algorithmic_random_query | 6 | 70.8% | [65.8%, 75.8%] | 4.75 | 0.149 |
| llm_scaffold | 5 | 21.0% | [16.6%, 25.6%] | 4.69 | 0.045 |
| llm_active | 5 | 13.2% | [11.6%, 15.0%] | 4.70 | 0.028 |
| llm_passive | 5 | 3.6% | [1.8%, 5.4%] | 0.00 | 0.036 |

Key: 48 candidate boolean rules over (x0,x1,x2), xi in {0..9}, budget=6 queries.

## Table 2: P1 Multi-Noise Benchmark Summary

Source: `docs/artifacts/p1_multi_noise/summary.csv`

| Baseline | Noise | Avg R^2 | 95% CI | SymEq Rate | 95% CI | Avg Queries |
|----------|------:|--------:|-------:|-----------:|-------:|------------:|
| random_search | 0 | 0.010 | [0.005, 0.015] | 1.3% | [0.5%, 2.1%] | 0 |
| greedy_symbolic_search | 0 | 0.985 | [0.976, 0.992] | 98.2% | [97.2%, 99.1%] | 10 |
| active_random | 0 | 0.985 | [0.976, 0.992] | 98.2% | [97.2%, 99.1%] | 4.5 |
| active_infogain | 0 | 0.985 | [0.976, 0.992] | 98.5% | [97.6%, 99.2%] | 4.4 |
| oracle | 0 | 0.985 | [0.976, 0.992] | 100.0% | [100%, 100%] | 0 |
| random_search | 0.1 | 0.015 | [0.009, 0.022] | 1.3% | [0.5%, 2.1%] | 0 |
| greedy_symbolic_search | 0.1 | 0.909 | [0.892, 0.926] | 95.5% | [94.0%, 96.9%] | 10 |
| active_random | 0.1 | 0.872 | [0.851, 0.893] | 92.5% | [90.6%, 94.2%] | 6.7 |
| active_infogain | 0.1 | 0.903 | [0.885, 0.920] | 96.2% | [94.8%, 97.5%] | 6.5 |
| oracle | 0.1 | 0.910 | [0.892, 0.926] | 100.0% | [100%, 100%] | 0 |

Key: 265 formulas (245 synthetic + 20 classic), 3 seeds, budget=10 queries.

## Table 3: P1 Failure Analysis Summary

Source: `docs/p1_failure_analysis.md`

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
- active_infogain: 18 failures (fewest among non-oracle baselines)

## Table 4: Current Limitation and Future Work

| Limitation | Status | Next Action |
|-----------|--------|-------------|
| LLM baselines tested on deepseek-chat only | blocked | Need gpt-4.1-mini / Claude / Qwen / Kimi keys |
| P1 uses fixed formula library | by design | Future: open-ended symbolic regression |
| No SymPy-based symbolic verifier | planned | Stage 2.5: design doc first |
| P2 physical law recovery not started | roadmap | Depends on P1 paper completion |
| No real-world physics data | roadmap | P2 will use physics-constrained formulas |
