# Claims Ledger

Every claim in this paper must be grounded in evidence.
Claims without evidence are forbidden.

## Supported Claims

### C1: P0 algorithmic_infogain reaches oracle-level performance

- **Claim**: P0 shows external algorithmic infogain reaches oracle-level performance
- **Evidence**: `docs/p0_multiseed_report.md` — algorithmic_infogain = 100.0% [100%, 100%] across 6 seeds
- **Status**: supported
- **Allowed wording**: "algorithmic_infogain reaches oracle_version_space accuracy in the P0 rule induction benchmark"
- **Forbidden wording**: "the system achieves perfect knowledge"

### C2: P0 raw LLM baselines underperform external verifiable search

- **Claim**: P0 shows raw LLM baselines underperform external verifiable search
- **Evidence**: `docs/p0_multiseed_report.md` — llm_passive 3.6%, llm_active 13.2%, llm_scaffold 21.0% vs algorithmic_infogain 100.0%
- **Status**: supported
- **Allowed wording**: "LLM baselines consistently underperform algorithmic infogain in P0"
- **Forbidden wording**: "LLMs cannot reason at all"

### C3: P1 transfers active search from rule induction to symbolic discovery

- **Claim**: P1 extends the mechanism from rule induction to symbolic discovery
- **Evidence**: `docs/artifacts/p1_multi_noise/summary.csv` — active_infogain achieves 98.5% SymEq at noise=0
- **Status**: supported
- **Allowed wording**: "the active infogain mechanism transfers from boolean rule induction to symbolic expression discovery"
- **Forbidden wording**: "the mechanism works universally for all discovery tasks"

### C4: P1 active_infogain improves symbolic-equivalence robustness under noisy conditions

- **Claim**: P1 active_infogain improves symbolic-equivalence robustness under noisy conditions
- **Evidence**: `docs/artifacts/p1_multi_noise/summary.csv` — active_infogain SymEq=96.2% vs greedy 95.5% at noise=0.1; SymEq drop from noise=0 to 0.1 is 2.3pp vs greedy 2.7pp vs active_random 5.7pp
- **Status**: supported
- **Allowed wording**: "active_infogain shows more graceful degradation under noise compared to random-query baselines"
- **Forbidden wording**: "active_infogain is noise-proof"

### C5: P1 remains a symbolic-discovery benchmark, not physical theory discovery

- **Claim**: P1 remains a symbolic-discovery benchmark, not physical theory discovery
- **Evidence**: By design — P1 uses a fixed formula library of known expressions
- **Status**: supported
- **Allowed wording**: "P1 is a controlled symbolic-discovery benchmark"
- **Forbidden wording**: "P1 discovers new physical laws"

### C6: Stage 1.2 cross-model validation remains blocked by unavailable API keys

- **Claim**: Cross-model LLM validation remains blocked
- **Evidence**: `docs/p0_multiseed_report.md` — only deepseek-chat available
- **Status**: supported
- **Allowed wording**: "LLM baselines are validated on deepseek-chat only; cross-model generalization is deferred"
- **Forbidden wording**: "LLMs of all types fail"

## Partially Supported Claims

### C7: active_infogain uses fewer queries than greedy

- **Claim**: active_infogain uses fewer queries than greedy
- **Evidence**: `docs/artifacts/p1_multi_noise/summary.csv` — avg 4.4-6.5 vs 10
- **Status**: partially supported
- **Caveat**: Query count advantage is clear, but greedy uses all budget by design

## Unsupported / Forbidden Claims

### F1: P1 discovers new physical laws

- **Evidence**: none
- **Status**: forbidden
- **Reason**: P1 matches against a known formula library

### F2: AI scientist is complete

- **Evidence**: none
- **Status**: forbidden
- **Reason**: This is a benchmark paper, not an autonomous scientist

### F3: The system discovers deeper physics

- **Evidence**: none
- **Status**: forbidden
- **Reason**: No physics discovery has been demonstrated

### F4: The system surpasses relativity

- **Evidence**: none
- **Status**: forbidden
- **Reason**: Absurd and unsupported

### F5: LLMs cannot do scientific reasoning in general

- **Evidence**: none
- **Status**: forbidden
- **Reason**: Overgeneralization from P0/P1 controlled settings; we only show LLMs underperform in these specific benchmarks

## Claim Audit Rule

Before any sentence enters the paper draft, check:

1. Does it match a supported claim above?
2. If partially supported, is the caveat stated?
3. If it matches a forbidden claim, delete it immediately.

## Verifier Claims

### V1: SymPy verifier prototype exists but is not part of P0/P1 results

- **Claim**: A SymPy verifier prototype has been implemented with symbolic equivalence and dimensional homogeneity checks, plus a TypeScript IPC adapter
- **Evidence**: `tools/sympy_verifier/verify_expr.py`, `src/verifier/verifierClient.ts`, 6/6 pytest tests pass, 6/6 smoke tests pass
- **Status**: supported (prototype exists)
- **Allowed wording**: "A SymPy verifier prototype exists as future infrastructure for P2/P3"
- **Forbidden wording**: "The verifier was used in P0/P1 benchmark results"

### V2: Verifier is future infrastructure for P2/P3

- **Claim**: The verifier is designed for P2/P3 integration, not for P0/P1
- **Evidence**: By design — verifier is not called from any P0/P1 benchmark code
- **Status**: supported
- **Allowed wording**: "The SymPy verifier is future infrastructure for physics-constrained benchmarks"
- **Forbidden wording**: "The verifier improves P1 results"

## P2 Claims

### P2-C1: P2 evaluates physics-constrained law rediscovery in controlled settings

- **Claim**: P2 tests law rediscovery with dimensional constraints in a controlled sandbox
- **Evidence**: `docs/artifacts/p2_physics_constrained/report.md` — 29 formulas, 6 baselines, 3 noise levels
- **Status**: supported
- **Allowed wording**: "P2 evaluates physics-constrained law rediscovery in controlled settings"
- **Forbidden wording**: "P2 discovers new physics"

### P2-C2: Verifier constraints reject invalid candidates

- **Claim**: Output dimension matching rejects 87.5% of candidates
- **Evidence**: `docs/artifacts/p2_physics_constrained/summary.csv` — verifierRejectionRate=0.875
- **Status**: supported
- **Allowed wording**: "Verifier constraints improve rejection of invalid symbolic candidates"
- **Forbidden wording**: "P2 surpasses known physics"

### P2-C3: Simplified LMT model has limitations

- **Claim**: The simplified L,M,T dimension model fails for electromagnetism and thermodynamic formulas
- **Evidence**: DimValid Rate = 79.3% (23/29 formulas pass); EM formulas use simplified current dimension
- **Status**: supported (limitation)
- **Allowed wording**: "The simplified dimension model is a known limitation"
- **Forbidden wording**: "The dimension model is complete"
