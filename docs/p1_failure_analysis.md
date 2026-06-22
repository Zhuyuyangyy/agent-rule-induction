# P1 Failure Analysis

Generated: 2026-06-22T08:53:59.504Z

Total failure cases: 1213

## Failure Types

| Type | Count |
|------|------:|
| wrong_expression | 1052 |
| symbolic_mismatch | 10 |
| oracle_gap | 147 |
| overfit_noise | 4 |

## Failures by Baseline

| Baseline | Failure Count |
|----------|-------------:|
| random_search | 1052 |
| greedy_symbolic_search | 41 |
| active_random | 102 |
| active_infogain | 18 |

## Example Cases by Failure Type

### wrong_expression

- **syn_linear_1** (baseline: random_search, noise: 0)
  - Target: `1 * x1 + 1`
  - R²: 0.0526
  - Why: Predicted a different expression for syn_linear_1 (1 * x1 + 1). R²=0.0526, candidate set reduced to 265.

- **syn_linear_2** (baseline: random_search, noise: 0)
  - Target: `1 * x1 + -1`
  - R²: 0.0526
  - Why: Predicted a different expression for syn_linear_2 (1 * x1 + -1). R²=0.0526, candidate set reduced to 265.

- **syn_linear_3** (baseline: random_search, noise: 0)
  - Target: `1 * x1 + 2`
  - R²: 0.0000
  - Why: Predicted a different expression for syn_linear_3 (1 * x1 + 2). R²=0.0000, candidate set reduced to 265.

### symbolic_mismatch

- **syn_sqrt_log_abs_6** (baseline: greedy_symbolic_search, noise: 0)
  - Target: `abs(x1 - 1)`
  - R²: 1.0000
  - Why: Numerically close (R²=1.0000) but symbolically different for syn_sqrt_log_abs_6. The predicted expression approximates the target but is not the same symbolic form.

- **syn_sqrt_log_abs_6** (baseline: active_random, noise: 0)
  - Target: `abs(x1 - 1)`
  - R²: 1.0000
  - Why: Numerically close (R²=1.0000) but symbolically different for syn_sqrt_log_abs_6. The predicted expression approximates the target but is not the same symbolic form.

- **syn_sqrt_log_abs_6** (baseline: greedy_symbolic_search, noise: 0.01)
  - Target: `abs(x1 - 1)`
  - R²: 1.0000
  - Why: Numerically close (R²=1.0000) but symbolically different for syn_sqrt_log_abs_6. The predicted expression approximates the target but is not the same symbolic form.

### oracle_gap

- **syn_physics_7** (baseline: greedy_symbolic_search, noise: 0)
  - Target: `x1 / x3`
  - R²: 0.0000
  - Why: Large gap from oracle: R²=0.0000 for syn_physics_7. The baseline failed to identify the correct expression.

- **syn_physics_7** (baseline: active_random, noise: 0)
  - Target: `x1 / x3`
  - R²: 0.0000
  - Why: Large gap from oracle: R²=0.0000 for syn_physics_7. The baseline failed to identify the correct expression.

- **syn_physics_7** (baseline: active_infogain, noise: 0)
  - Target: `x1 / x3`
  - R²: 0.0000
  - Why: Large gap from oracle: R²=0.0000 for syn_physics_7. The baseline failed to identify the correct expression.

### overfit_noise

- **syn_rational_5** (baseline: greedy_symbolic_search, noise: 0.01)
  - Target: `1 / x1 ^ 2`
  - R²: 0.8446
  - Why: Overfit to noise at level 0.01. R²=0.8446 for syn_rational_5. The baseline fit noise patterns rather than the true function.

- **syn_rational_1** (baseline: greedy_symbolic_search, noise: 0.05)
  - Target: `1 / x1`
  - R²: 0.7864
  - Why: Overfit to noise at level 0.05. R²=0.7864 for syn_rational_1. The baseline fit noise patterns rather than the true function.

- **syn_rational_7** (baseline: greedy_symbolic_search, noise: 0.05)
  - Target: `x1 / (x1 ^ 2 + 1)`
  - R²: 0.5103
  - Why: Overfit to noise at level 0.05. R²=0.5103 for syn_rational_7. The baseline fit noise patterns rather than the true function.

