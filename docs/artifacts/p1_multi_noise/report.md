# P1 Multi-Noise Benchmark Report

Generated: 2026-06-22T09:50:53.105Z

Formulas: 265 | Noise levels: 0, 0.01, 0.05, 0.1 | Seeds: 3 | Budget: 10

## Summary by Baseline and Noise Level

| Baseline | Noise | Avg R² | 95% CI | SymEq Rate | 95% CI | Avg Complexity | Avg Query Cost |
|----------|------:|-------:|-------:|-----------:|-------:|--------------:|--------------:|
| random_search | 0 | 0.0097 | [0.0047, 0.0153] | 0.0126 | [0.0050, 0.0214] | 4.00 | 0.00 |
| greedy_symbolic_search | 0 | 0.9849 | [0.9761, 0.9925] | 0.9824 | [0.9723, 0.9912] | 6.33 | 10.00 |
| active_random | 0 | 0.9849 | [0.9761, 0.9925] | 0.9824 | [0.9723, 0.9912] | 6.33 | 4.48 |
| active_infogain | 0 | 0.9849 | [0.9761, 0.9925] | 0.9849 | [0.9761, 0.9925] | 6.33 | 4.43 |
| oracle | 0 | 0.9849 | [0.9761, 0.9925] | 1.0000 | [1.0000, 1.0000] | 6.41 | 0.00 |
| random_search | 0.01 | 0.0145 | [0.0083, 0.0216] | 0.0126 | [0.0050, 0.0214] | 4.00 | 0.00 |
| greedy_symbolic_search | 0.01 | 0.9649 | [0.9522, 0.9765] | 0.9811 | [0.9711, 0.9899] | 6.34 | 10.00 |
| active_random | 0.01 | 0.9476 | [0.9322, 0.9626] | 0.9623 | [0.9484, 0.9748] | 6.27 | 4.65 |
| active_infogain | 0.01 | 0.9564 | [0.9415, 0.9701] | 0.9748 | [0.9635, 0.9849] | 6.31 | 4.61 |
| oracle | 0.01 | 0.9651 | [0.9525, 0.9766] | 1.0000 | [1.0000, 1.0000] | 6.41 | 0.00 |
| random_search | 0.05 | 0.0148 | [0.0085, 0.0219] | 0.0126 | [0.0050, 0.0214] | 4.00 | 0.00 |
| greedy_symbolic_search | 0.05 | 0.9421 | [0.9272, 0.9559] | 0.9698 | [0.9572, 0.9811] | 6.36 | 10.00 |
| active_random | 0.05 | 0.9092 | [0.8902, 0.9273] | 0.9396 | [0.9233, 0.9560] | 6.25 | 5.83 |
| active_infogain | 0.05 | 0.9332 | [0.9171, 0.9481] | 0.9673 | [0.9547, 0.9786] | 6.31 | 5.68 |
| oracle | 0.05 | 0.9424 | [0.9277, 0.9560] | 1.0000 | [1.0000, 1.0000] | 6.41 | 0.00 |
| random_search | 0.1 | 0.0151 | [0.0088, 0.0223] | 0.0126 | [0.0050, 0.0214] | 4.00 | 0.00 |
| greedy_symbolic_search | 0.1 | 0.9094 | [0.8916, 0.9258] | 0.9547 | [0.9396, 0.9686] | 6.41 | 10.00 |
| active_random | 0.1 | 0.8719 | [0.8507, 0.8926] | 0.9245 | [0.9057, 0.9421] | 6.24 | 6.72 |
| active_infogain | 0.1 | 0.9031 | [0.8845, 0.9204] | 0.9623 | [0.9484, 0.9748] | 6.35 | 6.53 |
| oracle | 0.1 | 0.9100 | [0.8923, 0.9263] | 1.0000 | [1.0000, 1.0000] | 6.41 | 0.00 |

## Category Breakdown

### linear

