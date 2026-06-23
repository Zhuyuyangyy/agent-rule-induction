# P5: Causal Mechanism Discovery

Controlled benchmark for evaluating causal graph discovery from observational and interventional data.

## Overview

P5 tests whether algorithms can recover the structure and parameters of a causal DAG from data. It uses **synthetically generated** linear Gaussian structural equation models — this is a controlled sandbox, NOT real-world causal discovery.

## Graph Generation

- Random DAGs with 5–8 nodes
- Two density levels: sparse (0.3) and dense (0.6)
- Edges only from lower to higher node index (guaranteeing acyclicity)
- Linear mechanisms: each node = intercept + Σ(coefficient × parent) + noise
- 8 graph configurations total

## Data

- **Observational**: 100 samples from the joint distribution
- **Interventional**: do-interventions on each node at values {-2, -1, 0, 1, 2}, 5 samples each
- Noise levels: 0, 0.01, 0.05

## Baselines

| Baseline | Description |
|----------|-------------|
| `random_graph_search` | Generate a random DAG with matching parameters |
| `greedy_fit` | Correlation thresholding on observational data |
| `active_random_intervention` | Random do-interventions, correlation + interventional signal |
| `active_infogain_intervention` | Targeted interventions maximizing edge uncertainty reduction |
| `oracle_graph` | Returns the true graph (upper bound) |

## Metrics

| Metric | Description |
|--------|-------------|
| `graphF1` | F1 score for edge detection (precision × recall) |
| `graphPrecision` | Fraction of predicted edges that are correct |
| `graphRecall` | Fraction of true edges that are recovered |
| `shd` | Structural Hamming Distance |
| `interventionR2` | R² on interventional data |
| `counterfactualAccuracy` | Accuracy of counterfactual predictions |
| `compression` | Edge density of predicted graph |
| `queryCost` | Number of interventional queries used |
| `oracleGap` | Gap from oracle F1 score |

## Usage

```bash
npm run p5:benchmark
```

With custom options:

```bash
npx tsx src/p5/p5Benchmark.ts --noise 0,0.01,0.05 --budget 10 --seeds 3 --output results/p5_custom
```

## Claim Boundary

**Allowed**: P5 tests causal mechanism discovery in a controlled sandbox with known ground-truth DAGs and linear mechanisms. P5 evaluates whether active interventional strategies outperform passive observation for graph recovery.

**Forbidden**: The system discovered real causal relationships in the wild. The system solved general causal inference. The system can replace domain expertise in causal modeling.
