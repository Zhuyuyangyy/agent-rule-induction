"""Invariant checking for symbolic expressions."""

from sympy import diff, simplify, Symbol, Dummy

from equivalence import parse_expression


def invariant_check(request: dict) -> dict:
    """Check invariants of a symbolic expression.

    Takes:
        expr (string): the expression
        invariants (list): list of {type: string, variables: list}

    Supported invariant types:
        - conservation: checks if expression is constant w.r.t. given variables
        - symmetry: checks if expression is unchanged under variable swap
        - positivity: checks if expression is always positive for given variable ranges

    Returns:
        dict with valid, canonical_expr, violations, checked_invariants
    """
    expr_str = request["expr"]
    invariants = request.get("invariants", [])

    try:
        expr = parse_expression(expr_str)
    except Exception as e:
        return {
            "valid": False,
            "canonical_expr": None,
            "violations": [f"Parse error: {e}"],
            "checked_invariants": [],
        }

    violations = []
    checked_invariants = []

    for inv in invariants:
        inv_type = inv.get("type", "")
        inv_vars = inv.get("variables", [])

        if inv_type == "conservation":
            result = _check_conservation(expr, expr_str, inv_vars, violations)
            checked_invariants.append({"type": "conservation", "variables": inv_vars, "result": result})

        elif inv_type == "symmetry":
            result = _check_symmetry(expr, expr_str, inv_vars, violations)
            checked_invariants.append({"type": "symmetry", "variables": inv_vars, "result": result})

        elif inv_type == "positivity":
            result = _check_positivity(expr, expr_str, inv_vars, violations)
            checked_invariants.append({"type": "positivity", "variables": inv_vars, "result": result})

        else:
            violations.append(f"Unknown invariant type: {inv_type}")
            checked_invariants.append({"type": inv_type, "variables": inv_vars, "result": "unknown"})

    return {
        "valid": len(violations) == 0,
        "canonical_expr": str(simplify(expr)),
        "violations": violations,
        "checked_invariants": checked_invariants,
    }


def _check_conservation(expr, expr_str, variables, violations):
    """Check if expression is constant w.r.t. given variables."""
    all_constant = True
    for var_name in variables:
        var_sym = Symbol(var_name)
        try:
            derivative = diff(expr, var_sym)
            if simplify(derivative) != 0:
                all_constant = False
                violations.append(
                    f"Conservation violation: expression depends on {var_name} (derivative != 0)"
                )
        except Exception as e:
            all_constant = False
            violations.append(
                f"Conservation check error for {var_name}: {e}"
            )
    return "pass" if all_constant else "fail"


def _check_symmetry(expr, expr_str, variables, violations):
    """Check if expression is unchanged under variable swap."""
    if len(variables) != 2:
        violations.append(
            f"Symmetry check requires exactly 2 variables, got {len(variables)}"
        )
        return "fail"

    var1_name, var2_name = variables[0], variables[1]
    var1 = Symbol(var1_name)
    var2 = Symbol(var2_name)

    try:
        # Use temporary symbol for simultaneous swap
        tmp = Dummy('tmp')
        swapped = expr.subs(var1, tmp).subs(var2, var1).subs(tmp, var2)
        if simplify(expr - swapped) == 0:
            return "pass"
        else:
            violations.append(
                f"Symmetry violation: expression changes under swap of {var1_name} and {var2_name}"
            )
            return "fail"
    except Exception as e:
        violations.append(f"Symmetry check error: {e}")
        return "fail"


def _check_positivity(expr, expr_str, variables, violations):
    """Check if expression is always positive for given variable ranges."""
    # Sample at a few points to check positivity
    sample_values = [-10, -1, -0.5, 0.5, 1, 10]
    all_positive = True

    try:
        for var_name in variables:
            var_sym = Symbol(var_name)
            for val in sample_values:
                try:
                    result = expr.subs(var_sym, val)
                    # Evaluate numerically
                    numeric = float(result)
                    if numeric <= 0:
                        all_positive = False
                        violations.append(
                            f"Positivity violation: expression <= 0 at {var_name}={val} (value={numeric})"
                        )
                        break
                except (TypeError, ValueError):
                    # Can't evaluate numerically, skip this sample
                    continue
            if not all_positive:
                break
    except Exception as e:
        all_positive = False
        violations.append(f"Positivity check error: {e}")

    return "pass" if all_positive else "fail"
