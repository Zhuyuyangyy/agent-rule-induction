# P1: Symbolic Expression Discovery

## Task
Discover a symbolic expression from 265 candidates by querying function values under noise.

## Hypothesis Space
265 formulas across 7 categories: linear (49), polynomial (44), rational (40), trigonometric (42), sqrt/log/abs (40), physics-style (30), classic (20).

## Baselines
| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a formula (no querying) |
| greedy_symbolic_search | Evaluate all candidates on fixed query points |
| active_random | Query at random points, filter candidates |
| active_infogain | Query at max-variance points, filter candidates |
| oracle | Always return correct formula (upper bound) |

## Metrics
- Symbolic equivalence rate (SymEq)
- Noise robustness (SymEq drop from noise=0 to noise=0.1)
- Average queries used

## Artifacts
- `docs/artifacts/p1_multi_noise/report.md`
- `docs/artifacts/p1_multi_noise/summary.csv`
- `docs/artifacts/p1_multi_noise/failure_cases.jsonl`

## Supported Claims
- P1 transfers active search from rule induction to symbolic discovery
- P1 active_infogain improves symbolic-equivalence robustness under noise
- P1 remains a symbolic-discovery benchmark, not physical theory discovery

## Unsupported Claims
- P1 discovers physical laws
- P1 works for all symbolic expressions (only 265 tested)

## Known Failure Modes
- wrong_expression: selecting wrong formula (dominant in random_search)
- oracle_gap: no candidate achieves close fit (under high noise)
- symbolic_mismatch: numerically close but symbolically different (10 cases)
