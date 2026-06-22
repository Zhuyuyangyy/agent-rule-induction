# Reproducibility

## Repository

- URL: https://github.com/Zhuyuyangyy/agent-rule-induction
- Release tag: `v0.2.0-stage2-p1`
- Release page: https://github.com/Zhuyuyangyy/agent-rule-induction/releases/tag/v0.2.0-stage2-p1

## Environment

- Node.js >= 18
- TypeScript 5.x
- Dependencies: openai, https-proxy-agent

## Reproduction Steps

```bash
git clone https://github.com/Zhuyangyy/agent-rule-induction.git
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

## Computational Requirements

- P0 algorithmic baselines: deterministic, no API calls, <1 second
- P1 benchmarks: 265 formulas x 5 baselines x 4 noise levels x 3 seeds = 15,900 evaluations
- No GPU required
- No network access required for algorithmic baselines
