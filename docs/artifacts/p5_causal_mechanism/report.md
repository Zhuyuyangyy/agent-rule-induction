# P5: Causal Mechanism Discovery Benchmark Report

**Graph configs**: 8 (5-8 nodes x 2 density levels)
**Noise levels**: 0, 0.01, 0.05
**Budget**: 10 queries
**Seeds**: 3
**Baselines**: random_graph_search, greedy_fit, active_random_intervention, active_infogain_intervention, oracle_graph

## Noise = 0

| Baseline | Graph F1 | Graph Precision | Graph Recall | SHD | Int R² | CF Accuracy | Compression | Avg Queries | Oracle Gap |
|----------|---------:|----------------:|-------------:|----:|-------:|------------:|------------:|------------:|-----------:|
| random_graph_search | 0.4774 | 0.5091 | 0.5139 | 8.2 | 0.0866 | 1.0000 | 0.4690 | 0.0 | 0.5226 |
| greedy_fit | 0.7962 | 0.7041 | 0.9604 | 5.2 | 0.1571 | 1.0000 | 0.6657 | 100.0 | 0.2038 |
| active_random_intervention | 0.7860 | 0.6753 | 0.9806 | 5.5 | 0.1324 | 1.0000 | 0.7056 | 10.0 | 0.2140 |
| active_infogain_intervention | 0.7933 | 0.6805 | 0.9911 | 5.3 | 0.1292 | 1.0000 | 0.7086 | 10.0 | 0.2067 |
| oracle_graph | 1.0000 | 1.0000 | 1.0000 | 0.0 | 0.8848 | 1.0000 | 0.4661 | 0.0 | 0.0000 |

## Noise = 0.01

| Baseline | Graph F1 | Graph Precision | Graph Recall | SHD | Int R² | CF Accuracy | Compression | Avg Queries | Oracle Gap |
|----------|---------:|----------------:|-------------:|----:|-------:|------------:|------------:|------------:|-----------:|
| random_graph_search | 0.4774 | 0.5091 | 0.5139 | 8.2 | 0.0865 | 1.0000 | 0.4690 | 0.0 | 0.5226 |
| greedy_fit | 0.7962 | 0.7041 | 0.9604 | 5.2 | 0.1566 | 1.0000 | 0.6657 | 100.0 | 0.2038 |
| active_random_intervention | 0.7860 | 0.6753 | 0.9806 | 5.5 | 0.1321 | 1.0000 | 0.7056 | 10.0 | 0.2140 |
| active_infogain_intervention | 0.7924 | 0.6791 | 0.9911 | 5.4 | 0.1288 | 1.0000 | 0.7101 | 10.0 | 0.2076 |
| oracle_graph | 1.0000 | 1.0000 | 1.0000 | 0.0 | 0.8828 | 1.0000 | 0.4661 | 0.0 | 0.0000 |

## Noise = 0.05

| Baseline | Graph F1 | Graph Precision | Graph Recall | SHD | Int R² | CF Accuracy | Compression | Avg Queries | Oracle Gap |
|----------|---------:|----------------:|-------------:|----:|-------:|------------:|------------:|------------:|-----------:|
| random_graph_search | 0.4774 | 0.5091 | 0.5139 | 8.2 | 0.0860 | 1.0000 | 0.4690 | 0.0 | 0.5226 |
| greedy_fit | 0.7962 | 0.7041 | 0.9604 | 5.2 | 0.1546 | 1.0000 | 0.6657 | 100.0 | 0.2038 |
| active_random_intervention | 0.7860 | 0.6753 | 0.9806 | 5.5 | 0.1307 | 1.0000 | 0.7056 | 10.0 | 0.2140 |
| active_infogain_intervention | 0.7921 | 0.6796 | 0.9889 | 5.4 | 0.1271 | 1.0000 | 0.7066 | 10.0 | 0.2079 |
| oracle_graph | 1.0000 | 1.0000 | 1.0000 | 0.0 | 0.8748 | 1.0000 | 0.4661 | 0.0 | 0.0000 |

## Per-Config Breakdown

### n5_d0.3

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.4889 | 3.0 | 0.1204 | 1.0000 |
| greedy_fit | 0.8963 | 1.0 | 0.4399 | 1.0000 |
| active_random_intervention | 0.8778 | 1.3 | 0.2693 | 1.0000 |
| active_infogain_intervention | 0.8778 | 1.3 | 0.2694 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.8891 | 1.0000 |

### n5_d0.6

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.7389 | 3.7 | 0.0814 | 1.0000 |
| greedy_fit | 0.8936 | 1.7 | 0.0247 | 1.0000 |
| active_random_intervention | 0.8745 | 2.0 | 0.0730 | 1.0000 |
| active_infogain_intervention | 0.8936 | 1.7 | 0.0176 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.9039 | 1.0000 |

### n6_d0.3

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.2262 | 6.3 | 0.0982 | 1.0000 |
| greedy_fit | 0.8690 | 2.3 | 0.5027 | 1.0000 |
| active_random_intervention | 0.8690 | 2.3 | 0.4867 | 1.0000 |
| active_infogain_intervention | 0.8690 | 2.3 | 0.5161 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.8882 | 1.0000 |

### n6_d0.6

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.5778 | 7.7 | 0.0833 | 1.0000 |
| greedy_fit | 0.8046 | 3.3 | 0.0564 | 1.0000 |
| active_random_intervention | 0.7914 | 3.7 | 0.0000 | 1.0000 |
| active_infogain_intervention | 0.7781 | 4.0 | 0.0000 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.8687 | 1.0000 |

### n7_d0.3

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.4095 | 6.7 | 0.0000 | 1.0000 |
| greedy_fit | 0.7824 | 3.0 | 0.2255 | 1.0000 |
| active_random_intervention | 0.7488 | 3.7 | 0.2249 | 1.0000 |
| active_infogain_intervention | 0.7702 | 3.3 | 0.2240 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.8710 | 1.0000 |

### n7_d0.6

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.5345 | 11.0 | 0.1303 | 1.0000 |
| greedy_fit | 0.7692 | 6.3 | 0.0000 | 1.0000 |
| active_random_intervention | 0.7649 | 7.0 | 0.0000 | 1.0000 |
| active_infogain_intervention | 0.7670 | 6.9 | 0.0000 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.9094 | 1.0000 |

### n8_d0.3

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.2945 | 13.0 | 0.1089 | 1.0000 |
| greedy_fit | 0.6255 | 13.0 | 0.0000 | 1.0000 |
| active_random_intervention | 0.6325 | 13.0 | 0.0000 | 1.0000 |
| active_infogain_intervention | 0.6496 | 12.7 | 0.0000 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.8731 | 1.0000 |

### n8_d0.6

| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |
|----------|---------:|----:|-------:|------------:|
| random_graph_search | 0.5491 | 14.3 | 0.0685 | 1.0000 |
| greedy_fit | 0.7291 | 11.0 | 0.0000 | 1.0000 |
| active_random_intervention | 0.7291 | 11.0 | 0.0000 | 1.0000 |
| active_infogain_intervention | 0.7355 | 10.7 | 0.0000 | 1.0000 |
| oracle_graph | 1.0000 | 0.0 | 0.8430 | 1.0000 |

## Claim Boundary

**Allowed**: P5 tests causal mechanism discovery in a controlled sandbox with known ground-truth DAGs and linear mechanisms. P5 evaluates whether active interventional strategies outperform passive observation for graph recovery.
**Forbidden**: The system discovered real causal relationships in the wild. The system solved general causal inference. The system can replace domain expertise in causal modeling.