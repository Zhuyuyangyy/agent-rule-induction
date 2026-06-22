# P3: Anomaly-Driven Theory Refinement Benchmark Report

**Scenarios**: 8
**Noise levels**: 0, 0.01, 0.05
**Budget**: 10 queries
**Seeds**: 3
**Baselines**: baseline_model_only, random_correction_search, greedy_residual_fit, active_random_correction, active_infogain_correction, active_infogain_plus_verifier, oracle_planted_correction

## Noise = 0

| Baseline | Anomaly Res Rate | Heldout Red | Recovery Rate | FP Rate | DimValid Rate | Avg Complexity | Avg Queries | Oracle Gap |
|----------|-----------------:|------------:|--------------:|--------:|-------------:|---------------:|------------:|-----------:|
| baseline_model_only | 25.0% | 0.2500 | 25.0% | 0.0% | 100.0% | 1.0 | 0.0 | 0.6250 |
| random_correction_search | 25.0% | 0.2500 | 25.0% | 4.2% | 58.3% | 4.8 | 0.0 | 0.6250 |
| greedy_residual_fit | 87.5% | 0.8750 | 75.0% | 12.5% | 62.5% | 5.0 | 5.9 | 0.0000 |
| active_random_correction | 87.5% | 0.8750 | 75.0% | 12.5% | 62.5% | 5.0 | 10.0 | 0.0000 |
| active_infogain_correction | 70.8% | 0.7083 | 58.3% | 12.5% | 54.2% | 4.7 | 10.0 | 0.1667 |
| active_infogain_plus_verifier | 75.0% | 0.7500 | 75.0% | 0.0% | 100.0% | 3.0 | 10.0 | 0.1250 |
| oracle_planted_correction | 87.5% | 0.8750 | 100.0% | 0.0% | 75.0% | 5.0 | 0.0 | 0.0000 |

## Noise = 0.01

| Baseline | Anomaly Res Rate | Heldout Red | Recovery Rate | FP Rate | DimValid Rate | Avg Complexity | Avg Queries | Oracle Gap |
|----------|-----------------:|------------:|--------------:|--------:|-------------:|---------------:|------------:|-----------:|
| baseline_model_only | 0.0% | 0.0000 | 25.0% | 0.0% | 100.0% | 1.0 | 0.0 | 0.6197 |
| random_correction_search | 0.0% | 0.0000 | 25.0% | 4.2% | 58.3% | 4.8 | 0.0 | 0.6197 |
| greedy_residual_fit | 62.5% | 0.6197 | 75.0% | 12.5% | 62.5% | 5.0 | 5.9 | 0.0000 |
| active_random_correction | 62.5% | 0.6197 | 75.0% | 12.5% | 62.5% | 5.0 | 10.0 | 0.0000 |
| active_infogain_correction | 62.5% | 0.6197 | 75.0% | 12.5% | 62.5% | 5.0 | 10.0 | 0.0000 |
| active_infogain_plus_verifier | 50.0% | 0.4978 | 75.0% | 0.0% | 100.0% | 3.0 | 10.0 | 0.1218 |
| oracle_planted_correction | 62.5% | 0.6197 | 100.0% | 0.0% | 75.0% | 5.0 | 0.0 | 0.0000 |

## Noise = 0.05

| Baseline | Anomaly Res Rate | Heldout Red | Recovery Rate | FP Rate | DimValid Rate | Avg Complexity | Avg Queries | Oracle Gap |
|----------|-----------------:|------------:|--------------:|--------:|-------------:|---------------:|------------:|-----------:|
| baseline_model_only | 0.0% | 0.0000 | 25.0% | 0.0% | 100.0% | 1.0 | 0.0 | 0.5309 |
| random_correction_search | 0.0% | 0.0000 | 25.0% | 4.2% | 58.3% | 4.8 | 0.0 | 0.5309 |
| greedy_residual_fit | 37.5% | 0.5309 | 75.0% | 12.5% | 62.5% | 5.0 | 5.9 | 0.0000 |
| active_random_correction | 37.5% | 0.5309 | 75.0% | 12.5% | 62.5% | 5.0 | 10.0 | 0.0000 |
| active_infogain_correction | 37.5% | 0.5309 | 75.0% | 12.5% | 62.5% | 5.0 | 10.0 | 0.0000 |
| active_infogain_plus_verifier | 37.5% | 0.4565 | 75.0% | 0.0% | 100.0% | 3.0 | 10.0 | 0.0744 |
| oracle_planted_correction | 37.5% | 0.5309 | 100.0% | 0.0% | 75.0% | 5.0 | 0.0 | 0.0000 |

## Per-Scenario Breakdown

### gravity_angular_momentum

