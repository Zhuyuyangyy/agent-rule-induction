# P0: Rule Induction

## Task
Discover a boolean rule from 48 candidates by querying input-output pairs.

## Hypothesis Space
48 boolean rules mapping (x0, x1, x2), xi in {0..9}, to boolean output.
Rule types: equality, even/odd, greater-than, less-than, ordering.

## Baselines
| Baseline | Description |
|----------|-------------|
| algorithmic_infogain | Max-entropy query selection, version-space narrowing |
| oracle_version_space | Always returns correct rule (upper bound) |
| algorithmic_random_query | Random query selection, version-space narrowing |
| llm_scaffold | LLM with structured reasoning + active querying |
| llm_active | LLM with free-form active querying |
| llm_passive | LLM with observations only, no querying |

## Metrics
- Accuracy: fraction of rules correctly identified
- 95% bootstrap confidence interval
- Average queries used
- Efficiency (accuracy / queries)

## Artifacts
- `docs/p0_multiseed_report.md`

## Supported Claims
- P0 algorithmic_infogain reaches oracle-level performance
- P0 raw LLM baselines underperform external verifiable search

## Unsupported Claims
- P0 generalizes to all rule induction settings
- P0 proves LLMs cannot do rule induction

## Known Failure Modes
- LLM baselines fail to leverage observations effectively
- Random query selection underperforms information-gain selection
