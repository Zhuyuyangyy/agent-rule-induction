# Active Theory Discovery: Final Project Report

## 1. Release Information

- **Current release**: `v2.0.2-publication-consistency`
- **Release commit**: 0197c7a
- **Repository**: https://github.com/Zhuyuyangyy/agent-rule-induction

### Release History

| Stage | Tag | Description |
|-------|-----|-------------|
| Early | `v0.1-p0-p1` | P0/P1 initial release |
| Stage 2 | `v0.2.0-stage2-p1` | P1 paper-grade benchmark |
| Stage 4 | `v0.3.0-stage4-p2` | P2 physics-constrained benchmark |
| Stage 5 | `v0.4.0-stage5-p3` | P3 anomaly-driven benchmark |
| v1.0 | `v1.0.0-active-theory-discovery` | P0-P4 complete suite |
| v2.0 | `v2.0.0-active-theory-discovery-platform` | Full platform with P5, agents, verifier |
| v2.0.1 | `v2.0.1-final-polish` | Markdown readability, report consistency |
| v2.0.2 | `v2.0.2-publication-consistency` | Publication consistency and artifact audit |

## 2. Repository State

All source code, benchmarks, paper drafts, and audit scripts are in the
`main` branch. The repository contains:

- P0-P5 benchmark source code (`src/p0/` through `src/p5/`)
- Multi-agent workflow (`src/agents/`)
- SymPy verifier sidecar (`tools/sympy_verifier/`)
- TypeScript verifier client (`src/verifier/`)
- Paper drafts (`paper/`)
- Archived artifacts (`docs/artifacts/`)
- Audit scripts (`scripts/`)
- Dockerfile and Makefile for reproducibility

## 3. Benchmark Suite P0-P5

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

### P5: Causal Mechanism Discovery

- 8 causal graph configurations, 5 baselines
- Active intervention selection improves graph recovery over random baselines
- Structural Hamming Distance (SHD) as primary metric
- Known limitation: small graph sizes (3-6 nodes)

## 4. Artifact Manifest

All benchmark artifacts are archived in `docs/artifacts/`:

| Benchmark | Report | Summary CSV | Failure Cases |
|-----------|--------|-------------|---------------|
| P1 | `docs/artifacts/p1_multi_noise/report.md` | `docs/artifacts/p1_multi_noise/summary.csv` | `docs/artifacts/p1_multi_noise/failure_cases.jsonl` |
| P2 | `docs/artifacts/p2_physics_constrained/report.md` | `docs/artifacts/p2_physics_constrained/summary.csv` | `docs/artifacts/p2_physics_constrained/failure_cases.jsonl` |
| P3 | `docs/artifacts/p3_anomaly_refinement/report.md` | `docs/artifacts/p3_anomaly_refinement/summary.csv` | `docs/artifacts/p3_anomaly_refinement/failure_cases.jsonl` |
| P4 | `docs/artifacts/p4_open_ended_search/report.md` | `docs/artifacts/p4_open_ended_search/summary.csv` | `docs/artifacts/p4_open_ended_search/failure_cases.jsonl` |
| P5 | `docs/artifacts/p5_causal_mechanism/report.md` | `docs/artifacts/p5_causal_mechanism/summary.csv` | `docs/artifacts/p5_causal_mechanism/failure_cases.jsonl` |

Machine-readable manifest: `docs/artifact_manifest.json`

## 5. Reproduction Commands

```bash
git clone https://github.com/Zhuyuyangyy/agent-rule-induction.git
cd agent-rule-induction
npm install
npm run typecheck
npm test
npm run p1:benchmark:multi-noise
npm run p2:benchmark
npm run p3:benchmark
npm run p4:benchmark
npm run p5:benchmark
```

All benchmarks are algorithmic and require no API keys.

## 6. Supported Claims

1. External verifiable search outperforms raw LLM reasoning in controlled
   settings
2. Active infogain degrades more gracefully under noise than alternatives
3. Verifier constraints reject invalid candidates and eliminate false positives
4. LLM candidate generation requires external verification
5. Active intervention selection improves causal graph recovery

## 7. Unsupported Claims (Explicitly Forbidden)

1. The system discovers new physical laws
2. The system is a complete AI scientist
3. The system surpasses relativity
4. The system has solved open-ended scientific discovery
5. P2/P3/P5 discover new physics

## 8. Limitations

1. Fixed hypothesis spaces — all benchmarks search within known candidate sets
2. Synthetic/controlled benchmark setting — no real experimental data
3. Single-model LLM validation (deepseek-chat only)
4. No physical law discovery claim
5. P4 uses simulated LLM proposals, not real LLM API calls
6. Simplified L,M,T dimension model fails for EM/thermo formulas (6/29)
7. SymPy verifier is not used in P0/P1 (numerical scoring only);
   integrated in P2/P3/P4
8. P5 causal graphs are small (3-6 nodes) and synthetically generated

## 9. Audit Results

| Check | Command | Status |
|-------|---------|--------|
| TypeScript | `npm run typecheck` | PASS |
| Unit tests | `npm test` | PASS |
| Claim audit | `npm run audit:claims` | PASS |
| Artifact audit | `npm run audit:artifacts` | PASS |
| Release consistency | `npm run audit:release` | PASS |
| Markdown readability | `npm run audit:markdown` | PASS |

## 10. Future Work

1. Extended dimension system (Q for charge, Θ for temperature)
2. Real LLM API integration for P4
3. Real experimental data benchmarks
4. Cross-model LLM validation
5. More complex anomaly scenarios
6. MDL/complexity-based scoring
7. GitHub Actions CI for automated audit
