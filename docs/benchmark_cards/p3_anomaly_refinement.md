# P3: Anomaly-Driven Theory Refinement

## Task
Detect anomalies in a theory and recover the correct refinement.

## Hypothesis Space
8 scenarios: 6 planted anomalies + 2 null. Correction families include additive, multiplicative, power-law, and relativistic-style corrections.

## Baselines
| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a correction |
| greedy_correction_search | Evaluate all corrections on fixed points |
| active_random_correction | Query at random points, filter corrections |
| active_infogain_correction | Query at max-variance points, filter |
| active_infogain_plus_verifier | active_infogain with verifier-gated acceptance |
| verifier_only | Verifier filter only, no active querying |
| oracle | Always return correct correction |

## Metrics
- Correction recovery rate
- False positive rate
- Average queries used

## Artifacts
- `docs/artifacts/p3_anomaly_refinement/report.md`
- `docs/artifacts/p3_anomaly_refinement/summary.csv`
- `docs/artifacts/p3_anomaly_refinement/failure_cases.jsonl`

## Supported Claims
- P3 tests anomaly-driven theory refinement in a controlled sandbox
- Verifier eliminates false positives (0% FP rate)
- Active querying + verification is complementary

## Unsupported Claims
- P3 discovers real anomalies in physics
- P3 demonstrates real anomaly resolution

## Known Failure Modes
- Non-verified baselines produce false positive corrections
- Null scenarios sometimes trigger spurious corrections without verifier
