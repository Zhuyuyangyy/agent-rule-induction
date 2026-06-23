# Figure Plans

Textual plans for figures to be generated when requested.

## Figure 1: System Architecture

```
+------------------+     +-------------------+     +------------------+
|   Hypothesis     |     |   Active Query    |     |   Version Space  |
|   Space H        |---->|   Selection       |---->|   Update         |
|   (candidates)   |     |   (infogain)      |     |   (elimination)  |
+------------------+     +-------------------+     +------------------+
         ^                        |                        |
         |                        v                        v
         |               +-------------------+     +------------------+
         |               |   Observation     |     |   Candidate Set  |
         +---------------|   y = f(x) + ε   |<----|   C ⊆ H          |
                         +-------------------+     +------------------+
```

## Figure 2: Active Query Loop

```
Initialize C = H
while budget > 0:
    x* = argmax_x score(x | C)    // infogain / variance
    y = observe(x*)                // query the target
    C = { T ∈ C : |f_T(x*) - y| ≤ τ }  // filter
return argmin_T error(T)
```

## Figure 3: Verifier Sidecar Architecture

```
TypeScript (main)          Python (sidecar)
     |                           |
     |-- JSON stdin ----------->|
     |   { task, expr1, expr2 } |
     |                          |-- SymPy simplify
     |                          |-- Dimension check
     |                          |-- Canonicalize
     |<-- JSON stdout ----------|
     |   { result, details }    |
```

## Figure 4: Benchmark Ladder P0-P4

```
P0: Boolean Rule Induction          [DISCRETE, NO NOISE]
  |
  v
P1: Symbolic Expression Discovery   [CONTINUOUS, MULTI-NOISE]
  |
  v
P2: Physics-Constrained Rediscovery  [DIMENSIONAL, VERIFIER]
  |
  v
P3: Anomaly-Driven Refinement       [CORRECTIONS, VERIFIER]
  |
  v
P4: Open-Ended Candidate Search     [SIMULATED LLM, VERIFIER]
```

## Figure 5: AlphaGo-for-Science Roadmap

```
Current (P0-P4):     Controlled benchmarks, fixed hypothesis spaces
Near-term:           Multi-agent proposal/search/verification loop
Mid-term:            Real LLM integration, causal mechanism discovery
Long-term:           Real experimental data, open-ended discovery
                     (but never claiming new physics without evidence)
```
