"""Tests for the SymPy verifier prototype."""

import json
import subprocess
import sys
import os

import pytest

VERIFIER = os.path.join(os.path.dirname(__file__), "..", "verify_expr.py")
EXAMPLES = os.path.join(os.path.dirname(__file__), "..", "examples")


def run_verifier(request_path: str) -> dict:
    """Run the verifier on a JSON request file and return the parsed result."""
    result = subprocess.run(
        [sys.executable, VERIFIER, request_path],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, f"Verifier failed: {result.stderr}"
    return json.loads(result.stdout)


class TestEquivalence:
    def test_equivalence_pass(self):
        """(x+1)^2 should be equivalent to x^2 + 2x + 1"""
        path = os.path.join(EXAMPLES, "equivalence_pass.json")
        result = run_verifier(path)
        assert result["valid"] is True
        assert len(result["violations"]) == 0

    def test_equivalence_fail(self):
        """x^2 should NOT be equivalent to x^3"""
        path = os.path.join(EXAMPLES, "equivalence_fail.json")
        result = run_verifier(path)
        assert result["valid"] is False
        assert len(result["violations"]) > 0

    def test_trig_equivalence(self):
        """sin(2*x) should be equivalent to 2*sin(x)*cos(x)"""
        request = {
            "task": "equivalence_check",
            "expr": "sin(2*x)",
            "target_expr": "2*sin(x)*cos(x)",
            "variables": {},
            "options": {"simplify": True},
        }
        result = subprocess.run(
            [sys.executable, VERIFIER, "-"],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            timeout=30,
        )
        parsed = json.loads(result.stdout)
        assert parsed["valid"] is True


class TestDimension:
    def test_dimension_pass(self):
        """G*m1*m2/r^2 should have dimension of force (M L T^-2)"""
        path = os.path.join(EXAMPLES, "dimension_pass.json")
        result = run_verifier(path)
        assert result["valid"] is True
        assert len(result["violations"]) == 0

    def test_dimension_fail(self):
        """m + c^2 should fail dimensional check (M != L^2 T^-2)"""
        path = os.path.join(EXAMPLES, "dimension_fail.json")
        result = run_verifier(path)
        assert result["valid"] is False
        assert len(result["violations"]) > 0


class TestCanonicalize:
    def test_canonicalize(self):
        """Canonicalization should simplify expressions."""
        request = {
            "task": "canonicalize",
            "expr": "x**2 + 2*x + 1",
            "variables": {},
        }
        result = subprocess.run(
            [sys.executable, VERIFIER, "-"],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            timeout=30,
        )
        parsed = json.loads(result.stdout)
        assert parsed["valid"] is True
        assert parsed["canonical_expr"] is not None
