# SymPy Verifier Design Document

## Purpose

The SymPy verifier is a **sidecar hard verifier** that provides structural symbolic checks beyond numerical evaluation. It is designed to strengthen P2/P3 benchmarks by rejecting candidates that are numerically close but symbolically invalid, dimensionally inconsistent, or structurally wrong.

**Key principle**: The verifier is a judge, not a generator. It does not propose candidates. It only evaluates them.

## Architecture: TypeScript Main + Python Sidecar

### Why TypeScript Remains the Main Orchestration Layer

1. The existing P0/P1 benchmark codebase is entirely TypeScript.
2. Benchmark execution, candidate generation, active query selection, result logging, and CI all run in Node.js.
3. Rewriting the orchestration layer in Python would break reproducibility and double maintenance burden.
4. TypeScript provides deterministic, fast execution for the benchmark loop.

### Why Python/SymPy Is a Sidecar Hard Verifier

1. SymPy has no equivalent in the JavaScript/TypeScript ecosystem.
2. Symbolic manipulation (canonicalization, simplification, dimensional analysis) requires a mature CAS.
3. The verifier runs infrequently (once per candidate evaluation), so IPC overhead is acceptable.
4. The verifier is stateless — it receives a JSON request and returns a JSON response.

## JSON IPC Boundary

The TypeScript main loop communicates with the Python verifier via JSON files or stdin/stdout.

### Request Format

```json
{
  "task": "equivalence_check | dimension_check | limit_check | invariant_check | canonicalize",
  "expr": "string representation of expression",
  "target_expr": "string representation of target (for equivalence_check)",
  "variables": {
    "var_name": "dimension string (e.g., 'L', 'M', 'T', 'M L T^-2')"
  },
  "expected_dimension": "dimension string (for dimension_check)",
  "limit_variable": "variable name (for limit_check)",
  "limit_point": "value or 'inf' (for limit_check)",
  "expected_limit": "expected limit value (for limit_check)",
  "options": {
    "simplify": true,
    "tolerance": 1e-10
  }
}
```

### Response Format

```json
{
  "valid": true | false,
  "canonical_expr": "simplified/canonical form",
  "violations": ["list of violation strings"],
  "details": {
    "task_specific_fields": "..."
  }
}
```

### Example: Dimension Check Request

```json
{
  "task": "dimension_check",
  "expr": "G*m1*m2/r**2",
  "variables": {
    "G": "L^3 M^-1 T^-2",
    "m1": "M",
    "m2": "M",
    "r": "L"
  },
  "expected_dimension": "M L T^-2"
}
```

### Example: Dimension Check Response

```json
{
  "valid": true,
  "canonical_expr": "G*m1*m2/r**2",
  "violations": []
}
```

### Example: Equivalence Check Request

```json
{
  "task": "equivalence_check",
  "expr": "(x + 1)**2",
  "target_expr": "x**2 + 2*x + 1",
  "variables": {},
  "options": {
    "simplify": true
  }
}
```

### Example: Equivalence Check Response

```json
{
  "valid": true,
  "canonical_expr": "x**2 + 2*x + 1",
  "violations": []
}
```

## Symbolic Equivalence Checks

### What It Does

Given two expressions, determine whether they are symbolically equivalent after simplification.

### Method

1. Parse both expressions with SymPy's `sympify`.
2. Compute the difference: `expr1 - expr2`.
3. Simplify with `sympy.simplify` (or `trigsimp` for trigonometric expressions).
4. If the result is identically zero, the expressions are equivalent.

### Edge Cases

- Trigonometric identities: `sin(2*x)` vs `2*sin(x)*cos(x)` — requires `trigsimp`.
- Absolute values: `|x-1|` vs `x-1` — not equivalent in general; verifier should report this.
- Domain restrictions: `sqrt(x**2)` vs `|x|` — equivalent for real x but not for complex x.

## Dimensional Homogeneity Checks

### What It Does

Given an expression and variable dimensions, verify that:
1. The expression is dimensionally homogeneous (all additive terms have the same dimension).
2. The expression's dimension matches the expected dimension (if provided).

### Method

1. Parse the expression with SymPy.
2. Assign dimension symbols to each variable.
3. Compute the dimension of the full expression using SymPy's dimensional analysis.
4. Check that all additive terms have matching dimensions.
5. Compare the result dimension to the expected dimension.

### Example Violations

- `m + c**2` is invalid because `[M] != [L^2 T^-2]`.
- `v + a` is invalid because `[L T^-1] != [L T^-2]`.