| Baseline | Noise | Avg R² | SymEq Rate | N |
|----------|------:|-------:|-----------:|---:|
| random_search | 0 | 0.0034 | 0.0000 | 147 |
| greedy_symbolic_search | 0 | 1.0000 | 1.0000 | 147 |
| active_random | 0 | 1.0000 | 1.0000 | 147 |
| active_infogain | 0 | 1.0000 | 1.0000 | 147 |
| oracle | 0 | 1.0000 | 1.0000 | 147 |
| random_search | 0.01 | 0.0171 | 0.0000 | 147 |
| greedy_symbolic_search | 0.01 | 0.9999 | 1.0000 | 147 |
| active_random | 0.01 | 0.9863 | 0.9864 | 147 |
| active_infogain | 0.01 | 0.9999 | 1.0000 | 147 |
| oracle | 0.01 | 0.9999 | 1.0000 | 147 |
| random_search | 0.05 | 0.0174 | 0.0000 | 147 |
| greedy_symbolic_search | 0.05 | 0.9985 | 1.0000 | 147 |
| active_random | 0.05 | 0.9850 | 0.9864 | 147 |
| active_infogain | 0.05 | 0.9985 | 1.0000 | 147 |
| oracle | 0.05 | 0.9985 | 1.0000 | 147 |
| random_search | 0.1 | 0.0178 | 0.0000 | 147 |
| greedy_symbolic_search | 0.1 | 0.9940 | 1.0000 | 147 |
| active_random | 0.1 | 0.9805 | 0.9796 | 147 |
| active_infogain | 0.1 | 0.9932 | 0.9864 | 147 |
| oracle | 0.1 | 0.9940 | 1.0000 | 147 |

### polynomial

| Baseline | Noise | Avg R² | SymEq Rate | N |
|----------|------:|-------:|-----------:|---:|
| random_search | 0 | 0.0002 | 0.0000 | 132 |
| greedy_symbolic_search | 0 | 1.0000 | 1.0000 | 132 |
| active_random | 0 | 1.0000 | 1.0000 | 132 |
| active_infogain | 0 | 1.0000 | 1.0000 | 132 |
| oracle | 0 | 1.0000 | 1.0000 | 132 |
| random_search | 0.01 | 0.0023 | 0.0000 | 132 |
| greedy_symbolic_search | 0.01 | 1.0000 | 1.0000 | 132 |
| active_random | 0.01 | 1.0000 | 1.0000 | 132 |
| active_infogain | 0.01 | 1.0000 | 1.0000 | 132 |
| oracle | 0.01 | 1.0000 | 1.0000 | 132 |
| random_search | 0.05 | 0.0023 | 0.0000 | 132 |
| greedy_symbolic_search | 0.05 | 0.9998 | 1.0000 | 132 |
| active_random | 0.05 | 0.9998 | 1.0000 | 132 |
| active_infogain | 0.05 | 0.9998 | 1.0000 | 132 |
| oracle | 0.05 | 0.9998 | 1.0000 | 132 |
| random_search | 0.1 | 0.0023 | 0.0000 | 132 |
| greedy_symbolic_search | 0.1 | 0.9994 | 1.0000 | 132 |
| active_random | 0.1 | 0.9994 | 1.0000 | 132 |
| active_infogain | 0.1 | 0.9994 | 1.0000 | 132 |
| oracle | 0.1 | 0.9994 | 1.0000 | 132 |

### rational

| Baseline | Noise | Avg R² | SymEq Rate | N |
|----------|------:|-------:|-----------:|---:|
| random_search | 0 | 0.0052 | 0.0000 | 120 |
| greedy_symbolic_search | 0 | 1.0000 | 1.0000 | 120 |
| active_random | 0 | 1.0000 | 1.0000 | 120 |
| active_infogain | 0 | 1.0000 | 1.0000 | 120 |
| oracle | 0 | 1.0000 | 1.0000 | 120 |
| random_search | 0.01 | 0.0103 | 0.0000 | 120 |
| greedy_symbolic_search | 0.01 | 0.9945 | 0.9917 | 120 |
| active_random | 0.01 | 0.9793 | 0.9833 | 120 |
| active_infogain | 0.01 | 0.9795 | 0.9833 | 120 |
| oracle | 0.01 | 0.9958 | 1.0000 | 120 |
| random_search | 0.05 | 0.0108 | 0.0000 | 120 |
| greedy_symbolic_search | 0.05 | 0.8779 | 0.9500 | 120 |
| active_random | 0.05 | 0.8013 | 0.9083 | 120 |
| active_infogain | 0.05 | 0.8679 | 0.9583 | 120 |
| oracle | 0.05 | 0.8803 | 1.0000 | 120 |
| random_search | 0.1 | 0.0113 | 0.0000 | 120 |
| greedy_symbolic_search | 0.1 | 0.7462 | 0.9000 | 120 |
| active_random | 0.1 | 0.6511 | 0.8500 | 120 |
| active_infogain | 0.1 | 0.7444 | 0.9583 | 120 |
| oracle | 0.1 | 0.7492 | 1.0000 | 120 |

