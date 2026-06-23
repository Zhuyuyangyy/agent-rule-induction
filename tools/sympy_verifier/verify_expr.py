"""SymPy Verifier - Minimal prototype for symbolic expression verification.

Usage:
    python verify_expr.py <request.json>
    echo '<json>' | python verify_expr.py -

Tasks:
    equivalence_check  - Check if two expressions are symbolically equivalent
    dimension_check    - Check dimensional homogeneity of an expression
    canonicalize       - Return canonical/simplified form of an expression
    limit_check        - Check limits of an expression at given points
    invariant_check    - Check invariants (conservation, symmetry, positivity)
    complexity_check   - Check expression complexity against a threshold
"""

import json
import sys
import signal
import os

# Ensure the verifier directory is on sys.path so module imports work
# when running verify_expr.py directly as a script.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from equivalence import parse_expression, check_equivalence
from dimension import check_dimension
from limits import limit_check
from invariants import invariant_check
from mdl import complexity_check
from schema import validate_request


TIMEOUT_SECONDS = 5


def _timeout_handler(signum, frame):
    raise TimeoutError("Verifier timed out")


def canonicalize_expr(request: dict) -> dict:
    """Return the canonical/simplified form of an expression."""
    expr_str = request["expr"]

    try:
        expr = parse_expression(expr_str)
        from sympy import simplify
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
    # Validate request schema first
    validation = validate_request(request)
    if not validation["valid"]:
        return {
            "valid": False,
            "canonical_expr": None,
            "violations": validation["errors"],
        }

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
        elif task == "limit_check":
            result = limit_check(request)
        elif task == "invariant_check":
            result = invariant_check(request)
        elif task == "complexity_check":
            result = complexity_check(request)
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
