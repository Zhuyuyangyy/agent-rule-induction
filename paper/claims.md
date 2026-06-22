# Claims Ledger

Every claim in this paper must be grounded in evidence. Claims without evidence are forbidden.

## Supported Claims

| # | Claim | Evidence | Status | Allowed Wording | Forbidden Wording |
|---|-------|----------|--------|-----------------|-------------------|
| C1 | P0 shows external algorithmic infogain reaches oracle-level performance | `docs/p0_multiseed_report.md`: algorithmic_infogain = 100.0% [100%, 100%] across 6 seeds | **supported** | "algorithmic_infogain reaches oracle_version_space accuracy in the P0 rule induction benchmark" | "the system achieves perfect knowledge" |
| C2 | P0 shows raw LLM baselines underperform external verifiable search | `docs/p0_multiseed_report.md`: llm_passive 3.6%, llm_active 13.2%, llm_scaffold 21.0% vs algorithmic_infogain 100.0% | **supported** | "LLM baselines consistently underperform algorithmic infogain in P0" | "LLMs cannot reason at all" |
| C3 | P1 extends the mechanism from rule induction to symbolic discovery | `docs/artifacts/p1_multi_noise/summary.csv`: active_infogain achieves 98.5% SymEq at noise=0 | **supported** | "the active infogain mechanism transfers from boolean rule induction to symbolic expression discovery" | "the mechanism works universally for all discovery tasks" |
| C4 | P1 active_infogain improves symbolic-equivalence robustness under noisy conditions | `docs/artifacts/p1_multi_noise/summary.csv`: active_infogain SymEq=96.2% vs greedy 95.5% at noise=0.1; active_infogain SymEq drop from noise=0 to 0.1 is 2.3pp vs greedy 2.7pp vs active_random 5.7pp | **supported** | "active_infogain shows more graceful degradation under noise compared to random-query baselines" | "active_infogain is noise-proof" |
| C5 | P1 remains a symbolic-discovery benchmark, not physical theory discovery | By design: P1 uses a fixed formula library of known expressions | **supported** | "P1 is a controlled symbolic-discovery benchmark" | "P1 discovers new physical laws" |
| C6 | Cross-model LLM validation remains blocked | `docs/p0_multiseed_report.md`: only deepseek-chat available | **supported** | "LLM baselines are validated on deepseek-chat only; cross-model generalization is deferred" | "LLMs of all types fail" |

## Partially Supported Claims

| # | Claim | Evidence | Status | Caveat |
|---|-------|----------|--------|--------|
| C7 | active_infogain uses fewer queries than greedy | `docs/artifacts/p1_multi_noise/summary.csv`: avg 4.4-6.5 vs 10 | **partially supported** | Query count advantage is clear, but greedy uses all budget by design |

## Unsupported / Forbidden Claims

| # | Claim | Evidence | Status | Reason |
|---|-------|----------|--------|--------|
| F1 | P1 discovers new physical laws | none | **forbidden** | P1 matches against a known formula library |
| F2 | AI scientist is complete | none | **forbidden** | This is a benchmark paper, not an autonomous scientist |
| F3 | The system discovers deeper physics | none | **forbidden** | No physics discovery has been demonstrated |
| F4 | The system surpasses relativity | none | **forbidden** | Absurd and unsupported |
| F5 | LLMs cannot do scientific reasoning | none | **forbidden** | Overgeneralization from P0/P1 controlled settings |

## Claim Audit Rule

Before any sentence enters the paper draft, check:
1. Does it match a supported claim above?
2. If partially supported, is the caveat stated?
3. If it matches a forbidden claim, delete it immediately.
