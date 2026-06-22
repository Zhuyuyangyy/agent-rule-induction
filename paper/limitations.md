# Limitations

This is a controlled benchmark paper. The following limitations define the boundary of our claims.

## L1: Fixed Hypothesis Spaces

Both P0 and P1 assume a fixed, known hypothesis space (48 boolean rules, 265 symbolic formulas). Real scientific discovery involves open-ended hypothesis generation, where the true hypothesis may not be in the initial candidate set. This benchmark measures search within a known space, not discovery of genuinely novel hypotheses.

## L2: Synthetic Benchmark Limitation

P1 uses 245 synthetic formulas as primary evidence and 20 classic physics formulas as illustrative demos only. The classic formulas are not treated as evidence of physical law discovery. This design avoids LLM memorization contamination but limits ecological validity.

## L3: Single-Model LLM Validation

LLM baselines in P0 are tested exclusively on deepseek-chat. Cross-model generalization (GPT-4.1-mini, Claude, Qwen, Kimi) is blocked by unavailable API keys. The P0 finding that LLM baselines underperform algorithmic infogain may not generalize to all LLM architectures, though the structural argument (external verifiable search vs. free-form reasoning) is model-agnostic.

## L4: No Physical Law Discovery Claim

P1 matches against a known formula library. It does not discover new physical laws. The system identifies which pre-defined expression best matches the target, which is search, not discovery.

## L5: No Open-Ended Theory Generation Yet

The system cannot propose hypotheses outside the pre-defined library. In real science, hypothesis generation is a critical creative step. Our framework currently assumes this step is solved externally.

## L6: No SymPy Verifier Yet

Symbolic equivalence is checked numerically (R^2 on test points), not structurally. Two expressions may have high R^2 but be symbolically different (e.g., |x-1| vs x-1 for x>1). A SymPy-based verifier would strengthen equivalence claims by checking structural equivalence, dimensional homogeneity, and limit behavior. This is planned future work.

## L7: No Real-World Anomaly-Driven Physics Benchmark Yet

No experiments use real experimental data. All evaluations use synthetically generated data from known formulas with controlled noise. P2 (physical law recovery) will address this but has not been started.

## L8: Noise Model Simplification

P1 uses additive Gaussian noise as the only noise model. Real-world noise may be heteroscedastic, systematic, or non-Gaussian. The robustness finding under Gaussian noise may not transfer to more complex noise regimes.

## L9: Budget Constraint

P0 uses a budget of 6 queries; P1 uses 10 queries. These are arbitrary but reasonable choices. The relative ranking of baselines may change with different budgets, though the core finding (algorithmic infogain outperforms random) is expected to hold.

## L10: No LLM Baselines in P1

P1 includes only algorithmic baselines (random_search, greedy_symbolic_search, active_random, active_infogain, oracle). LLM baselines for P1 symbolic discovery would require a different experimental setup (e.g., LLM generating candidate expressions) and are deferred to future work.

## L11: Classic Formula Ambiguity

Some classic physics formulas are numerically indistinguishable in the P1 setup (e.g., F=ma and p=mv both compute x1*x2). This limits the maximum achievable symbolic equivalence rate for these formulas and is a known artifact of the benchmark design, not a failure of the search mechanism.
