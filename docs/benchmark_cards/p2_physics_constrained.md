# P2: Physics-Constrained Law Rediscovery

## Task
Discover a physics formula from 29 candidates with dimensional verification.

## Hypothesis Space
29 physics formulas: mechanics (6), gravitation (4), electromagnetism (5), thermodynamics (3), waves (4), relativity (4), quantum (3). Each annotated with dimensional information.

## Baselines
| Baseline | Description |
|----------|-------------|
| random_search | Randomly select a formula |
| greedy_symbolic_search | Evaluate on fixed query points |
| active_random | Query at random points, filter |
| active_infogain | Query at max-variance points, filter |
| active_infogain_plus_verifier | active_infogain with dimensional verification |
| oracle | Always return correct formula |

## Metrics
- Symbolic equivalence rate
- Verifier rejection rate
- Dimensional validity

## Artifacts
- `docs/artifacts/p2_physics_constrained/report.md`
- `docs/artifacts/p2_physics_constrained/summary.csv`
- `docs/artifacts/p2_physics_constrained/failure_cases.jsonl`

## Supported Claims
- P2 evaluates physics-constrained law rediscovery in controlled settings
- Verifier constraints reject 87.5% of invalid candidates
- Simplified LMT model has limitations (6/29 formulas fail)

## Unsupported Claims
- P2 discovers new physical laws
- P2 works for all physics formulas (simplified dimension model)

## Known Failure Modes
- Simplified L,M,T dimension model fails for EM/thermo formulas (6/29)
- Smaller hypothesis space makes active querying less critical
