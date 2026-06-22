# SymPy Verifier

Minimal prototype for symbolic expression verification using SymPy.

## Setup

```bash
pip install -r requirements.txt
```

## Usage

```bash
# Check equivalence
python verify_expr.py examples/equivalence_pass.json
python verify_expr.py examples/equivalence_fail.json

# Check dimensions
python verify_expr.py examples/dimension_pass.json
python verify_expr.py examples/dimension_fail.json

# Stdin mode
echo '{"task": "canonicalize", "expr": "x**2 + 2*x + 1"}' | python verify_expr.py -
```

## Tests

```bash
python -m pytest tests/
```

## Supported Tasks

| Task | Description |
|------|-------------|
| `equivalence_check` | Check if two expressions are symbolically equivalent |
| `dimension_check` | Check dimensional homogeneity |
| `canonicalize` | Return simplified/canonical form |

## Design

See `docs/sympy_verifier_design.md` for full design document.
