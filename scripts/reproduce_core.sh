#!/usr/bin/env bash
# reproduce_core.sh — Run all core benchmarks from a clean checkout
set -euo pipefail

echo "=== Active Theory Discovery: Core Reproduction ==="
echo ""

# Step 1: Install dependencies
echo "[1/6] Installing dependencies..."
npm install

# Step 2: Type check
echo "[2/6] Running typecheck..."
npm run typecheck

# Step 3: Unit tests
echo "[3/6] Running unit tests..."
npm test

# Step 4: P1 multi-noise benchmark
echo "[4/6] Running P1 multi-noise benchmark..."
npm run p1:benchmark:multi-noise

# Step 5: P2 physics-constrained benchmark
echo "[5/6] Running P2 physics-constrained benchmark..."
npm run p2:benchmark

# Step 6: P3 anomaly-driven benchmark
echo "[6/6] Running P3 anomaly-driven benchmark..."
npm run p3:benchmark

echo ""
echo "=== Core reproduction complete ==="
echo ""
echo "Note: P4 benchmark was not run (uses simulated LLM, longer runtime)."
echo "To run P4: npm run p4:benchmark"
echo ""
echo "Results written to:"
echo "  results/p1_multi_noise/"
echo "  results/p2_physics_constrained/"
echo "  results/p3_anomaly_refinement/"
