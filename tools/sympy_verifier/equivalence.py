"""Equivalence checking for symbolic expressions."""

import sympy
from sympy import simplify, trigsimp, powsimp


def parse_expression(expr_str: str):
    """Parse a string expression into a SymPy expression.

    Uses implicit multiplication but converts numbered variable names
    (like m1, m2) into subscripted symbols to avoid m1 being parsed as m*1.
    """
    from sympy.parsing.sympy_parser import (
        parse_expr,
        standard_transformations,
        implicit_multiplication_application,
    )

    # Pre-process: replace numbered variable names like m1 -> m_1, r2 -> r_2
    import re
    processed = re.sub(r'([a-zA-Z])(\d+)', r'\1_\2', expr_str)

    transformations = standard_transformations + (
        implicit_multiplication_application,
    )
    return parse_expr(processed, transformations=transformations, evaluate=False)


def check_equivalence(request: dict) -> dict:
    """Check if two expressions are symbolically equivalent."""
    expr1_str = request["expr"]
    expr2_str = request["target_expr"]
    options = request.get("options", {})
    tolerance = options.get("tolerance", 1e-10)

    try:
        expr1 = parse_expression(expr1_str)
        expr2 = parse_expression(expr2_str)
    except Exception as e:
        return {"valid": False, "canonical_expr": None, "violations": [f"Parse error: {e}"]}

    try:
        diff = expr1 - expr2
        simplified = simplify(diff)

        if simplified == 0:
            return {
                "valid": True,
                "canonical_expr": str(simplify(expr1)),
                "violations": [],
            }

        # Try trigonometric simplification
        trig_simplified = trigsimp(diff)
        if trig_simplified == 0:
            return {
                "valid": True,
                "canonical_expr": str(simplify(expr1)),
                "violations": [],
            }

        # Try power simplification
        pow_simplified = powsimp(diff)
        if pow_simplified == 0:
            return {
                "valid": True,
                "canonical_expr": str(simplify(expr1)),
                "violations": [],
            }

        return {
            "valid": False,
            "canonical_expr": str(simplify(expr1)),
            "violations": [f"Expressions differ: {expr1_str} != {expr2_str}"],
        }
    except Exception as e:
        return {"valid": False, "canonical_expr": None, "violations": [f"Simplification error: {e}"]}
