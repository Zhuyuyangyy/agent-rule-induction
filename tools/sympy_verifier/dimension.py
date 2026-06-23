"""Dimensional analysis for symbolic expressions."""

import re

import sympy
from sympy import simplify

from equivalence import parse_expression


def _parse_dimension(dim_str: str):
    """Parse a dimension string like 'M L T^-2' into a SymPy expression.

    Uses prefixed dimension symbols (_dim_L, _dim_M, _dim_T) to avoid
    collision with expression variable names.
    """
    _dim_L = sympy.Symbol("_dim_L")
    _dim_M = sympy.Symbol("_dim_M")
    _dim_T = sympy.Symbol("_dim_T")

    result = 1
    for part in dim_str.strip().split():
        if "^" in part:
            base, exp = part.split("^")
            exp_val = int(exp)
        else:
            base = part
            exp_val = 1

        base_sym = {"L": _dim_L, "M": _dim_M, "T": _dim_T}.get(base, sympy.Symbol(f"_dim_{base}"))
        result *= base_sym ** exp_val

    return result


def check_dimension(request: dict) -> dict:
    """Check dimensional homogeneity of an expression."""
    expr_str = request["expr"]
    variables = request.get("variables", {})
    expected_dim = request.get("expected_dimension", None)

    try:
        expr = parse_expression(expr_str)
    except Exception as e:
        return {"valid": False, "canonical_expr": None, "violations": [f"Parse error: {e}"]}

    # Build dimension map using SymPy symbols
    dim_symbols = {}
    for var_name, dim_str in variables.items():
        # Parse dimension string like "L^3 M^-1 T^-2" into a product
        dim_expr = _parse_dimension(dim_str)
        dim_symbols[var_name] = dim_expr

    # Substitute variables with dimension symbols
    # Use the same preprocessing as parse_expression
    var_map = {}
    for var_name, dim_expr in dim_symbols.items():
        # Convert m1 -> m_1 etc. to match parse_expression preprocessing
        processed_name = re.sub(r'([a-zA-Z])(\d+)', r'\1_\2', var_name)
        var_sym = sympy.Symbol(processed_name)
        var_map[var_sym] = dim_expr

    try:
        dim_result = expr.subs(var_map)
        dim_simplified = simplify(dim_result)
    except Exception as e:
        return {"valid": False, "canonical_expr": None, "violations": [f"Dimension computation error: {e}"]}

    violations = []

    # Check if all additive terms have the same dimension
    if expr.is_Add:
        term_dims = []
        for term in expr.args:
            term_dim = simplify(term.subs(var_map))
            term_dims.append(term_dim)
        if len(set(str(d) for d in term_dims)) > 1:
            violations.append(
                f"Inhomogeneous dimensions in additive terms: {[str(d) for d in term_dims]}"
            )

    # Check against expected dimension
    if expected_dim is not None:
        expected = _parse_dimension(expected_dim)
        if simplify(dim_simplified - expected) != 0:
            violations.append(
                f"Dimension mismatch: got {dim_simplified}, expected {expected}"
            )

    return {
        "valid": len(violations) == 0,
        "canonical_expr": str(simplify(expr)),
        "violations": violations,
    }
