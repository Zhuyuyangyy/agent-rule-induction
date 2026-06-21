# Release Notes — v0.1-p0-p1

## Completed

### P0 Rule Induction Benchmark
- 100 tasks, seed=42, 6 conditions
- `algorithmic_infogain` reaches `oracle_version_space` upper bound (100% accuracy, 3.34 avg queries)
- `algorithmic_random_query` significantly worse (62%, p<0.0001, d=0.779)
- LLM agents underperform: `llm_active` 17%, `llm_passive` 4%, `llm_scaffold` 27%
- Full failure type breakdown (8 categories)
- JSONL + manifest(SHA256) + report.md + summary.csv + failure_cases.jsonl

### P1 Symbolic Discovery Prototype (Experimental)
- Symbolic expression DSL: Const/Var/BinOp(+,-,*,/,^)/Func(sin,cos,sqrt,abs,log)
- 60 synthetic formulas (anti-memorization) + 10 classic formulas (demo only)
- 5 baselines: random_search, greedy_symbolic_search, active_random, active_infogain, oracle
- Genuine active-infogain (variance-maximizing query selection, not greedy masquerading)
- Key finding: active-infogain robust under noise (eqRate 0.5857 vs greedy 0.0143 at noise=0.05)
- Clean + noisy benchmark reports

### Infrastructure
- API safety: native fetch fallback, no key leakage verified
- .env.example, .gitignore for .env
- docs/p0_benchmark.md, docs/p1_prototype.md, docs/theory-score.md, docs/modules.md
- TheoryScore: P0/P1 computable definitions, full 7-term formula reserved for P2+

## Not Claimed
- No final theory discovery
- No physical-law discovery yet
- No relativity/quantum unification
- P1 is experimental prototype, not completed stage
- P2–P4 are roadmap only, not implemented

## Main Conclusion
> Algorithmic Active-InfoGain reaches the Oracle upper bound in P0, while LLM agents underperform. This supports the need for external verifiable search mechanisms rather than relying on raw LLM reasoning.
