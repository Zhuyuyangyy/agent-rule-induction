"""Limit checking for symbolic expressions."""

from sympy import limit, oo, Symbol, simplify

from equivalence import parse_expression


def limit_check(request: dict) -> dict:
    """Check limits of a symbolic expression.

    Takes:
        expr (string): the expression
        test_point (dict): variable:value pairs, e.g. {"v": 0, "c": 1}
        expected_limit (string or null): expected limit value
        direction (string): "+" or "-", approach direction

    Returns:
        dict with valid, canonical_expr, violations, computed_limit
    """
    expr_str = request["expr"]
    test_point = request.get("test_point", {})
    expected_limit_str = request.get("expected_limit", None)
    direction = request.get("direction", "+")

    try:
        expr = parse_expression(expr_str)
    except Exception as e:
        return {
            "valid": False,
            "canonical_expr": None,
            "violations": [f"Parse error: {e}"],
            "computed_limit": None,
        }

    violations = []
    computed_limits = {}

    try:
        for var_name, test_value in test_point.items():
            var_sym = Symbol(var_name)

            # Parse test_value if it's a string, otherwise use directly
            if isinstance(test_value, str):
                if test_value in ("oo", "inf", "infinity"):
                    test_val = oo
                elif test_value in ("-oo", "-inf", "-infinity"):
                    test_val = -oo
                else:
                    test_val = parse_expression(test_value)
            else:
                test_val = test_value

            # Map direction string to SymPy direction
            dir_arg = "+" if direction == "+" else "-"

            try:
                computed = limit(expr, var_sym, test_val, dir_arg)
                if computed is not None and str(computed) != "nan":
                    computed_limits[var_name] = str(computed)
                else:
                    computed_limits[var_name] = None
            except Exception:
                computed_limits[var_name] = None

    except Exception as e:
        return {
            "valid": False,
            "canonical_expr": None,
            "violations": [f"Limit computation error: {e}"],
            "computed_limit": None,
        }

    # Build a single computed_limit string for the response
    computed_limit_str = str(computed_limits) if computed_limits else None

    # Check against expected limit if provided
    if expected_limit_str is not None:
        try:
            # Handle infinity special cases
            if expected_limit_str in ("oo", "inf", "infinity"):
                expected = oo
            elif expected_limit_str in ("-oo", "-inf", "-infinity"):
                expected = -oo
            else:
                expected = parse_expression(expected_limit_str)

            for var_name, comp_str in computed_limits.items():
                if comp_str is None:
                    violations.append(
                        f"Limit does not exist for variable {var_name}"
                    )
                    continue
                # Handle infinity in computed result
                if comp_str in ("oo", "inf", "infinity"):
                    computed_val = oo
                elif comp_str in ("-oo", "-inf", "-infinity"):
                    computed_val = -oo
                else:
                    computed_val = parse_expression(comp_str)

                # Compare: for infinity, use direct equality; otherwise simplify
                if computed_val == expected:
                    continue
                try:
                    if simplify(computed_val - expected) == 0:
                        continue
                except Exception:
                    pass
                violations.append(
                    f"Limit mismatch for {var_name}: got {comp_str}, expected {expected_limit_str}"
                )
        except Exception as e:
            violations.append(f"Expected limit parse error: {e}")

    return {
        "valid": len(violations) == 0,
        "canonical_expr": str(simplify(expr)),
        "violations": violations,
        "computed_limit": computed_limit_str,
    }