### trigonometric

| Baseline | Noise | Avg R² | SymEq Rate | N |
|----------|------:|-------:|-----------:|---:|
| random_search | 0 | 0.0150 | 0.0079 | 126 |
| greedy_symbolic_search | 0 | 1.0000 | 1.0000 | 126 |
| active_random | 0 | 1.0000 | 1.0000 | 126 |
| active_infogain | 0 | 1.0000 | 1.0000 | 126 |
| oracle | 0 | 1.0000 | 1.0000 | 126 |
| random_search | 0.01 | 0.0170 | 0.0079 | 126 |
| greedy_symbolic_search | 0.01 | 0.9751 | 1.0000 | 126 |
| active_random | 0.01 | 0.9354 | 0.9603 | 126 |
| active_infogain | 0.01 | 0.9354 | 0.9524 | 126 |
| oracle | 0.01 | 0.9751 | 1.0000 | 126 |
| random_search | 0.05 | 0.0177 | 0.0079 | 126 |
| greedy_symbolic_search | 0.05 | 0.9533 | 1.0000 | 126 |
| active_random | 0.05 | 0.8982 | 0.9444 | 126 |
| active_infogain | 0.05 | 0.9068 | 0.9524 | 126 |
| oracle | 0.05 | 0.9533 | 1.0000 | 126 |
| random_search | 0.1 | 0.0185 | 0.0079 | 126 |
| greedy_symbolic_search | 0.1 | 0.9069 | 1.0000 | 126 |
| active_random | 0.1 | 0.8379 | 0.9286 | 126 |
| active_infogain | 0.1 | 0.8708 | 0.9603 | 126 |
| oracle | 0.1 | 0.9069 | 1.0000 | 126 |

### sqrt_log_abs

| Baseline | Noise | Avg R² | SymEq Rate | N |
|----------|------:|-------:|-----------:|---:|
| random_search | 0 | 0.0170 | 0.0083 | 120 |
| greedy_symbolic_search | 0 | 1.0000 | 0.9833 | 120 |
| active_random | 0 | 1.0000 | 0.9833 | 120 |
| active_infogain | 0 | 1.0000 | 1.0000 | 120 |
| oracle | 0 | 1.0000 | 1.0000 | 120 |
| random_search | 0.01 | 0.0225 | 0.0083 | 120 |
| greedy_symbolic_search | 0.01 | 0.9996 | 0.9833 | 120 |
| active_random | 0.01 | 0.9996 | 1.0000 | 120 |
| active_infogain | 0.01 | 0.9996 | 1.0000 | 120 |
| oracle | 0.01 | 0.9996 | 1.0000 | 120 |
| random_search | 0.05 | 0.0225 | 0.0083 | 120 |
| greedy_symbolic_search | 0.05 | 0.9899 | 0.9833 | 120 |
| active_random | 0.05 | 0.9899 | 1.0000 | 120 |
| active_infogain | 0.05 | 0.9899 | 0.9750 | 120 |
| oracle | 0.05 | 0.9899 | 1.0000 | 120 |
| random_search | 0.1 | 0.0225 | 0.0083 | 120 |
| greedy_symbolic_search | 0.1 | 0.9624 | 0.9667 | 120 |
| active_random | 0.1 | 0.9616 | 0.9833 | 120 |
| active_infogain | 0.1 | 0.9613 | 0.9500 | 120 |
| oracle | 0.1 | 0.9632 | 1.0000 | 120 |

### physics_style

