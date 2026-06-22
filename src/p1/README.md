# P1: Symbolic Expression Discovery Benchmark

## Overview

P1 extends the Active Theory Discovery framework from boolean rule induction (P0) to **symbolic expression discovery**. The task: given a black-box function that can be queried at specific points, identify which symbolic expression from a fixed library matches the target.

## Key Design

- **265 formulas**: 245 synthetic + 20 classic physics formulas
- **6 categories**: linear, polynomial, rational, trigonometric, sqrt/log/abs, physics-style
- **5 baselines**: random_search, greedy_symbolic_search, active_random, active_infogain, oracle
- **Noise support**: additive Gaussian noise at configurable levels
- **Metrics**: heldoutAccuracy (R²), symbolicEquivalentRate, complexity, queryCost

## Baselines

| Baseline | Description |
|----------|-------------|
| `random_search` | Randomly pick a formula from the library (no querying) |
| `greedy_symbolic_search` | Evaluate all candidates on fixed points, pick lowest error |
| `active_random` | Query target at random points, filter candidates by error |
| `active_infogain` | Query target at max-variance points, filter candidates by error |
| `oracle` | Always returns the correct formula |

### active_infogain Definition

1. Maintain candidate expression set C
2. For each candidate query point x, compute score(x) = variance({f(x) | f ∈ C})
3. Select query point with maximum variance
4. Query target's y at that point
5. Filter candidates: remove those where |f(x) - y| > tolerance
6. Repeat until budget exhausted
7. Return candidate with lowest total error

## File Structure

```
src/p1/
  symbolicExpr.ts    - Core DSL for symbolic expressions
  formulaLibrary.ts  - 265 formulas across 6 categories
  dataset.ts         - Dataset generation with noise
  p1Score.ts         - Scoring metrics (R², symbolic equivalence, etc.)
  baselines.ts       - 5 baseline implementations
  p1Benchmark.ts     - Main benchmark runner and report generation
```

## Usage

```bash
# Run benchmark (noise=0)
npm run p1:benchmark

# Run with noise
npm run p1:benchmark:noisy

# Run across multiple noise levels
npm run p1:benchmark:multi-noise
```

## Important Notes

- P1 is a **symbolic-discovery benchmark**, not physical theory discovery
- Classic formulas are **illustrative demos only**; synthetic formulas are the main evidence
- This avoids LLM memorization contamination concerns
