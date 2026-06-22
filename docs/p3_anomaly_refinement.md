# P3: Anomaly-Driven Theory Refinement

## Purpose

P3 tests whether active search can detect residual anomalies and recover planted correction terms in a controlled sandbox. This is inspired by historical scientific anomalies (e.g., Mercury perihelion precession), but uses synthetic/controlled data only.

## Design

- **8 scenarios**: 6 with planted anomalies + 2 null (no anomaly)
- **Baseline model**: Newtonian-style force formula
- **Planted corrections**: inverse-square, inverse-cube, velocity-dependent, angular-momentum-like, polynomial, null
- **7 candidate correction families**: inverse_square_perturbation, inverse_cube_perturbation, velocity_dependent, angular_momentum_like, polynomial_residual, spurious_overfit, null_correction

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

## Reproduction

```bash
npm run p3:benchmark
```
