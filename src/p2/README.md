# P2: Physics-Constrained Law Rediscovery

## Overview

P2 tests whether active search with verifier constraints can rediscover known physics formulas from data. This is **controlled law rediscovery**, not new physics discovery.

## Task

Given data generated from known physics-style formulas, rediscover the formula under:
- Numerical fit (R²)
- Symbolic equivalence
- Dimensional homogeneity
- Complexity penalty
- Optional limit checks

## Formula Categories

| Category | Count | Examples |
|----------|------:|----------|
| Newtonian mechanics | 6 | F=ma, p=mv, v=v0+at |
| Energy formulas | 5 | KE=½mv², PE=mgh, E=mc² |
| Harmonic oscillator | 4 | T=2π√(m/k), ω=√(k/m) |
| Inverse-square law | 4 | F=Gm₁m₂/r², g=GM/r² |
| Pendulum approximation | 3 | T=2π√(L/g), v=√(2gh) |
| Electromagnetism | 4 | V=IR, P=IV, F=qvB |
| Thermodynamic toy | 3 | P=nRT/V, Q=mcΔT |
| **Total** | **29** | |

## Baselines

| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a formula |
| greedy_symbolic_search | Evaluate all candidates on fixed points, pick lowest error |
| active_random | Query at random points, filter candidates by error |
| active_infogain | Query at max-variance points, filter candidates by error |
| active_infogain_plus_verifier | Pre-filter by dimensional validity, then active infogain |
| oracle | Always return correct formula |

## Metrics

| Metric | Description |
|--------|-------------|
| heldoutAccuracy | R² on heldout data |
| symbolicEquivalentRate | Fraction of formulas correctly rediscovered |
| dimensionalValidityRate | Fraction of predictions with valid dimensions |
| verifierRejectionRate | Fraction of candidates rejected by verifier |
| complexity | AST node count |
| queryCost | Number of queries used |
| oracleGap | 1 - R² |

## Claim Boundary

**Allowed**: P2 evaluates physics-constrained law rediscovery in controlled settings. Verifier constraints improve rejection of invalid symbolic candidates.

**Forbidden**: P2 discovers new physics. P2 surpasses known physics. P2 discovers laws beyond relativity.

## Reproduction

```bash
npm run p2:benchmark
```
