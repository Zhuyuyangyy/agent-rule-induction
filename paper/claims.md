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
