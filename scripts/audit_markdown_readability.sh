#!/usr/bin/env bash
# audit_markdown_readability.sh — Check core Markdown files for overly long lines
set -euo pipefail

echo "=== Markdown Readability Audit ==="
echo ""

MAX_LINE=200
ERRORS=0

FILES=(
  "README.md"
  "docs/final_project_report.md"
  "docs/artifacts/final/final_project_report.md"
  "paper/main.md"
  "paper/reproducibility.md"
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "[SKIP] $f not found"
    continue
  fi

  over=0
  while IFS= read -r line; do
    # Skip table rows and code block markers
    if echo "$line" | grep -qE '^\|' || echo "$line" | grep -qE '^\s*```'; then
      continue
    fi
    len=${#line}
    if [ "$len" -gt "$MAX_LINE" ]; then
      over=$((over + 1))
      if [ "$over" -le 3 ]; then
        lineno=$(grep -n -F "$line" "$f" | head -1 | cut -d: -f1)
        echo "[FAIL] $f line $lineno: $len chars (max $MAX_LINE)"
      fi
    fi
  done < "$f"

  if [ "$over" -eq 0 ]; then
    echo "[OK] $f: all lines <= $MAX_LINE chars"
  else
    echo "[FAIL] $f: $over line(s) exceed $MAX_LINE chars"
    ERRORS=$((ERRORS + over))
  fi
done

# Check artifact_manifest.json is pretty-printed (not single-line)
manifest="docs/artifact_manifest.json"
if [ -f "$manifest" ]; then
  lines=$(wc -l < "$manifest")
  if [ "$lines" -lt 10 ]; then
    echo "[FAIL] $manifest: only $lines lines (likely single-line JSON)"
    ERRORS=$((ERRORS + 1))
  else
    echo "[OK] $manifest: $lines lines (pretty-printed)"
  fi
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "Markdown readability audit PASSED."
  exit 0
else
  echo "Markdown readability audit FAILED: $ERRORS issue(s) found."
  exit 1
fi
