# P3: Anomaly-Driven Theory Refinement Benchmark

## Overview

P3 tests anomaly-driven theory refinement in a controlled sandbox. Given a baseline model and residual anomaly data, the task is to discover the planted correction term that explains the anomaly.

This benchmark is **inspired by** historical scientific anomalies (e.g., the Mercury perihelion precession anomaly that motivated general relativity), but uses **simplified synthetic scenarios** — it does NOT use real Mercury data or real physics discovery.

## Design

### Problem Setting

1. A **baseline model** (e.g., Newtonian gravity: F = GMm/r²) generates predictions
2. A **planted correction** (e.g., +3GML²/(c²r⁴) as a simplified GR-like term) is added to create residual anomaly
3. The task: given baseline model predictions + residual anomaly data, discover the planted correction

### Anomaly Scenarios (8)

| ID | Baseline | Planted Correction | Family |
|----|----------|-------------------|--------|
| gravity_angular_momentum | GMm/r² | +3GML²/(c²r⁴) | angular_momentum_like |
| inverse_cube_perturbation | k/r² | +β/r³ | inverse_cube_perturbation |
| velocity_dependent_correction | k/r² | +γv²/r | velocity_dependent |
| inverse_square_perturbation | k/r² | +α/r² | inverse_square_perturbation |
| polynomial_residual | k/r² | +εr | polynomial_residual |
| null_no_anomaly | k/r² | 0 | null_correction |
| null_potential_energy | mgh | 0 | null_correction |
| angular_momentum_orbital | km/r² | +δL²/r³ | angular_momentum_like |

### Correction Candidate Families (7)

1. **inverse_square_perturbation**: α/r²
2. **inverse_cube_perturbation**: β/r³
3. **velocity_dependent**: γv²/r
4. **angular_momentum_like**: δL²/r³ (and δL²/(c²r⁴) variant)
5. **polynomial_residual**: εr^n
6. **spurious_overfit**: high-order polynomial
7. **null_correction**: 0 (no correction needed)

Each correction has a SymExpr representation, parameters, and dimensional annotations.

### Baselines (7)

1. **baseline_model_only**: Always return null correction (assumes baseline is sufficient)
2. **random_correction_search**: Randomly pick a correction from candidates
3. **greedy_residual_fit**: Fit each correction on training data, pick lowest residual
4. **active_random_correction**: Random query points, filter candidates by residual match
5. **active_infogain_correction**: Max-variance query selection, filter by residual
6. **active_infogain_plus_verifier**: Pre-filter by dimensional validity, then active infogain
7. **oracle_planted_correction**: Always return the planted correction (upper bound)

### Metrics

| Metric | Description |
|--------|-------------|
| anomalyResolutionRate | Fraction of anomaly resolved (residual reduction > 90%) |
| heldoutResidualReduction | 1 - (heldout_residual / baseline_residual) |
| correctionRecoveryRate | Whether the planted correction family is identified |
| falsePositiveCorrectionRate | Rate of selecting non-null when null is correct |
| dimensionalValidityRate | Whether correction is dimensionally valid |
| complexity | AST node count of selected correction |
| queryCost | Number of queries used |
| oracleGap | Gap from oracle performance |

## Usage

```bash
# Run with default settings
npx tsx src/p3/p3Benchmark.ts

# Custom settings
npx tsx src/p3/p3Benchmark.ts --noise 0,0.01,0.05 --budget 10 --seeds 3 --output results/p3_anomaly_refinement
```

### CLI Flags

- `--noise`: Comma-separated noise levels (default: `0,0.01,0.05`)
- `--budget`: Query budget for active baselines (default: `10`)
- `--seeds`: Number of random seeds (default: `3`)
- `--output`: Output directory (default: `results/p3_anomaly_refinement`)

### Output Files

- `report.md`: Human-readable benchmark report with tables
- `summary.csv`: Machine-readable summary statistics
- `failure_cases.jsonl`: Individual failure cases for analysis

## Architecture

```
src/p3/
├── anomalyDataset.ts       # Dataset generation with planted anomalies
├── candidateCorrections.ts # Correction candidate families
├── anomalyScore.ts         # Scoring metrics
├── p3Benchmark.ts          # Main benchmark runner with baselines
└── README.md               # This file
```

### Dependencies

- `../p1/symbolicExpr.js`: SymExpr type, evaluate, complexity
- `../p2/dimensionalConstraints.js`: DimVector, dimEqual, inferDimension

## Claim Boundary

**Allowed**:
- P3 tests anomaly-driven theory refinement in a controlled sandbox.
- P3 is inspired by historical scientific anomalies.
- P3 evaluates whether active search can recover planted correction terms.

**Forbidden**:
- The system discovered general relativity.
- The system solved Mercury perihelion.
- The system surpassed relativity.
- The system discovered a deeper theory.
