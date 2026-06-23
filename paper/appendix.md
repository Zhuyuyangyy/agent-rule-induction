# Appendix

## A. P0 Rule Types

The 48 candidate boolean rules in P0 span the following types:

| Type | Count | Example |
|------|------:|---------|
| Equality | 12 | x0 == 5 |
| Even/Odd | 6 | x0 % 2 == 0 |
| Greater-than | 12 | x0 > x1 |
| Less-than | 6 | x0 < 5 |
| Ordering | 12 | x0 <= x1 |

Each rule maps (x0, x1, x2), where xi ∈ {0..9}, to a boolean output.

## B. P1 Formula Categories

The 265 candidate formulas in P1 are distributed across 7 categories:

| Category | Count | Examples |
|----------|------:|----------|
| Linear | 49 | a*x1 + b*x2 |
| Polynomial | 44 | a*x1^2 + b*x2 |
| Rational | 40 | a*x1 / (b*x2 + c) |
| Trigonometric | 42 | a*sin(b*x1) |
| Sqrt/Log/Abs | 40 | a*sqrt(abs(x1)) |
| Physics-style | 30 | a*x1*x2 (F=ma style) |
| Classic | 20 | F=ma, E=mc^2, p=m*v |

The 20 classic physics formulas are illustrative demos only and are not treated as evidence of physical law discovery.

## C. P2 Physics Formula Categories

The 29 physics formulas in P2 span 7 categories with dimensional annotations:

| Category | Count | Dimension Examples |
|----------|------:|-------------------|
| Mechanics | 6 | [L], [M*L/T^2] |
| Gravitation | 4 | [L/T^2], [L^3/T^2] |
| Electromagnetism | 5 | [M*L/(T^2*I)] (simplified) |
| Thermodynamics | 3 | [M*L^2/T^2] (simplified) |
| Waves | 4 | [1/T], [L/T] |
| Relativity | 4 | [L], [M*L^2/T^2] |
| Quantum | 3 | [M*L^2/T], [1/L^2] |

Known limitation: The simplified L,M,T dimension model cannot correctly capture electromagnetism (charge, current, voltage) or thermodynamic (temperature) dimensions. 6 out of 29 formulas fail the dimensional validity check.

## D. P3 Anomaly Scenarios

The 8 P3 anomaly scenarios:

| Scenario | Base Formula | Anomaly Type | Correction |
|----------|-------------|--------------|------------|
| Mercury perihelion | Newtonian gravity | Weak-field correction | + v^2/c^2 term |
| Photoelectric effect | Wave intensity | Threshold effect | + step function |
| Blackbody radiation | Classical Rayleigh-Jeans | UV catastrophe | + Planck correction |
| Compton scattering | Classical scattering | Wavelength shift | + Compton term |
| Gravitational lensing | Newtonian deflection | GR correction | + 2x factor |
| Perihelion advance | Kepler orbit | GR precession | + precession rate |
| Null scenario 1 | Simple harmonic | No anomaly | None |
| Null scenario 2 | Linear motion | No anomaly | None |

The first 6 scenarios contain planted anomalies; the last 2 are null scenarios where no correction should be applied.

## E. P4 Template Types

The 15 candidate generation templates used in P4:

| Template | Pattern | Example |
|----------|---------|---------|
| Linear | a*x + b | 2*x1 + 3 |
| Quadratic | a*x^2 + b*x + c | x1^2 + 2*x1 |
| Product | a*x1*x2 | 3*x1*x2 |
| Ratio | a*x1/x2 | x1/(2*x2) |
| Power | a*x^n | x1^3 |
| Sqrt | a*sqrt(x) | sqrt(abs(x1)) |
| Exp | a*exp(b*x) | exp(x1) |
| Log | a*log(abs(x)) | log(abs(x1)) |
| Sin | a*sin(b*x) | sin(x1) |
| Cos | a*cos(b*x) | cos(x1) |
| Mixed 1 | a*x1 + b*x2^2 | x1 + x2^2 |
| Mixed 2 | a*x1*x2 + b*x1 | x1*x2 + x1 |
| Rational | a/(b*x + c) | 1/(x1 + 1) |
| Polynomial | sum(a_i * x^i) | x1^2 + x1 + 1 |
| Correction | base + correction | x1*x2 + x1^2/v^2 |

## F. SymPy Verifier Architecture

The SymPy verifier operates as a Python sidecar with JSON IPC:

```
TypeScript (main)  →  JSON stdin/stdout  →  Python (verifier)
     |                                          |
     |  { task: "equivalence_check",            |
     |    expr1: "x1*x2",                       |
     |    expr2: "x2*x1" }                      |
     |                                          |
     |  ← { result: true,                       |
     |       canonical1: "x1*x2",               |
     |       canonical2: "x1*x2" }              |
```

Supported tasks:
- `equivalence_check`: Symbolic equivalence via SymPy simplification
- `dimension_check`: Dimensional homogeneity verification
- `canonicalize`: Expression canonicalization

## G. Claim Ledger Summary

### Supported Claims

| ID | Claim | Evidence |
|----|-------|----------|
| C1 | P0 algorithmic_infogain reaches oracle-level performance | docs/p0_multiseed_report.md |
| C2 | P0 raw LLM baselines underperform external verifiable search | docs/p0_multiseed_report.md |
| C3 | P1 transfers active search from rule induction to symbolic discovery | docs/artifacts/p1_multi_noise/summary.csv |
| C4 | P1 active_infogain improves symbolic-equivalence robustness under noise | docs/artifacts/p1_multi_noise/summary.csv |
| C5 | P1 remains a symbolic-discovery benchmark, not physical theory discovery | By design |
| P2-C1 | P2 evaluates physics-constrained law rediscovery in controlled settings | docs/artifacts/p2_physics_constrained/report.md |
| P2-C2 | Verifier constraints reject invalid candidates | docs/artifacts/p2_physics_constrained/summary.csv |
| P2-C3 | Simplified LMT model has limitations | docs/artifacts/p2_physics_constrained/summary.csv |
| P3-C1 | P3 tests anomaly-driven theory refinement in a controlled sandbox | docs/artifacts/p3_anomaly_refinement/report.md |
| P3-C2 | Verifier eliminates false positives | docs/artifacts/p3_anomaly_refinement/summary.csv |
| P4-C1 | P4 explores open-ended candidate generation in controlled settings | results/p4_open_ended_search/report.md |
| P4-C2 | LLMs are proposal mechanisms, not final judges | results/p4_open_ended_search/summary.csv |
| P4-C3 | External verification remains necessary | results/p4_open_ended_search/summary.csv |

### Forbidden Claims

| ID | Forbidden Claim |
|----|----------------|
| F1 | The system discovers new physical laws |
| F2 | The system is a complete AI scientist |
| F3 | The system discovers deeper physics |
| F4 | The system surpasses relativity |
| F5 | P2/P3 discover new physics |

## H. Computational Requirements

| Benchmark | Formulas | Baselines | Noise Levels | Seeds | Total Evaluations | Runtime |
|-----------|---------:|----------:|-------------:|------:|------------------:|---------|
| P0 | 48 rules | 6 | 1 | 6 | 1,728 | <1s |
| P1 | 265 | 5 | 4 | 3 | 15,900 | ~2-5min |
| P2 | 29 | 6 | 3 | 3 | 1,566 | ~1-3min |
| P3 | 8 | 7 | 3 | 3 | 504 | ~1-2min |
| P4 | 29 | 6 | 3 | 3 | 1,566 | ~2-5min |

No GPU required. No network access required for algorithmic baselines.
