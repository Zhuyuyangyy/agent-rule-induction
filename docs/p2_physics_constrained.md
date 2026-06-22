# P2: Physics-Constrained Law Rediscovery

## Purpose

P2 evaluates whether active search with verifier constraints can rediscover known physics formulas from data. This is **controlled law rediscovery in a sandbox**, not new physics discovery.

## Design

- **Hypothesis space**: 29 known physics formulas with dimensional annotations
- **Search mechanism**: Version-space narrowing with active query selection
- **Verifier constraint**: Dimensional homogeneity check rejects invalid candidates
- **Noise levels**: 0, 0.01, 0.05

## Key Difference from P1

P1 uses 265 generic symbolic formulas without dimensional constraints. P2 adds:
1. Dimensional annotations for each variable and output
2. A `active_infogain_plus_verifier` baseline that pre-filters candidates by dimensional validity
3. `dimensionalValidityRate` and `verifierRejectionRate` metrics

## Claim Boundary

**Allowed**:
- P2 evaluates physics-constrained law rediscovery in controlled settings.
- Verifier constraints improve rejection of invalid symbolic candidates.

**Forbidden**:
- P2 discovers new physics.
- P2 surpasses known physics.
- P2 discovers laws beyond relativity.

## Formula Library

29 formulas across 7 categories:
- Newtonian mechanics (6): F=ma, p=mv, F=mg, a=F/m, v=v0+at, x=v0t+½at²
- Energy (5): KE=½mv², PE=mgh, E=mc², W=Fd, P=Fv
- Harmonic oscillator (4): T=2π√(m/k), f=1/T, ω=√(k/m), x=A sin(ωt)
- Inverse-square law (4): F=Gm₁m₂/r², F=kq₁q₂/r², I=P/4πr², g=GM/r²
- Pendulum (3): T=2π√(L/g), v=√(2gh), v_max=√(2gL)
- Electromagnetism (4): V=IR, P=IV, P=I²R, F=qvB
- Thermodynamic (3): P=nRT/V, Q=mcΔT, W=PΔV

## Baselines

| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a formula |
| greedy_symbolic_search | Evaluate all candidates on fixed points |
| active_random | Random query selection, version-space narrowing |
| active_infogain | Max-variance query selection, version-space narrowing |
| active_infogain_plus_verifier | Pre-filter by dimensional validity, then active infogain |
| oracle | Always return correct formula (upper bound) |

## Metrics

| Metric | Description |
|--------|-------------|
| heldoutAccuracy | R² on heldout data |
| symbolicEquivalentRate | Fraction correctly rediscovered |
| dimensionalValidityRate | Fraction with valid dimensions |
| verifierRejectionRate | Fraction rejected by verifier |
| complexity | AST node count |
| queryCost | Number of queries |
| oracleGap | 1 - R² |

## Reproduction

```bash
npm run p2:benchmark
```

Expected runtime: ~1-3 minutes on a standard machine.
