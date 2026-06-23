# Reproducibility Checklist

Use this checklist to verify that the Active Theory Discovery benchmark suite is reproducible from a clean checkout.

## Environment

- [ ] Node.js >= 18 installed
- [ ] Python >= 3.8 installed (for SymPy verifier, optional)
- [ ] Git installed
- [ ] Internet access for `npm install` (no API keys needed for benchmarks)

## Clone and Install

```bash
git clone https://github.com/Zhuyuyangyy/agent-rule-induction.git
cd agent-rule-induction
git checkout v1.0.0-active-theory-discovery
npm install
```

- [ ] `npm install` completes without errors
- [ ] `node_modules/` exists

## Type Check and Unit Tests

```bash
npm run typecheck
npm test
```

- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm test` passes (all unit tests pass)

## Core Benchmarks

```bash
npm run p1:benchmark:multi-noise
npm run p2:benchmark
npm run p3:benchmark
npm run p4:benchmark
```

- [ ] P1 benchmark completes and writes to `results/p1_multi_noise/`
- [ ] P2 benchmark completes and writes to `results/p2_physics_constrained/`
- [ ] P3 benchmark completes and writes to `results/p3_anomaly_refinement/`
- [ ] P4 benchmark completes and writes to `results/p4_open_ended_search/`

## Artifact Verification

```bash
bash scripts/audit_artifacts.sh
```

- [ ] All P1/P2/P3 tracked artifacts exist in `docs/artifacts/`
- [ ] Final project report exists in `docs/artifacts/final/`
- [ ] P4 runtime results exist (or note that P4 was not run)

## Claim Audit

```bash
bash scripts/audit_claims.sh
```

- [ ] No affirmative forbidden claims found
- [ ] Forbidden phrases only appear in allowed contexts (forbidden lists, negated limitations)

## SymPy Verifier (Optional)

```bash
pip install sympy>=1.12
python -m pytest tools/sympy_verifier/tests -v
npx tsx src/verifier/smokeTest.ts
```

- [ ] All pytest tests pass
- [ ] All TypeScript smoke tests pass

## Quick Reproduce All

```bash
bash scripts/reproduce_core.sh
```

- [ ] Script completes without errors
- [ ] All core benchmark results generated

## Docker (Optional)

```bash
docker build -t atd .
docker run atd
```

- [ ] Docker build succeeds
- [ ] Container runs core benchmarks

## Final Check

- [ ] README.md lists P0/P1/P2/P3/P4 as completed
- [ ] README.md Quick Start includes all benchmark commands
- [ ] No "P2 roadmap only" or similar outdated language in README
- [ ] `docs/artifact_manifest.json` lists all artifacts with claim mappings
- [ ] `paper/reproducibility.md` references `v1.0.0-active-theory-discovery`
