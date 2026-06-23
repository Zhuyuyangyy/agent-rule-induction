#!/usr/bin/env bash
# audit_claims.sh — Check that no forbidden claims appear in affirmative form
set -euo pipefail

echo "=== Claim Audit ==="
echo ""

FORBIDDEN_PATTERNS=(
  "discovers new physical laws"
  "AI scientist is complete"
  "surpasses relativity"
  "discovers deeper physics"
  "deeper theory than relativity"
  "discovered general relativity"
  "solved Mercury"
  "autonomously discovers new physics"
  "solves scientific discovery"
)

FOUND=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  echo "Checking: $pattern"
  matches=$(grep -RniE "$pattern" README.md docs paper src tools 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "  FOUND (checking context...):"
    echo "$matches" | while IFS= read -r line; do
      # Check if it's in a forbidden list or negated context
      if echo "$line" | grep -qiE "forbidden|not claim|does not|unsupported|not discover|cannot|no evidence"; then
        echo "  [OK - in allowed context] $line"
      else
        echo "  [VIOLATION - affirmative forbidden claim] $line"
        FOUND=1
      fi
    done
  else
    echo "  [OK - not found]"
  fi
done

echo ""
if [ "$FOUND" -eq 0 ]; then
  echo "Claim audit PASSED: No affirmative forbidden claims found."
  exit 0
else
  echo "Claim audit FAILED: Affirmative forbidden claims detected."
  exit 1
fi
