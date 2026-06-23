# Known Limitations

This document consolidates all known limitations of the Active Theory Discovery framework.

## Structural Limitations

1. **Fixed hypothesis spaces (P0-P3)**: The correct answer is guaranteed to be in the candidate set. Real discovery involves open-ended search where the true hypothesis may not be in the initial set.

2. **Synthetic/controlled benchmark setting**: All evaluations use synthetically generated data from known formulas with controlled noise. No real experimental data is used.

3. **No physical law discovery claim**: The system identifies which pre-defined expression best matches the target. This is search, not discovery.

4. **No open-ended theory generation (P0-P3)**: The system cannot propose hypotheses outside the pre-defined library. P4/P5 begin to address this but with limited coverage.

## Methodological Limitations

5. **Single-model LLM validation**: LLM baselines are tested on deepseek-chat only. Cross-model generalization is blocked by unavailable API keys.

6. **SymPy verifier not used in P0/P1**: The verifier is integrated into P2/P3/P4 but not in P0/P1, which use numerical scoring only.

7. **Simplified L,M,T dimension model**: P2 uses a simplified dimension system that cannot capture EM or thermodynamic dimensions. 6/29 P2 formulas fail the dimensional validity check.

8. **P4 uses simulated LLM proposals**: Real LLM behavior may differ significantly from template-based simulation.

9. **Noise model simplification**: Only additive Gaussian noise is used. Real-world noise may be heteroscedastic, systematic, or non-Gaussian.

10. **Budget constraints**: P0 uses 6 queries, P1 uses 10. These are arbitrary but reasonable choices.

## Benchmark-Specific Limitations

11. **P1 classic formula ambiguity**: Some classic physics formulas are numerically indistinguishable (e.g., F=ma and p=mv both compute x1*x2).

12. **P2 small hypothesis space**: With only 29 candidates, even non-active methods achieve high performance.

13. **P3 synthetic anomalies**: All anomalies are planted, not discovered from real data.

14. **P5 graph size**: Causal graphs are limited to 5-8 nodes. Real-world causal structures are typically much larger.

## What These Limitations Mean

These limitations define the boundary of what the benchmarks can support. Results should be interpreted as:

- Evidence for the Active Theory Discovery thesis in controlled settings
- NOT evidence for autonomous scientific discovery
- NOT evidence for new physical law discovery
- NOT evidence that the system works on real experimental data

## Future Work to Address Limitations

- Extended dimension system (Q for charge, Theta for temperature)
- Real LLM API integration for P4
- Real experimental data benchmarks
- Cross-model LLM validation
- Larger hypothesis spaces
- More complex noise models
- Causal discovery with larger graphs and real data
