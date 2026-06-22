# Active Theory Discovery: Final Project Report

## Project Summary

Active Theory Discovery provides a controlled, reproducible benchmark suite showing that external verifiable active search mechanisms can improve rule induction, symbolic discovery, physics-constrained rediscovery, and anomaly-driven refinement under bounded settings.

## Release Tags

| Stage | Tag | Description |
|-------|-----|-------------|
| Stage 2 | `v0.2.0-stage2-p1` | P1 paper-grade benchmark |
| Stage 4 | `v0.3.0-stage4-p2` | P2 physics-constrained benchmark |
| Stage 5 | `v0.4.0-stage5-p3` | P3 anomaly-driven benchmark |
| Final | `v1.0.0-active-theory-discovery` | Complete benchmark suite |

## Artifact Paths

```
docs/artifacts/p1_multi_noise/           — P1 multi-noise results
docs/artifacts/p2_physics_constrained/   — P2 physics-constrained results
docs/artifacts/p3_anomaly_refinement/    — P3 anomaly-driven results
results/p4_open_ended_search/            — P4 open-ended search results
```

## Benchmark Summary

### P0: Rule Induction
- 48 candidate rules, 6 conditions
- algorithmic_infogain: 100.0% accuracy (oracle-level)
- LLM baselines: 3.6%-21.0%

### P1: Symbolic Expression Discovery
- 265 formulas, 5 baselines, 4 noise levels
- active_infogain: 98.5% SymEq at noise=0, 96.2% at noise=0.1
- Graceful noise degradation (-2.3pp vs -5.7pp for active_random)

### P2: Physics-Constrained Law Rediscovery
- 29 physics formulas with dimensional annotations, 6 baselines
- Verifier rejects 87.5% of invalid candidates
- 100% SymEq at noise=0 for non-random baselines
- Known limitation: simplified LMT model fails for EM/thermo

### P3: Anomaly-Driven Theory Refinement
- 8 scenarios (6 planted + 2 null), 7 correction families, 7 baselines
- Active methods recover 75-100% of planted corrections
- Verifier eliminates false positives (0% FP rate)

### P4: Open-Ended Active Theory Search (Prototype)
- Template-based simulated LLM, 15 templates, 6 baselines
- Parse success ~88%, hallucination rate ~11-14%
- LLM-based recovery ~23% vs library-based 100%
- LLMs are proposal mechanisms, not final judges

## Supported Claims

1. External verifiable search outperforms raw LLM reasoning in controlled settings
2. Active infogain degrades more gracefully under noise than alternatives
3. Verifier constraints reject invalid candidates and eliminate false positives
4. LLM candidate generation requires external verification

## Unsupported Claims (Explicitly Forbidden)

1. The system discovers new physical laws
2. The system is a complete AI scientist
3. The system surpasses relativity
4. The system has solved open-ended scientific discovery
5. P2/P3 discover new physics

## Known Blockers

1. Stage 1.2 multi-model validation blocked by unavailable API keys
2. P4 uses simulated LLM proposals, not real LLM API calls
3. Simplified LMT dimension model fails for EM/thermo formulas

## Future Work

1. Extended dimension system (Q for charge, Θ for temperature)
2. Real LLM API integration for P4
3. Real experimental data benchmarks
4. Cross-model LLM validation
5. More complex anomaly scenarios
6. MDL/complexity-based scoring

## Full Audit Log

| Stage | Commit | Gate | Status |
|-------|--------|------|--------|
| 2.5-A | 7f58c3d | PASS | SymPy verifier design doc |
| 2.5-B | e49eb8c | PASS | Minimal SymPy verifier prototype |
| 2.5-C | 48584aa | PASS | TypeScript IPC adapter |
| 3.7 | 791e2bf | PASS | Paper update for verifier |
| 4 / P2 | 1312aa7 | PASS | Physics-constrained benchmark |
| 4.5 | 5bae37c | PASS | P2 artifact audit |
| 5 / P3 | 178f8fd | PASS | Anomaly-driven benchmark |
| 5.5 | 0180cb0 | PASS | P3 artifact audit |
| 6 / P4 | 16a15ca | PASS | Open-ended search prototype |
| 6.5 | (pending) | — | Final release |
