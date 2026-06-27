#!/usr/bin/env bash
# audit_artifacts.sh — Verify that all declared artifact paths exist
set -euo pipefail

echo "=== Artifact Audit ==="
echo ""

ERRORS=0

check_artifact() {
  local label="$1"
  local path="$2"
  if [ -e "$path" ]; then
    echo "[OK] $label: $path"
  else
    echo "[MISSING] $label: $path"
    ERRORS=$((ERRORS + 1))
  fi
}

# P1 artifacts
check_artifact "P1 report" "docs/artifacts/p1_multi_noise/report.md"
check_artifact "P1 summary" "docs/artifacts/p1_multi_noise/summary.csv"
check_artifact "P1 failures" "docs/artifacts/p1_multi_noise/failure_cases.jsonl"

# P2 artifacts
check_artifact "P2 report" "docs/artifacts/p2_physics_constrained/report.md"
check_artifact "P2 summary" "docs/artifacts/p2_physics_constrained/summary.csv"
check_artifact "P2 failures" "docs/artifacts/p2_physics_constrained/failure_cases.jsonl"

# P3 artifacts
check_artifact "P3 report" "docs/artifacts/p3_anomaly_refinement/report.md"
check_artifact "P3 summary" "docs/artifacts/p3_anomaly_refinement/summary.csv"
check_artifact "P3 failures" "docs/artifacts/p3_anomaly_refinement/failure_cases.jsonl"

# P4 archived artifacts
check_artifact "P4 report" "docs/artifacts/p4_open_ended_search/report.md"
check_artifact "P4 summary" "docs/artifacts/p4_open_ended_search/summary.csv"
check_artifact "P4 failures" "docs/artifacts/p4_open_ended_search/failure_cases.jsonl"

# P5 archived artifacts
check_artifact "P5 report" "docs/artifacts/p5_causal_mechanism/report.md"
check_artifact "P5 summary" "docs/artifacts/p5_causal_mechanism/summary.csv"
check_artifact "P5 failures" "docs/artifacts/p5_causal_mechanism/failure_cases.jsonl"

# Final report
check_artifact "Final report" "docs/artifacts/final/final_project_report.md"

# Source files
check_artifact "P2 source" "src/p2/p2Benchmark.ts"
check_artifact "P3 source" "src/p3/p3Benchmark.ts"
check_artifact "P4 source" "src/p4/p4Benchmark.ts"
check_artifact "P5 source" "src/p5/p5Benchmark.ts"
check_artifact "Verifier source" "src/verifier/verifierClient.ts"
check_artifact "SymPy verifier" "tools/sympy_verifier/verify_expr.py"

# Paper
check_artifact "Paper draft" "paper/draft.md"
check_artifact "Claims ledger" "paper/claims.md"
check_artifact "Limitations" "paper/limitations.md"
check_artifact "Reproducibility" "paper/reproducibility.md"

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "Artifact audit PASSED: All declared artifacts exist."
  exit 0
else
  echo "Artifact audit FAILED: $ERRORS artifact(s) missing."
  exit 1
fi