**Planted correction family**: angular_momentum_like

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 0.0% | 0.0000 | 100.0% |
| random_correction_search | 0.0% | 0.0000 | 33.3% |
| greedy_residual_fit | 0.0% | 0.0000 | 0.0% |
| active_random_correction | 0.0% | 0.0000 | 0.0% |
| active_infogain_correction | 0.0% | 0.0000 | 0.0% |
| active_infogain_plus_verifier | 0.0% | 0.0000 | 100.0% |
| oracle_planted_correction | 100.0% | 0.0000 | 0.0% |

### inverse_cube_perturbation

**Planted correction family**: inverse_cube_perturbation

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 0.0% | 0.0000 | 100.0% |
| random_correction_search | 0.0% | 0.0000 | 66.7% |
| greedy_residual_fit | 100.0% | 0.8949 | 100.0% |
| active_random_correction | 100.0% | 0.8949 | 100.0% |
| active_infogain_correction | 77.8% | 0.6727 | 77.8% |
| active_infogain_plus_verifier | 100.0% | 0.8949 | 100.0% |
| oracle_planted_correction | 100.0% | 0.8949 | 100.0% |

### velocity_dependent_correction

**Planted correction family**: velocity_dependent

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 0.0% | 0.0000 | 100.0% |
| random_correction_search | 0.0% | 0.0000 | 33.3% |
| greedy_residual_fit | 100.0% | 0.9985 | 100.0% |
| active_random_correction | 100.0% | 0.9985 | 100.0% |
| active_infogain_correction | 100.0% | 0.9985 | 100.0% |
| active_infogain_plus_verifier | 100.0% | 0.9985 | 100.0% |
| oracle_planted_correction | 100.0% | 0.9985 | 100.0% |

### inverse_square_perturbation

**Planted correction family**: inverse_square_perturbation

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 0.0% | 0.0000 | 100.0% |
| random_correction_search | 0.0% | 0.0000 | 66.7% |
| greedy_residual_fit | 100.0% | 0.9862 | 100.0% |
| active_random_correction | 100.0% | 0.9862 | 100.0% |
| active_infogain_correction | 100.0% | 0.9862 | 100.0% |
| active_infogain_plus_verifier | 100.0% | 0.9862 | 100.0% |
| oracle_planted_correction | 100.0% | 0.9862 | 100.0% |

### polynomial_residual

**Planted correction family**: polynomial_residual

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 0.0% | 0.0000 | 100.0% |
| random_correction_search | 33.3% | 0.0000 | 66.7% |
| greedy_residual_fit | 100.0% | 0.9985 | 100.0% |
| active_random_correction | 100.0% | 0.9985 | 100.0% |
| active_infogain_correction | 100.0% | 0.9985 | 100.0% |
| active_infogain_plus_verifier | 100.0% | 0.9985 | 100.0% |
| oracle_planted_correction | 100.0% | 0.9985 | 100.0% |

### null_no_anomaly

**Planted correction family**: null_correction

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 100.0% | 0.3333 | 100.0% |
| random_correction_search | 66.7% | 0.3333 | 66.7% |
| greedy_residual_fit | 0.0% | 0.3333 | 0.0% |
| active_random_correction | 0.0% | 0.3333 | 0.0% |
| active_infogain_correction | 0.0% | 0.3333 | 0.0% |
| active_infogain_plus_verifier | 100.0% | 0.3333 | 100.0% |
| oracle_planted_correction | 100.0% | 0.3333 | 100.0% |

### null_potential_energy

**Planted correction family**: null_correction

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 100.0% | 0.3333 | 100.0% |
| random_correction_search | 100.0% | 0.3333 | 100.0% |
| greedy_residual_fit | 100.0% | 0.3333 | 100.0% |
| active_random_correction | 100.0% | 0.3333 | 100.0% |
| active_infogain_correction | 100.0% | 0.3333 | 100.0% |
| active_infogain_plus_verifier | 100.0% | 0.3333 | 100.0% |
| oracle_planted_correction | 100.0% | 0.3333 | 100.0% |

### angular_momentum_orbital

**Planted correction family**: angular_momentum_like

| Baseline | Recovery | Heldout Red | DimValid |
|----------|---------:|------------:|---------:|
| baseline_model_only | 0.0% | 0.0000 | 100.0% |
| random_correction_search | 0.0% | 0.0000 | 33.3% |
| greedy_residual_fit | 100.0% | 0.8566 | 0.0% |
| active_random_correction | 100.0% | 0.8566 | 0.0% |
| active_infogain_correction | 77.8% | 0.6344 | 0.0% |
| active_infogain_plus_verifier | 0.0% | 0.0000 | 100.0% |
| oracle_planted_correction | 100.0% | 0.8566 | 0.0% |

## Claim Boundary

**Allowed**: P3 tests anomaly-driven theory refinement in a controlled sandbox. P3 is inspired by historical scientific anomalies. P3 evaluates whether active search can recover planted correction terms.
**Forbidden**: The system discovered general relativity. The system solved Mercury perihelion. The system surpassed relativity. The system discovered a deeper theory.