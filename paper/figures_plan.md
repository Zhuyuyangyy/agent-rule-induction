# Figures Plan

## Figure 1: Active Theory Discovery Framework

Type: Schematic diagram

Content:

- Input: unknown target function f
- Hypothesis space: H = {h1, h2, ..., hN}
- Query selection: choose x to maximize information gain
- Oracle/target: observe y = f(x) + noise
- Version space update: eliminate inconsistent hypotheses
- Output: best hypothesis h*

Key distinction:

- Top path: algorithmic infogain (variance/entropy-based query selection)
- Bottom path: LLM agent (free-form reasoning, no guaranteed search)
- Arrow from top to "converges to oracle"
- Arrow from bottom to "underperforms"

## Figure 2: P0 Version-Space Narrowing

Type: Flow diagram with example

Content:

- Step 0: Initial version space (48 rules)
- Step 1: Query x=(3,7,2), observe y=true -> eliminate ~half
- Step 2: Greedy query selection maximizes split entropy
- Step 3: Version space narrows to 1 rule
- Show: algorithmic_infogain path vs random_query path
- Highlight: infogain converges in fewer steps

Data source: `docs/p0_multiseed_report.md`

## Figure 3: P1 Active Symbolic Discovery Under Noise

Type: Line plot (noise level x-axis, SymEq rate y-axis)

Content:

- X-axis: noise level (0, 0.01, 0.05, 0.10)
- Y-axis: symbolic equivalence rate
- 4 lines: greedy_symbolic_search, active_random, active_infogain, oracle
- Shaded region: 95% CI
- Key observation: active_infogain line stays closest to oracle at high noise

Data source: `docs/artifacts/p1_multi_noise/summary.csv`

Alternative: Bar chart grouped by noise level, showing SymEq rate per baseline.

## Figure 4: AlphaGo-for-Science Roadmap

Type: Roadmap / milestone diagram

Content:

```text
P0: Boolean Rule Induction     [DONE] -----> Controlled evidence for external search
                                      |
P1: Symbolic Discovery          [DONE] -----> Mechanism transfers to continuous space
                                      |
P2: Physics-Constrained Rediscovery [DONE] -----> Controlled law rediscovery with verifier
                                      |
P3: Anomaly-Driven Refinement   [DONE] -----> Theory revision from planted anomalies
                                      |
P4: Open-Ended Search            [PROTOTYPE] -> Simulated LLM candidate generation
```

Key: each stage builds on the previous; no stage claims to be complete science.

## Figure 5: Current System Boundary Diagram

Type: Boundary / scope diagram

Content:

- Inner circle: what the system does (search within known hypothesis space)
- Outer circle: what the system does NOT do (open-ended discovery, physical law discovery, anomaly detection)
- Boundary labels:
  - Inside: "version-space narrowing", "active query selection", "symbolic equivalence checking"
  - Outside: "new hypothesis generation", "physical law discovery", "real-world data"

Key: clearly delineates what is claimed vs. what is not claimed.

## Figure Generation Notes

- Figures 1-2: hand-drawn schematic (draw.io / TikZ / excalidraw)
- Figure 3: generated from CSV data (matplotlib / R / observable)
- Figure 4: simple text diagram, can be rendered as-is or as graphic
- Figure 5: Venn diagram or concentric circles
- All figures must include the academic limitation disclaimer where relevant
