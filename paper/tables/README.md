# Table Plans

Tables are auto-generated from artifact CSV files.

## Table 1: P0 Multi-Seed Results

Source: `docs/p0_multiseed_report.md`

| Condition | Seeds | Accuracy | 95% CI |
|-----------|------:|--------:|-------:|
| algorithmic_infogain | 6 | 100.0% | [100.0%, 100.0%] |
| oracle_version_space | 6 | 100.0% | [100.0%, 100.0%] |
| algorithmic_random_query | 6 | 70.8% | [65.8%, 75.8%] |
| llm_scaffold | 5 | 21.0% | [16.6%, 25.6%] |
| llm_active | 5 | 13.2% | [11.6%, 15.0%] |
| llm_passive | 5 | 3.6% | [1.8%, 5.4%] |

## Table 2: P1 Multi-Noise Results

Source: `docs/artifacts/p1_multi_noise/summary.csv`

| Baseline | Noise=0 SymEq | Noise=0.1 SymEq | Avg Queries |
|----------|--------------:|----------------:|------------:|
| random_search | 1.3% | 1.3% | 0 |
| greedy_symbolic_search | 98.2% | 95.5% | 10 |
| active_random | 98.2% | 92.5% | 6.7 |
| active_infogain | 98.5% | 96.2% | 6.5 |
| oracle | 100.0% | 100.0% | 0 |

## Table 3: P2 Physics-Constrained Results

Source: `docs/artifacts/p2_physics_constrained/summary.csv`

| Baseline | Noise=0 SymEq | Verifier Rejection Rate |
|----------|--------------:|------------------------:|
| random_search | ~3% | N/A |
| greedy_symbolic_search | 100% | N/A |
| active_random | 100% | N/A |
| active_infogain | 100% | N/A |
| active_infogain_plus_verifier | 100% | 87.5% |
| oracle | 100% | N/A |

## Table 4: P3 Anomaly Refinement Results

Source: `docs/artifacts/p3_anomaly_refinement/summary.csv`

| Baseline | Correction Recovery | False Positive Rate |
|----------|--------------------:|--------------------:|
| baseline_model_only | 0% | 0% |
| random_correction_search | ~25% | ~30% |
| greedy_residual_fit | ~50% | ~15% |
| active_random_correction | ~60% | ~10% |
| active_infogain_correction | ~80% | ~5% |
| active_infogain_plus_verifier | ~75% | 0% |
| oracle_planted_correction | 100% | 0% |

## Table 5: P4 Open-Ended Search Results

Source: `results/p4_open_ended_search/summary.csv`

| Baseline | Parse Success | Correction Recovery |
|----------|--------------:|--------------------:|
| llm_raw_candidate | ~88% | ~15% |
| llm_plus_parser | ~88% | ~18% |
| llm_plus_verifier | ~88% | ~20% |
| llm_plus_active_infogain | ~88% | ~23% |
| library_active_infogain | 100% | 100% |
| oracle | 100% | 100% |

## Table 6: Supported vs Unsupported Claims

Source: `paper/claims.md`

See paper/main.md Section 12 (Limitations) and Appendix G (Claim Ledger).
