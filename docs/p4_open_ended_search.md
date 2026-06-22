# P4: Open-Ended Active Theory Search Prototype

## Purpose

P4 explores open-ended candidate generation in controlled settings. LLMs (simulated via templates) propose candidate symbolic corrections or formulas, but hard verifiers and benchmarks judge them. External verification remains necessary.

## Design

- **Candidate generation**: Template-based simulated LLM with 15 templates
- **Parsing**: Recursive descent parser converts strings to SymExpr
- **Verification**: Dimensional validity filter rejects invalid candidates
- **Active search**: Max-variance query selection narrows candidate set

## Claim Boundary

**Allowed**:
- P4 explores open-ended candidate generation in controlled settings.
- LLMs are used as proposal mechanisms, not final judges.
- External verification remains necessary.

**Forbidden**:
- The system autonomously discovers new physics.
- The system is a complete AI scientist.
- The system has solved open-ended scientific discovery.

## Reproduction

```bash
npm run p4:benchmark
```
