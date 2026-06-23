# P5: Causal Mechanism Discovery

## Task
Given simulated causal systems, infer causal structure and choose informative interventions.

## Hypothesis Space
8 graph configurations: 5-8 nodes x 2 density levels. Random DAGs with linear/nonlinear/threshold/interaction mechanisms.

## Baselines
| Baseline | Description |
|----------|-------------|
| random_graph_search | Randomly generate graphs and score them |
| greedy_fit | Greedily add edges that improve fit |
| active_random_intervention | Randomly choose interventions |
| active_infogain_intervention | Choose interventions that maximize information gain |
| oracle_graph | Knows the true graph (upper bound) |

## Metrics
- Causal graph accuracy (precision/recall/F1/SHD)
- Intervention prediction accuracy (R^2)
- Counterfactual accuracy
- Mechanism compression
- Query cost
- Oracle gap

## Artifacts
- Generated at runtime in `results/p5_causal_mechanism/`

## Supported Claims
- P5 evaluates causal mechanism discovery in controlled settings
- Active intervention selection improves graph recovery

## Unsupported Claims
- P5 discovers real-world causal structure
- P5 proves causal discovery is solved

## Known Failure Modes
- Graph recovery is imperfect for dense graphs
- Nonlinear mechanisms are harder to recover
- Small sample sizes limit accuracy