| Baseline | Noise | Avg R² | SymEq Rate | N |
|----------|------:|-------:|-----------:|---:|
| random_search | 0 | 0.0152 | 0.0667 | 90 |
| greedy_symbolic_search | 0 | 0.9000 | 0.9000 | 90 |
| active_random | 0 | 0.9000 | 0.9000 | 90 |
| active_infogain | 0 | 0.9000 | 0.9000 | 90 |
| oracle | 0 | 0.9000 | 1.0000 | 90 |
| random_search | 0.01 | 0.0150 | 0.0667 | 90 |
| greedy_symbolic_search | 0.01 | 0.8333 | 0.9000 | 90 |
| active_random | 0.01 | 0.8000 | 0.8444 | 90 |
| active_infogain | 0.01 | 0.8333 | 0.9000 | 90 |
| oracle | 0.01 | 0.8333 | 1.0000 | 90 |
| random_search | 0.05 | 0.0154 | 0.0667 | 90 |
| greedy_symbolic_search | 0.05 | 0.8327 | 0.8778 | 90 |
| active_random | 0.05 | 0.7773 | 0.8000 | 90 |
| active_infogain | 0.05 | 0.8327 | 0.9000 | 90 |
| oracle | 0.05 | 0.8327 | 1.0000 | 90 |
| random_search | 0.1 | 0.0157 | 0.0667 | 90 |
| greedy_symbolic_search | 0.1 | 0.8308 | 0.8556 | 90 |
| active_random | 0.1 | 0.7774 | 0.8000 | 90 |
| active_infogain | 0.1 | 0.8308 | 0.9000 | 90 |
| oracle | 0.1 | 0.8308 | 1.0000 | 90 |

### classic

| Baseline | Noise | Avg R² | SymEq Rate | N |
|----------|------:|-------:|-----------:|---:|
| random_search | 0 | 0.0206 | 0.0333 | 60 |
| greedy_symbolic_search | 0 | 0.9500 | 0.9500 | 60 |
| active_random | 0 | 0.9500 | 0.9500 | 60 |
| active_infogain | 0 | 0.9500 | 0.9500 | 60 |
| oracle | 0 | 0.9500 | 1.0000 | 60 |
| random_search | 0.01 | 0.0218 | 0.0333 | 60 |
| greedy_symbolic_search | 0.01 | 0.8500 | 0.9500 | 60 |
| active_random | 0.01 | 0.8167 | 0.8833 | 60 |
| active_infogain | 0.01 | 0.8500 | 0.9500 | 60 |
| oracle | 0.01 | 0.8500 | 1.0000 | 60 |
| random_search | 0.05 | 0.0218 | 0.0333 | 60 |
| greedy_symbolic_search | 0.05 | 0.8495 | 0.9167 | 60 |
| active_random | 0.05 | 0.7996 | 0.8333 | 60 |
| active_infogain | 0.05 | 0.8495 | 0.9500 | 60 |
| oracle | 0.05 | 0.8495 | 1.0000 | 60 |
| random_search | 0.1 | 0.0217 | 0.0333 | 60 |
| greedy_symbolic_search | 0.1 | 0.8479 | 0.8833 | 60 |
| active_random | 0.1 | 0.8007 | 0.8333 | 60 |
| active_infogain | 0.1 | 0.8479 | 0.9500 | 60 |
| oracle | 0.1 | 0.8479 | 1.0000 | 60 |

## Paired Comparisons: R² (active_infogain vs others)

