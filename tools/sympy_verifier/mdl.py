"""Complexity checking for symbolic expressions (MDL - Minimum Description Length)."""

from sympy import simplify

from equivalence import parse_expression


def complexity_check(request: dict) -> dict:
    """Check the complexity of a symbolic expression.

    Takes:
        expr (string): the expression
        max_complexity (int, default 50): maximum allowed complexity

    Returns:
        dict with valid, canonical_expr, violations, complexity
    """
    expr_str = request["expr"]
    max_complexity = request.get("max_complexity", 50)

    try:
        expr = parse_expression(expr_str)
    except Exception as e:
        return {
            "valid": False,
            "canonical_expr": None,
            "violations": [f"Parse error: {e}"],
            "complexity": None,
        }

    try:
        # Use count_ops for node count in expression tree
        complexity = expr.count_ops()
    except Exception:
        # Fallback to string length
        complexity = len(str(expr))

    violations = []
    if complexity > max_complexity:
        violations.append(
            f"Complexity {complexity} exceeds maximum {max_complexity}"
        )

    return {
        "valid": len(violations) == 0,
        "canonical_expr": str(simplify(expr)),
        "violations": violations,
        "complexity": complexity,
    }
