# Reviewer Guide

This guide helps external reviewers understand what the Active Theory Discovery project claims and does not claim.

## What This Project Is

A controlled, reproducible benchmark suite showing that external verifiable search mechanisms outperform raw LLM reasoning in theory discovery tasks. The project provides five benchmarks (P0-P4) plus a causal mechanism benchmark (P5), a SymPy verifier sidecar, and a multi-agent scientific workflow.

## What This Project Is NOT

- It does NOT discover new physical laws
- It does NOT complete "AI scientist"
- It does NOT demonstrate deeper physics understanding
- P2/P3/P4/P5 remain controlled benchmark settings, not real discovery

## How to Evaluate

### 1. Reproduce Core Results

```bash
git clone https://github.com/Zhuyuyangyy/agent-rule-induction.git
cd agent-rule-induction
npm install
npm run reproduce:core
```

### 2. Check Claim Boundaries

```bash
npm run audit:claims
```

This script searches for forbidden claim patterns and verifies they only appear in allowed contexts.

### 3. Verify Artifact Integrity

```bash
npm run audit:artifacts
```

This script checks that all declared artifact paths exist.

### 4. Run Individual Benchmarks

```bash
npm run p1:benchmark:multi-noise   # P1: symbolic discovery
npm run p2:benchmark               # P2: physics-constrained rediscovery
npm run p3:benchmark               # P3: anomaly-driven refinement
npm run p4:benchmark               # P4: open-ended search
npm run p5:benchmark               # P5: causal mechanism discovery
```

### 5. Read the Paper

The submission draft is at `paper/main.md` with appendix at `paper/appendix.md`.

## Key Files for Review

| File | Purpose |
|------|---------|
| `README.md` | Project overview and status |
| `paper/main.md` | Full submission draft |
| `paper/claims.md` | Claims ledger with evidence grounding |
| `paper/limitations.md` | Extended limitation discussion |
| `paper/reproducibility.md` | Full reproducibility protocol |
| `docs/artifact_manifest.json` | Machine-readable artifact registry |
| `docs/reproducibility_checklist.md` | Step-by-step checklist |
| `docs/benchmark_cards/` | Per-benchmark documentation |
| `docs/final_project_report.md` | Final project report |

## Supported vs Unsupported Claims

### Supported

1. External verifiable search outperforms raw LLM reasoning in controlled settings
2. Active infogain degrades more gracefully under noise
3. Verifier constraints reject invalid candidates and eliminate false positives
4. LLM candidate generation requires external verification
5. Active querying and verification are complementary

### Unsupported (Forbidden)

1. The system discovers new physical laws
2. The system is a complete AI scientist
3. The system surpasses relativity
4. The system has solved open-ended scientific discovery
5. P2/P3/P4/P5 discover new physics or real-world causal structure

## Release Tags

| Tag | Description |
|-----|-------------|
| `v0.1-p0-p1` | P0/P1 initial release |
| `v0.2.0-stage2-p1` | P1 paper-grade benchmark |
| `v0.3.0-stage4-p2` | P2 physics-constrained benchmark |
| `v0.4.0-stage5-p3` | P3 anomaly-driven benchmark |
| `v1.0.0-active-theory-discovery` | Complete P0-P4 suite |