## Limit / Asymptotic Checks

### What It Does

Verify that an expression has the expected limiting behavior.

### Method

1. Parse the expression with SymPy.
2. Compute `limit(expr, variable, point)` using `sympy.limit`.
3. Compare to the expected limit.

### Example

- For `sin(x)/x` as `x -> 0`, the limit should be 1.
- For `G*m1*m2/r**2` as `r -> inf`, the limit should be 0.

### Use Case in P2/P3

Limit checks can verify that physics formulas have correct asymptotic behavior (e.g., gravitational force vanishes at infinite distance).

## Invariant / Conservation Checks

### What It Does

Verify that an expression satisfies known invariants or conservation laws.

### Method

1. Define the invariant as a SymPy equation.
2. Substitute the candidate expression.
3. Verify that the equation holds.

### Example

- Energy conservation: `KE + PE = constant` for a closed system.
- Angular momentum conservation: `L = m*v*r = constant` for central force.

### Use Case in P3

In anomaly-driven refinement, conservation checks can reject candidate corrections that violate known invariants.

## Complexity / MDL Hooks

### What It Does

Compute the structural complexity of an expression, potentially using Minimum Description Length (MDL) principles.

### Method

1. Count AST nodes (already implemented in `symbolicExpr.ts`).
2. Optionally compute SymPy's `count_ops` for a Python-side complexity measure.
3. Future: MDL-based complexity that accounts for operator entropy.

### Use Case

Complexity penalty in the theory scoring function `S(T)`. More complex expressions are penalized unless they provide significantly better fit.

## Failure Modes

| Failure Mode | Description | Mitigation |
|-------------|-------------|------------|
| SymPy parse error | Expression not valid SymPy syntax | Return `valid: false` with parse error message |
| Timeout | Simplification takes too long | Set 5-second timeout; return `valid: false` on timeout |
| False negative | Equivalent expressions not recognized | Use multiple simplification strategies (`simplify`, `trigsimp`, `powsimp`) |
| False positive | Non-equivalent expressions declared equivalent | Verify on numerical test points as fallback |
| Dimension ambiguity | Variable dimensions not specified | Require dimension annotations; reject if missing |
| IPC failure | Python process crashes | TypeScript adapter handles subprocess errors gracefully |

## Integration with P2/P3

### P2: Physics-Constrained Law Rediscovery

- **Dimensional homogeneity**: Reject candidates that violate dimensional constraints.
- **Limit checks**: Verify asymptotic behavior of physics formulas.
- **Complexity penalty**: Prefer simpler expressions that fit equally well.

### P3: Anomaly-Driven Theory Refinement

- **Conservation checks**: Reject candidate corrections that violate conservation laws.
- **Dimensional homogeneity**: Ensure corrections have correct dimensions.
- **Symbolic equivalence**: Verify that proposed corrections are structurally different from baseline.

### P4: Open-Ended Active Theory Search

- **Parse validation**: Verify that LLM-generated expressions are syntactically valid.
- **Dimensional rejection**: Immediately reject dimensionally invalid candidates.
- **Hallucination detection**: Flag expressions that parse but are physically meaningless.

## What Is Explicitly Out of Scope

1. **Real physics data fitting**: The verifier checks symbolic properties, not experimental data.
2. **Automated hypothesis generation**: The verifier does not propose new expressions.
3. **Numerical optimization**: The verifier does not fit parameters.
4. **LLM integration**: The verifier does not call LLMs. It is purely symbolic.
5. **P0/P1 result modification**: The verifier is not retroactively applied to P0/P1 results.
6. **Proof of physical truth**: Dimensional validity does not imply physical correctness.
7. **Replacement for experimental validation**: Symbolic checks are necessary but not sufficient for physics.

## IPC Protocol Summary

```
TypeScript main loop
  |
  | spawn python subprocess
  v
Python/SymPy verifier
  | read JSON from stdin or file
  | perform symbolic check
  | write JSON to stdout or file
  v
TypeScript main loop
  | parse JSON response
  | use result in benchmark logic
```

## File Structure (Planned)

```
tools/sympy_verifier/
  README.md              # Usage instructions
  verify_expr.py         # Main verifier script
  requirements.txt       # Python dependencies (sympy)
  examples/              # Example JSON requests
  tests/                 # pytest tests

src/verifier/
  verifierClient.ts      # TypeScript adapter
  README.md              # Adapter usage
```
