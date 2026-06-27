# P4: Open-Ended Active Theory Search Benchmark Report

**Formulas**: 29
**Noise levels**: 0, 0.01, 0.05
**Budget**: 10 queries
**Seeds**: 3
**Baselines**: llm_raw_candidate, llm_plus_parser, llm_plus_verifier, llm_plus_active_infogain, library_active_infogain, oracle

## Noise = 0

### Main Results

| Baseline | Parse Success | Verifier Pass | Hallucination | Invalid Dim | Recovery Rate | Avg R² | Avg Queries | Oracle Gap |
|----------|-------------:|--------------:|--------------:|------------:|--------------:|-------:|------------:|-----------:|
| llm_raw_candidate | 88.8% | 0.0% | 11.2% | 95.4% | 1.1% | 0.0115 | 0.0 | 0.9885 |
| llm_plus_parser | 89.3% | 0.0% | 10.7% | 71.3% | 23.0% | 0.5555 | 0.0 | 0.4445 |
| llm_plus_verifier | 85.7% | 3.4% | 14.3% | 96.6% | 12.6% | 0.3635 | 0.0 | 0.6365 |
| llm_plus_active_infogain | 87.8% | 0.0% | 12.2% | 9.2% | 12.6% | 0.1546 | 10.0 | 0.8454 |
| library_active_infogain | 0.0% | 0.0% | 0.0% | 20.7% | 100.0% | 1.0000 | 10.0 | 0.0000 |
| oracle | 0.0% | 0.0% | 0.0% | 20.7% | 100.0% | 1.0000 | 0.0 | 0.0000 |

### LLM Candidate Quality

| Baseline | Parse Success | Hallucination Rate | Verifier Pass Rate | Invalid Dim Rate |
|----------|-------------:|-------------------:|-------------------:|-----------------:|
| llm_raw_candidate | 88.8% | 11.2% | 0.0% | 95.4% |
| llm_plus_parser | 89.3% | 10.7% | 0.0% | 71.3% |
| llm_plus_verifier | 85.7% | 14.3% | 3.4% | 96.6% |
| llm_plus_active_infogain | 87.8% | 12.2% | 0.0% | 9.2% |

## Noise = 0.01

### Main Results

| Baseline | Parse Success | Verifier Pass | Hallucination | Invalid Dim | Recovery Rate | Avg R² | Avg Queries | Oracle Gap |
|----------|-------------:|--------------:|--------------:|------------:|--------------:|-------:|------------:|-----------:|
| llm_raw_candidate | 88.8% | 0.0% | 11.2% | 95.4% | 1.1% | 0.0115 | 0.0 | 0.9885 |
| llm_plus_parser | 89.3% | 0.0% | 10.7% | 71.3% | 23.0% | 0.5647 | 0.0 | 0.4353 |
| llm_plus_verifier | 85.7% | 3.4% | 14.3% | 96.6% | 12.6% | 0.3716 | 0.0 | 0.6284 |
| llm_plus_active_infogain | 87.8% | 0.0% | 12.2% | 9.2% | 12.6% | 0.1556 | 10.0 | 0.8444 |
| library_active_infogain | 0.0% | 0.0% | 0.0% | 20.7% | 100.0% | 0.9978 | 10.0 | 0.0022 |
| oracle | 0.0% | 0.0% | 0.0% | 20.7% | 100.0% | 0.9978 | 0.0 | 0.0022 |

### LLM Candidate Quality

| Baseline | Parse Success | Hallucination Rate | Verifier Pass Rate | Invalid Dim Rate |
|----------|-------------:|-------------------:|-------------------:|-----------------:|
| llm_raw_candidate | 88.8% | 11.2% | 0.0% | 95.4% |
| llm_plus_parser | 89.3% | 10.7% | 0.0% | 71.3% |
| llm_plus_verifier | 85.7% | 14.3% | 3.4% | 96.6% |
| llm_plus_active_infogain | 87.8% | 12.2% | 0.0% | 9.2% |

## Noise = 0.05

### Main Results

| Baseline | Parse Success | Verifier Pass | Hallucination | Invalid Dim | Recovery Rate | Avg R² | Avg Queries | Oracle Gap |
|----------|-------------:|--------------:|--------------:|------------:|--------------:|-------:|------------:|-----------:|
| llm_raw_candidate | 88.8% | 0.0% | 11.2% | 95.4% | 1.1% | 0.0114 | 0.0 | 0.9886 |
| llm_plus_parser | 89.3% | 0.0% | 10.7% | 72.4% | 23.0% | 0.5523 | 0.0 | 0.4477 |
| llm_plus_verifier | 85.7% | 3.4% | 14.3% | 96.6% | 12.6% | 0.3605 | 0.0 | 0.6395 |
| llm_plus_active_infogain | 87.8% | 0.0% | 12.2% | 16.1% | 12.6% | 0.2522 | 10.0 | 0.7478 |
| library_active_infogain | 0.0% | 0.0% | 0.0% | 20.7% | 100.0% | 0.9695 | 10.0 | 0.0305 |
| oracle | 0.0% | 0.0% | 0.0% | 20.7% | 100.0% | 0.9695 | 0.0 | 0.0305 |

### LLM Candidate Quality

| Baseline | Parse Success | Hallucination Rate | Verifier Pass Rate | Invalid Dim Rate |
|----------|-------------:|-------------------:|-------------------:|-----------------:|
| llm_raw_candidate | 88.8% | 11.2% | 0.0% | 95.4% |
| llm_plus_parser | 89.3% | 10.7% | 0.0% | 72.4% |
| llm_plus_verifier | 85.7% | 14.3% | 3.4% | 96.6% |
| llm_plus_active_infogain | 87.8% | 12.2% | 0.0% | 16.1% |

## Cross-Noise Comparison

| Baseline | Noise 0 Recovery | Noise 0.01 Recovery | Noise 0.05 Recovery | Noise 0 Avg R² | Noise 0.05 Avg R² |
|----------|----------------:|--------------------:|--------------------:|---------------:|------------------:|
| llm_raw_candidate | 1.1% | 1.1% | 1.1% | 0.0115 | 0.0114 |
| llm_plus_parser | 23.0% | 23.0% | 23.0% | 0.5555 | 0.5523 |
| llm_plus_verifier | 12.6% | 12.6% | 12.6% | 0.3635 | 0.3605 |
| llm_plus_active_infogain | 12.6% | 12.6% | 12.6% | 0.1546 | 0.2522 |
| library_active_infogain | 100.0% | 100.0% | 100.0% | 1.0000 | 0.9695 |
| oracle | 100.0% | 100.0% | 100.0% | 1.0000 | 0.9695 |

## Claim Boundary

**Allowed**: P4 explores open-ended candidate generation in controlled settings. LLMs are used as proposal mechanisms, not final judges. External verification remains necessary.
**Forbidden**: The system autonomously discovers new physics. The system is a complete AI scientist. The system has solved open-ended scientific discovery.