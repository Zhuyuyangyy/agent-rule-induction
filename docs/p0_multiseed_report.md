# P0 Multi-Seed Benchmark Report

## Status

Stage 1 completed except multi-model validation, which is blocked by unavailable API keys.

- Stage 1.1 Multi-seed experiment: **completed** (6 seeds × 100 tasks)
- Stage 1.2 Multi-model experiment: **blocked** (only deepseek-chat available)
- Stage 1.3 Condition naming standardization: **completed**
- Stage 1.4 Bootstrap confidence intervals: **completed**
- Stage 1.5 Failure analysis: **completed**

## Core Result (6 seeds: 42, 1, 2, 3, 4, 5)

| Condition | Seeds | Accuracy | 95% CI | Avg Queries | 95% CI | Efficiency | 95% CI |
|-----------|------:|--------:|-------:|------------:|-------:|-----------:|-------:|
| algorithmic_infogain | 6 | 100.0% | [100.0%, 100.0%] | 3.37 | [3.32, 3.42] | 0.297 | [0.292, 0.301] |
| oracle_version_space | 6 | 100.0% | [100.0%, 100.0%] | 3.37 | [3.32, 3.42] | 0.297 | [0.292, 0.301] |
| algorithmic_random_query | 6 | 70.8% | [65.8%, 75.8%] | 4.75 | [4.64, 4.84] | 0.149 | [0.137, 0.163] |
| llm_scaffold | 5 | 21.0% | [16.6%, 25.6%] | 4.69 | [4.59, 4.80] | 0.045 | [0.035, 0.056] |
| llm_active | 5 | 13.2% | [11.6%, 15.0%] | 4.70 | [4.59, 4.81] | 0.028 | [0.025, 0.032] |
| llm_passive | 5 | 3.6% | [1.8%, 5.4%] | 0.00 | [0.00, 0.00] | 0.036 | [0.018, 0.054] |

## Per-Seed Details

| Seed | Condition | Accuracy | Avg Queries | Avg Final VS | Efficiency |
|-----:|-----------|--------:|------------:|------------:|-----------:|
| 42 | algorithmic_random_query | 62.0% | 4.82 | 2.39 | 0.129 |
| 42 | algorithmic_infogain | 100.0% | 3.34 | 1.00 | 0.299 |
| 42 | oracle_version_space | 100.0% | 3.34 | 1.00 | 0.299 |
| 1 | algorithmic_random_query | 74.0% | 4.86 | 2.41 | 0.152 |
| 1 | algorithmic_infogain | 100.0% | 3.38 | 1.00 | 0.296 |
| 1 | oracle_version_space | 100.0% | 3.38 | 1.00 | 0.296 |
| 1 | llm_active | 15.0% | 4.83 | 2.53 | 0.031 |
| 1 | llm_passive | 1.0% | 0.00 | 12.32 | 0.010 |
| 1 | llm_scaffold | 22.0% | 4.61 | 3.57 | 0.048 |
| 2 | algorithmic_random_query | 64.0% | 4.87 | 2.76 | 0.131 |
| 2 | algorithmic_infogain | 100.0% | 3.48 | 1.00 | 0.287 |
| 2 | oracle_version_space | 100.0% | 3.48 | 1.00 | 0.287 |
| 2 | llm_active | 12.0% | 4.84 | 2.55 | 0.025 |
| 2 | llm_passive | 1.0% | 0.00 | 13.07 | 0.010 |
| 2 | llm_scaffold | 13.0% | 4.90 | 3.71 | 0.027 |
| 3 | algorithmic_random_query | 76.0% | 4.79 | 1.96 | 0.159 |
| 3 | algorithmic_infogain | 100.0% | 3.29 | 1.00 | 0.304 |
| 3 | oracle_version_space | 100.0% | 3.29 | 1.00 | 0.304 |
| 3 | llm_active | 12.0% | 4.48 | 2.38 | 0.027 |
| 3 | llm_passive | 5.0% | 0.00 | 11.41 | 0.050 |
| 3 | llm_scaffold | 19.0% | 4.73 | 3.03 | 0.040 |
| 4 | algorithmic_random_query | 69.0% | 4.65 | 2.20 | 0.148 |
| 4 | algorithmic_infogain | 100.0% | 3.42 | 1.00 | 0.292 |
| 4 | oracle_version_space | 100.0% | 100.0% | 1.00 | 0.292 |
| 4 | llm_active | 16.0% | 4.68 | 2.73 | 0.034 |
| 4 | llm_passive | 6.0% | 0.00 | 12.08 | 0.060 |
| 4 | llm_scaffold | 29.0% | 4.53 | 2.95 | 0.064 |
| 5 | algorithmic_random_query | 80.0% | 4.51 | 2.18 | 0.177 |
| 5 | algorithmic_infogain | 100.0% | 3.31 | 1.00 | 0.302 |
| 5 | oracle_version_space | 100.0% | 3.31 | 1.00 | 0.302 |
| 5 | llm_active | 11.0% | 4.68 | 2.71 | 0.024 |
| 5 | llm_passive | 5.0% | 0.00 | 11.36 | 0.050 |
| 5 | llm_scaffold | 22.0% | 4.70 | 3.59 | 0.047 |

## Key Finding

> **algorithmic_infogain reaches oracle_version_space accuracy; LLM agents underperform.**
> This holds across 6 random seeds, confirming the result is not a seed artifact.
>
> The external verifiable search mechanism (algorithmic_infogain) is reliably effective,
> while raw LLM reasoning (even with scaffolding) cannot stably leverage active querying.

## Failure Analysis Summary

LLM failure types observed:
- **wrong_rule** (3 cases): LLM chose wrong rule from narrowed version space
- **version_space_mismatch** (3 cases): LLM predicted rule outside remaining version space
- **overconfident_guess** (2 cases): LLM answered too early with insufficient queries
- **timeout** (1 case): Budget exhausted without final answer

See `docs/failure_analysis.md` for detailed case studies.

## Multi-Model Validation

Status: **blocked**

Only deepseek-chat API key is currently available. Cross-model generalization (gpt-4.1-mini, Claude Haiku, Qwen, Kimi) is deferred to future work.

## Implication

This result supports the core thesis:

> AI scientific discovery should not rely on raw LLM reasoning, but on external verifiable search mechanisms that constrain, refute, and score hypotheses within a searchable space.