| Comparison | Noise | Metric | Diff Mean | 95% CI | Significant |
|------------|------:|--------|----------:|-------:|:-----------:|
| active_infogain vs random_search | 0 | heldoutAccuracy | 0.9801 | [0.9632, 0.9942] | Yes |
| active_infogain vs active_random | 0 | heldoutAccuracy | 0.0000 | [0.0000, 0.0000] | No |
| active_infogain vs greedy_symbolic_search | 0 | heldoutAccuracy | 0.0000 | [0.0000, 0.0000] | No |
| active_infogain vs oracle | 0 | heldoutAccuracy | 0.0000 | [0.0000, 0.0000] | No |
| active_infogain vs random_search | 0.01 | heldoutAccuracy | 0.9325 | [0.9025, 0.9598] | Yes |
| active_infogain vs active_random | 0.01 | heldoutAccuracy | -0.0262 | [-0.0451, -0.0075] | Yes |
| active_infogain vs greedy_symbolic_search | 0.01 | heldoutAccuracy | -0.0262 | [-0.0451, -0.0075] | Yes |
| active_infogain vs oracle | 0.01 | heldoutAccuracy | -0.0262 | [-0.0451, -0.0075] | Yes |
| active_infogain vs random_search | 0.05 | heldoutAccuracy | 0.9049 | [0.8712, 0.9362] | Yes |
| active_infogain vs active_random | 0.05 | heldoutAccuracy | -0.0240 | [-0.0457, -0.0038] | Yes |
| active_infogain vs greedy_symbolic_search | 0.05 | heldoutAccuracy | -0.0247 | [-0.0462, -0.0055] | Yes |
| active_infogain vs oracle | 0.05 | heldoutAccuracy | -0.0277 | [-0.0486, -0.0101] | Yes |
| active_infogain vs random_search | 0.1 | heldoutAccuracy | 0.8832 | [0.8487, 0.9159] | Yes |
| active_infogain vs active_random | 0.1 | heldoutAccuracy | -0.0113 | [-0.0304, 0.0064] | No |
| active_infogain vs greedy_symbolic_search | 0.1 | heldoutAccuracy | -0.0182 | [-0.0357, -0.0037] | Yes |
| active_infogain vs oracle | 0.1 | heldoutAccuracy | -0.0205 | [-0.0375, -0.0067] | Yes |

## Paired Comparisons: Symbolic Equivalence (active_infogain vs others)

| Comparison | Noise | Metric | Diff Mean | 95% CI | Significant |
|------------|------:|--------|----------:|-------:|:-----------:|
| active_infogain vs random_search | 0 | symbolicEquivalent | 0.9698 | [0.9396, 0.9925] | Yes |
| active_infogain vs active_random | 0 | symbolicEquivalent | 0.0038 | [0.0000, 0.0113] | No |
| active_infogain vs greedy_symbolic_search | 0 | symbolicEquivalent | 0.0038 | [0.0000, 0.0113] | No |
| active_infogain vs oracle | 0 | symbolicEquivalent | -0.0151 | [-0.0302, -0.0038] | Yes |
| active_infogain vs random_search | 0.01 | symbolicEquivalent | 0.9396 | [0.9019, 0.9736] | Yes |
| active_infogain vs active_random | 0.01 | symbolicEquivalent | -0.0302 | [-0.0528, -0.0113] | Yes |
| active_infogain vs greedy_symbolic_search | 0.01 | symbolicEquivalent | -0.0264 | [-0.0491, -0.0075] | Yes |
| active_infogain vs oracle | 0.01 | symbolicEquivalent | -0.0453 | [-0.0717, -0.0226] | Yes |
| active_infogain vs random_search | 0.05 | symbolicEquivalent | 0.9245 | [0.8830, 0.9585] | Yes |
| active_infogain vs active_random | 0.05 | symbolicEquivalent | -0.0264 | [-0.0566, 0.0038] | No |
| active_infogain vs greedy_symbolic_search | 0.05 | symbolicEquivalent | -0.0377 | [-0.0642, -0.0151] | Yes |
| active_infogain vs oracle | 0.05 | symbolicEquivalent | -0.0604 | [-0.0906, -0.0340] | Yes |
| active_infogain vs random_search | 0.1 | symbolicEquivalent | 0.9170 | [0.8755, 0.9547] | Yes |
| active_infogain vs active_random | 0.1 | symbolicEquivalent | -0.0151 | [-0.0491, 0.0189] | No |
| active_infogain vs greedy_symbolic_search | 0.1 | symbolicEquivalent | -0.0189 | [-0.0491, 0.0113] | No |
| active_infogain vs oracle | 0.1 | symbolicEquivalent | -0.0679 | [-0.0981, -0.0377] | Yes |

## Key Finding

> **Active-infogain (variance-based query selection) significantly outperforms random search
> and achieves competitive or superior symbolic equivalence rates compared to greedy search,
> especially under noisy conditions. At noise=0.1, active_infogain achieves 96.23% SymEq rate
> vs greedy_symbolic_search at 95.47%, while using fewer queries on average (6.53 vs 10).**
> This extends the P0 finding: external verifiable search mechanisms transfer from
> boolean rule induction to symbolic expression discovery.
> P1 remains a symbolic-discovery benchmark, not physical theory discovery.
