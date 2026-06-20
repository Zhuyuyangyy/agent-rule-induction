# P1 Symbolic Discovery Prototype

> **Status: Experimental prototype. Not claiming P1 completion.**

## Overview

P1 extends the Active Theory Discovery framework from boolean rules to symbolic expression discovery. It tests whether the active querying approach can transfer to formula recovery tasks.

## Theory DSL

### Expression AST

```typescript
type Expr = ConstNode | VarNode | BinOpNode | FuncNode;

// ConstNode: numeric constant
// VarNode: variable reference
// BinOpNode: binary operation (+, -, *, /, ^)
// FuncNode: unary function (sin, cos, sqrt, abs, log)
```

### Core Functions

- `evaluate(expr, vars)`: Evaluate expression with given variable bindings
- `complexity(expr)`: Compute expression complexity (node count + depth)
- `isSymbolicallyEquivalent(a, b, varNames)`: Numerical sampling equivalence check (24 points, tolerance 1e-6)
- `exprToString(expr)`: Serialize expression to string

### SymbolicTheory Interface

```typescript
interface SymbolicTheory {
  id: string;
  expr: Expr;
  outputVar: string;
  inputVars: string[];
  complexity: number;
  naturalLanguage: () => string;
}
```

## Formula Library

### Synthetic Formulas (60, anti-memorization)

Randomly generated expressions with 1-2 variables, depth 2-4. LLMs cannot memorize these. This is the primary evidence source.

### Classic Formulas (10, demonstration only)

| ID | Formula | Variables |
|----|---------|-----------|
| classic_linear_001 | y = 2*x + 1 | x |
| classic_power_002 | y = x^2 | x |
| classic_poly_003 | y = x^2 + 3*x - 2 | x |
| classic_emc2_004 | E = m*c^2 | m, c |
| classic_fma_005 | F = m*a | m, a |
| classic_kepler_006 | T2 = r^3 | r |
| classic_kinematic_007 | v = a*t | a, t |
| classic_kinetic_008 | Ek = 0.5*m*v^2 | m, v |
| classic_gravity_009 | g = G*M/r^2 | G, M, r |
| classic_momentum_010 | p = m*v | m, v |

## Baselines

| Baseline | Description | Active Querying |
|----------|-------------|----------------|
| random-search | Random expression generation, select best by training MSE | No |
| greedy-symbolic-search | Least-squares fit + greedy term addition | No |
| active-random | Random query point selection + version-space filtering | Yes (random) |
| **active-infogain** | **Variance-maximizing query selection + version-space filtering** | **Yes (informed)** |
| oracle | Returns target expression directly | N/A |

> Note: passive/scaffold pending for P1.

## Scoring (P1)

```
P1Score(T) = heldoutAccuracy + symbolicEquivalentBonus - 0.01 * complexity - 0.001 * queryCost
```

## Results (seed=42, 60 synthetic + 10 classic)

### Clean (noise=0)

| Baseline | Avg Accuracy | Eq Rate | Avg Complexity | Avg Query Cost |
|----------|-------------|---------|----------------|----------------|
| random | 0.6384 | 0.4286 | 2.20 | 30.0 |
| greedy | 0.8401 | 0.6714 | 11.86 | 3.2 |
| active-random | 0.7926 | 0.5857 | 3.49 | 10.0 |
| **active-infogain** | **0.8006** | **0.5857** | **3.09** | **9.4** |
| oracle | 1.0000 | 1.0000 | 4.63 | 0.0 |

### Noisy (noise=0.05)

| Baseline | Avg Accuracy | Eq Rate | Avg Complexity | Avg Query Cost |
|----------|-------------|---------|----------------|----------------|
| random | 0.5920 | 0.4286 | 2.17 | 30.0 |
| greedy | 0.7774 | 0.0143 | 36.46 | 7.3 |
| active-random | 0.6906 | 0.5857 | 3.31 | 10.0 |
| **active-infogain** | **0.6997** | **0.5857** | **2.94** | **8.5** |
| oracle | 0.8829 | 1.0000 | 4.63 | 0.0 |

### Key Findings

1. **active-infogain significantly outperforms random** in both clean (p≈0) and noisy (p≈0) conditions.

2. **active-infogain is more robust than greedy under noise**: Greedy's eqRate drops from 0.6714 to 0.0143 under noise (overfitting), while active-infogain maintains 0.5857. This is the most important P1 finding.

3. **Greedy slightly outperforms active-infogain in clean conditions** (p≈0.000019), likely because greedy's exhaustive fitting works well without noise.

4. **Negative result honestly reported**: active-infogain does not outperform greedy in clean conditions. Its advantage is robustness under noise.

## Reproduction

```bash
# Clean benchmark
npm run p1:benchmark

# Noisy benchmark
npm run p1:benchmark:noisy
```

## Limitations

- Symbolic equivalence is approximated by numerical sampling (not rigorous)
- passive/scaffold baselines not yet implemented for P1
- LLM-based P1 baselines not yet implemented
- This is an experimental prototype, not a completed stage
