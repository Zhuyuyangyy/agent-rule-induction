# P4: Open-Ended Active Theory Search

## Task
Generate and verify candidate expressions via template-based simulated LLM proposals.

## Hypothesis Space
15 template-generated expressions. Not pre-defined — candidates are generated dynamically.

## Baselines
| Baseline | Description |
|----------|-------------|
| random_search | Randomly select from generated candidates |
| greedy_search | Evaluate all generated candidates |
| active_random | Query at random points, filter generated candidates |
| active_infogain | Query at max-variance points, filter |
| active_infogain_plus_verifier | active_infogain with verifier filter |
| library_search | Search within known formula library (upper bound) |

## Metrics
- Parse success rate
- Hallucination rate
- Correction recovery rate
- Average queries used

## Artifacts
- Generated at runtime in `results/p4_open_ended_search/`
- Not tracked in `docs/artifacts/`

## Supported Claims
- P4 explores open-ended candidate generation in controlled settings
- LLMs are proposal mechanisms, not final judges
- External verification remains necessary

## Unsupported Claims
- P4 demonstrates autonomous scientific discovery
- P4 results generalize to real LLM behavior (uses simulated templates)

## Known Failure Modes
- Candidate generation gap: correct formula often not among generated candidates
- Parse failures (~12%)
- Hallucinations (~11-14%)
