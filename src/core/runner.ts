#!/usr/bin/env node
/**
 * Unified benchmark runner for the Active Theory Discovery suite.
 *
 * Usage:
 *   npx tsx src/core/runner.ts --benchmark p1 --noise 0,0.01,0.05 --budget 10 --seeds 3
 *   npx tsx src/core/runner.ts --benchmark all
 *
 * Note: The individual benchmark scripts (npm run p1:benchmark, etc.)
 * remain the primary entry points. This runner provides a unified interface.
 */

import { parseArgs } from "node:util";

async function main() {
  const { values } = parseArgs({
    options: {
      benchmark: { type: "string", default: "all" },
      noise: { type: "string", default: "0,0.01,0.05" },
      budget: { type: "string", default: "10" },
      seeds: { type: "string", default: "3" },
      output: { type: "string", default: "results" },
    },
    strict: true,
  });

  const benchmark = values.benchmark!;
  const noiseLevels = values.noise!.split(",").map(Number);
  const budget = parseInt(values.budget!, 10);
  const seedCount = parseInt(values.seeds!, 10);
  const outputBase = values.output!;

  const benchmarks = benchmark === "all"
    ? ["p1", "p2", "p3", "p4"]
    : [benchmark];

  console.log("=== Active Theory Discovery: Unified Benchmark Runner ===");
  console.log(`Benchmarks: ${benchmarks.join(", ")}`);
  console.log(`Noise levels: ${noiseLevels.join(", ")}`);
  console.log(`Budget: ${budget}, Seeds: ${seedCount}`);
  console.log(`Output: ${outputBase}`);
  console.log("");

  console.log("Note: Individual benchmark scripts are the primary entry points.");
  console.log("Use the following commands for full benchmark execution:");
  console.log("  npm run p1:benchmark:multi-noise");
  console.log("  npm run p2:benchmark");
  console.log("  npm run p3:benchmark");
  console.log("  npm run p4:benchmark");
  console.log("");

  console.log("The unified runner provides a single entry point for orchestration.");
  console.log("Core library (src/core/) provides shared types, metrics, and artifact writing.");
}

main().catch(console.error);
