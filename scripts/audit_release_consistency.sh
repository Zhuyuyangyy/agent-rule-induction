#!/usr/bin/env bash
# audit_release_consistency.sh — Verify release version consistency across all files
set -euo pipefail

echo "=== Release Consistency Audit ==="
echo ""

ERRORS=0
CURRENT_TAG="v2.0.2-publication-consistency"
CURRENT_VERSION="2.0.2"

check_contains() {
  local label="$1"
  local file="$2"
  local pattern="$3"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "[OK] $label: $file contains $pattern"
  else
    echo "[FAIL] $label: $file does NOT contain $pattern"
    ERRORS=$((ERRORS + 1))
  fi
}

check_not_contains() {
  local label="$1"
  local file="$2"
  local pattern="$3"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "[FAIL] $label: $file still contains stale '$pattern'"
    ERRORS=$((ERRORS + 1))
  else
    echo "[OK] $label: $file does not contain stale '$pattern'"
  fi
}

# README must contain current release
check_contains "README current release" "README.md" "$CURRENT_TAG"

# package.json must contain current version
check_contains "package.json version" "package.json" "\"version\": \"$CURRENT_VERSION\""

# final_project_report must contain current release
check_contains "Final report release" "docs/final_project_report.md" "$CURRENT_TAG"
check_contains "Artifacts final report" "docs/artifacts/final/final_project_report.md" "$CURRENT_TAG"

# artifact_manifest must contain current release
check_contains "Artifact manifest release" "docs/artifact_manifest.json" "$CURRENT_TAG"
check_contains "Artifact manifest version" "docs/artifact_manifest.json" "\"version\": \"$CURRENT_VERSION\""

# paper/reproducibility must contain current release
check_contains "Paper reproducibility" "paper/reproducibility.md" "$CURRENT_TAG"

# paper/main.md must contain current release
check_contains "Paper main" "paper/main.md" "$CURRENT_TAG"

# Nothing should contain stale current-release references
check_not_contains "README stale v2.0.0" "README.md" "v2.0.0-active-theory-discovery-platform"
check_not_contains "Report no pending" "docs/final_project_report.md" "(pending)"
check_not_contains "Artifacts report no pending" "docs/artifacts/final/final_project_report.md" "(pending)"

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "Release consistency audit PASSED: All versions aligned."
  exit 0
else
  echo "Release consistency audit FAILED: $ERRORS inconsistency(ies) found."
  exit 1
fi
