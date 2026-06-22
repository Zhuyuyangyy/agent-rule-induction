# P4: Open-Ended Active Theory Search

## Overview

P4 explores open-ended candidate generation in controlled settings. A simulated LLM proposes candidate expressions for physics formulas, but hard verifiers and benchmarks judge them. This module measures how well different pipeline configurations handle the gap between LLM proposal quality and ground-truth verification.

**Key principle**: LLMs are used as proposal mechanisms, not final judges. External verification remains necessary.

## Architecture

```
candidateGenerator.ts  →  candidateParser.ts  →  verifierFilteredSearch.ts
     (simulate LLM)        (parse strings)         (dimensional filter)
                                                          ↓
                                                   p4Benchmark.ts
                                                  (6 baselines, metrics)
```

### candidateGenerator.ts

Template-based candidate generator that simulates LLM output:

- **Templates**: Linear, Product, Power, Inverse, Compound, Trig, Mixed, Sqrt, Division, Scaled Product, Inverse Square, Trig Product, Sqrt/Div, Scaled Sqrt/Div
- **Plausibility scoring**: Each template has a heuristic plausibility score based on dimensional consistency
- **Invalid candidates**: Intentionally generates syntax errors, wrong-dimension expressions, and nonsense strings (~15% by default)
- **Target injection**: Optionally inserts the correct formula with configurable probability

### candidateParser.ts

Recursive descent parser for candidate expression strings:

- **Supported operators**: `+`, `-`, `*`, `/`, `^`
- **Supported functions**: `sin()`, `cos()`, `sqrt()`
- **Supported atoms**: Numeric constants, named variables, parenthesized sub-expressions
- **Returns**: `{ success, expr: SymExpr | null, error: string | null }`
- **Tracks**: Parse failures contribute to hallucinationRate

### verifierFilteredSearch.ts

Dimensional verification filter using P2's `inferDimension`:

- **Input**: List of parsed SymExpr candidates, variable dimensions, expected output dimension
- **Output**: `{ passed, rejected, rejectionDetails, rejectionRate }`
- **Checks**: Dimensional homogeneity and output dimension match

### p4Benchmark.ts

Main benchmark runner with 6 baselines:

| Baseline | Description |
|----------|-------------|
| `llm_raw_candidate` | Generate candidates, pick first parseable one |
| `llm_plus_parser` | Generate candidates, pick best by train error |
| `llm_plus_verifier` | Generate candidates, filter by dimension, pick best |
| `llm_plus_active_infogain` | Generate candidates, active search with max-variance queries |
| `library_active_infogain` | P2's active_infogain on the full library (comparison) |
| `oracle` | Always correct |

**Metrics**:

| Metric | Description |
|--------|-------------|
| `parseSuccessRate` | Fraction of generated candidates that parse successfully |
| `verifierPassRate` | Fraction of parsed candidates that pass dimensional check |
| `heldoutAccuracy` | R² on heldout data |
| `correctionRecoveryRate` | Whether the correct formula was found |
| `hallucinationRate` | Fraction of candidates that are syntactically invalid |
| `invalidDimensionRate` | Fraction of parsed candidates with wrong dimensions |
| `queryCost` | Number of oracle queries used |
| `oracleGap` | 1 - R² (distance from oracle) |

## Usage

```bash
# Run with default settings
npx tsx src/p4/p4Benchmark.ts

# Custom settings
npx tsx src/p4/p4Benchmark.ts --noise 0,0.01,0.05 --budget 10 --seeds 3 --output results/p4_open_ended_search
```

### CLI Flags

- `--noise`: Comma-separated noise levels (default: `0,0.01,0.05`)
- `--budget`: Query budget for active search (default: `10`)
- `--seeds`: Number of random seeds (default: `3`)
- `--output`: Output directory (default: `results/p4_open_ended_search`)

### Output Files

- `report.md`: Full benchmark report with tables
- `summary.csv`: Aggregated metrics in CSV format
- `failure_cases.jsonl`: Per-formula failure details

## Dependencies

- P1 `symbolicExpr.ts`: SymExpr types, constructors, evaluate, complexity
- P2 `dimensionalConstraints.ts`: DimVector, inferDimension, dimEqual
- P2 `physicsFormulaLibrary.ts`: PHYSICS_FORMULAS
- P2 `p2Dataset.ts`: generatePhysicsDataset, DataPoint

## Reproducibility

All random operations use the `mulberry32` PRNG with deterministic seeds. Same inputs always produce same outputs.

## Claim Boundary

**Allowed**: P4 explores open-ended candidate generation in controlled settings. LLMs are used as proposal mechanisms, not final judges. External verification remains necessary.

**Forbidden**: The system autonomously discovers new physics. The system is a complete AI scientist. The system has solved open-ended scientific discovery.
