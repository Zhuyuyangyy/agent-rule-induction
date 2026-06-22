# P2: Physics-Constrained Law Rediscovery Benchmark Report

**Formulas**: 29
**Noise levels**: 0, 0.01, 0.05
**Budget**: 10 queries
**Seeds**: 3
**Baselines**: random_search, greedy_symbolic_search, active_random, active_infogain, active_infogain_plus_verifier, oracle

## Noise = 0

| Baseline | SymEq Rate | DimValid Rate | Avg R² | Avg Queries | Verifier Rej Rate | Oracle Gap |
|----------|-----------:|-------------:|-------:|------------:|------------------:|-----------:|
| random_search | 3.4% | 2.3% | 0.0345 | 0.0 | 0.0% | 0.9655 |
| greedy_symbolic_search | 100.0% | 79.3% | 1.0000 | 10.0 | 0.0% | 0.0000 |
| active_random | 100.0% | 79.3% | 1.0000 | 10.0 | 0.0% | 0.0000 |
| active_infogain | 100.0% | 79.3% | 1.0000 | 10.0 | 0.0% | 0.0000 |
| active_infogain_plus_verifier | 100.0% | 79.3% | 1.0000 | 10.0 | 87.5% | 0.0000 |
| oracle | 100.0% | 79.3% | 1.0000 | 0.0 | 0.0% | 0.0000 |

## Noise = 0.01

| Baseline | SymEq Rate | DimValid Rate | Avg R² | Avg Queries | Verifier Rej Rate | Oracle Gap |
|----------|-----------:|-------------:|-------:|------------:|------------------:|-----------:|
| random_search | 3.4% | 2.3% | 0.0344 | 0.0 | 0.0% | 0.9656 |
| greedy_symbolic_search | 100.0% | 79.3% | 0.9978 | 10.0 | 0.0% | 0.0022 |
| active_random | 100.0% | 79.3% | 0.9978 | 10.0 | 0.0% | 0.0022 |
| active_infogain | 100.0% | 79.3% | 0.9978 | 10.0 | 0.0% | 0.0022 |
| active_infogain_plus_verifier | 100.0% | 79.3% | 0.9978 | 10.0 | 87.5% | 0.0022 |
| oracle | 100.0% | 79.3% | 0.9978 | 0.0 | 0.0% | 0.0022 |

## Noise = 0.05

| Baseline | SymEq Rate | DimValid Rate | Avg R² | Avg Queries | Verifier Rej Rate | Oracle Gap |
|----------|-----------:|-------------:|-------:|------------:|------------------:|-----------:|
| random_search | 3.4% | 2.3% | 0.0327 | 0.0 | 0.0% | 0.9673 |
| greedy_symbolic_search | 100.0% | 79.3% | 0.9695 | 10.0 | 0.0% | 0.0305 |
| active_random | 100.0% | 79.3% | 0.9695 | 10.0 | 0.0% | 0.0305 |
| active_infogain | 100.0% | 79.3% | 0.9695 | 10.0 | 0.0% | 0.0305 |
| active_infogain_plus_verifier | 100.0% | 79.3% | 0.9695 | 10.0 | 87.5% | 0.0305 |
| oracle | 100.0% | 79.3% | 0.9695 | 0.0 | 0.0% | 0.0305 |

## Claim Boundary

**Allowed**: P2 evaluates physics-constrained law rediscovery in controlled settings. Verifier constraints improve rejection of invalid symbolic candidates.
**Forbidden**: P2 discovers new physics. P2 surpasses known physics. P2 discovers laws beyond relativity.