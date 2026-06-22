"""SymPy Verifier - Minimal prototype for symbolic expression verification.

Usage:
    python verify_expr.py <request.json>
    echo '<json>' | python verify_expr.py -

Tasks:
    equivalence_check  - Check if two expressions are symbolically equivalent
    dimension_check    - Check dimensional homogeneity of an expression
    canonicalize       - Return canonical/simplified form of an expression
"""

import json
import sys
import signal

import sympy
from sympy import symbols, simplify, trigsimp, powsimp, limit, oo
from sympy.parsing.sympy_parser import parse_expr


TIMEOUT_SECONDS = 5


def _timeout_handler(signum, frame):
    raise TimeoutError("Verifier timed out")


def parse_expression(expr_str: str):
    """Parse a string expression into a SymPy expression.

    Uses implicit multiplication but converts numbered variable names
    (like m1, m2) into subscripted symbols to avoid m1 being parsed as m*1.
    """
    from sympy.parsing.sympy_parser import (
        parse_expr,
        standard_transformations,
        implicit_multiplication_application,
        convert_xor,
        split_symbols_custom,
        _token_splittable,
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
    import re
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


def canonicalize_expr(request: dict) -> dict:
    """Return the canonical/simplified form of an expression."""
    expr_str = request["expr"]

    try:
        expr = parse_expression(expr_str)
        canonical = simplify(expr)
        return {
            "valid": True,
            "canonical_expr": str(canonical),
            "violations": [],
        }
    except Exception as e:
        return {"valid": False, "canonical_expr": None, "violations": [f"Canonicalization error: {e}"]}


def process_request(request: dict) -> dict:
    """Process a single verification request."""
    task = request.get("task", "")

    # Set timeout
    signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(TIMEOUT_SECONDS)

    try:
        if task == "equivalence_check":
            result = check_equivalence(request)
        elif task == "dimension_check":
            result = check_dimension(request)
        elif task == "canonicalize":
            result = canonicalize_expr(request)
        else:
            result = {
                "valid": False,
                "canonical_expr": None,
                "violations": [f"Unknown task: {task}"],
            }
    except TimeoutError:
        result = {
            "valid": False,
            "canonical_expr": None,
            "violations": ["Verifier timed out"],
        }
    finally:
        signal.alarm(0)

    return result


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python verify_expr.py <request.json>", file=sys.stderr)
        print("       echo '<json>' | python verify_expr.py -", file=sys.stderr)
        sys.exit(1)

    source = sys.argv[1]

    if source == "-":
        request = json.load(sys.stdin)
    else:
        with open(source) as f:
            request = json.load(f)

    result = process_request(request)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
