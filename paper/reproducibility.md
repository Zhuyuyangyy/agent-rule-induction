# Reproducibility

## Repository

- **URL**: https://github.com/Zhuyuyangyy/agent-rule-induction
- **Release tag**: `v0.2.0-stage2-p1`
- **Release page**: https://github.com/Zhuyuyangyy/agent-rule-induction/releases/tag/v0.2.0-stage2-p1

## Environment

- Node.js >= 18
- TypeScript 5.x
- Dependencies: openai, https-proxy-agent

## Reproduction Steps

```bash
git clone https://github.com/Zhuyuyangyy/agent-rule-induction.git
cd agent-rule-induction
git checkout v0.2.0-stage2-p1
npm install
```

### P0 Verification

```bash
npm run typecheck    # TypeScript type checking
npm test             # P0 unit tests (rules, env, task generation)
```

### P1 Benchmark Reproduction

```bash
npm run p1:benchmark              # noise=0, 3 seeds
npm run p1:benchmark:noisy        # noise=0.05, 3 seeds
npm run p1:benchmark:multi-noise  # noise=0,0.01,0.05,0.1, 3 seeds
```

Expected runtime: ~2-5 minutes per benchmark command on a standard machine.

**Important**: P1 benchmark reproduction requires no API keys. All algorithmic baselines run locally and deterministically.

## Artifact Paths

All artifacts are git-tracked and available under the release tag:

```text
docs/artifacts/p1_multi_noise/report.md          # Full benchmark report
docs/artifacts/p1_multi_noise/summary.csv         # Per-baseline, per-noise metrics
docs/artifacts/p1_multi_noise/failure_cases.jsonl  # Individual failure cases
```

Additional documentation:

```text
docs/p0_multiseed_report.md      # P0 multi-seed results
docs/p1_prototype.md             # P1 prototype report
docs/p1_failure_analysis.md      # P1 failure analysis
docs/failure_analysis.md         # P0 failure analysis
```

## Known Blockers

- **Stage 1.2 multi-model validation**: blocked by unavailable API keys. Only deepseek-chat is currently available. Cross-model generalization requires gpt-4.1-mini, Claude, Qwen, or Kimi keys.
- **LLM experiment reproduction**: requires a valid DeepSeek API key set in environment. Algorithmic baselines (the main evidence) require no API key and are fully reproducible.

## No Hidden Dependencies

P1 benchmark reproduction has no hidden dependency on unavailable API keys. All five baselines (random_search, greedy_symbolic_search, active_random, active_infogain, oracle) are algorithmic and run entirely locally. The only external dependency is Node.js and npm packages.

## SymPy Verifier Reproduction

The SymPy verifier prototype is **not part of the P0/P1 benchmark results** but can be independently verified:

```bash
# Install SymPy
pip install sympy>=1.12

# Run CLI examples
python tools/sympy_verifier/verify_expr.py tools/sympy_verifier/examples/equivalence_pass.json
python tools/sympy_verifier/verify_expr.py tools/sympy_verifier/examples/equivalence_fail.json
python tools/sympy_verifier/verify_expr.py tools/sympy_verifier/examples/dimension_pass.json
python tools/sympy_verifier/verify_expr.py tools/sympy_verifier/examples/dimension_fail.json

# Run pytest tests
python -m pytest tools/sympy_verifier/tests -v

# Run TypeScript smoke test
npx tsx src/verifier/smokeTest.ts
```

The verifier is future infrastructure for P2/P3. It does not affect P0/P1 results.

## P2 Benchmark Reproduction

```bash
npm run p2:benchmark
```

Expected runtime: ~1-3 minutes. No API keys required. All 6 baselines are algorithmic.

### P2 Artifact Paths

```text
docs/artifacts/p2_physics_constrained/report.md          # Full benchmark report
docs/artifacts/p2_physics_constrained/summary.csv         # Per-baseline, per-noise metrics
docs/artifacts/p2_physics_constrained/failure_cases.jsonl  # Individual failure cases
```

## Computational Requirements

- P0 algorithmic baselines: deterministic, no API calls, <1 second
- P1 benchmarks: 265 formulas x 5 baselines x 4 noise levels x 3 seeds = 15,900 evaluations
- No GPU required
- No network access required for algorithmic baselines
