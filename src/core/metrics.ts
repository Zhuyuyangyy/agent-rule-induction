/**
 * Metrics computation utilities for benchmark results.
 */

import type { BenchmarkResult, BaselineSummary } from "./types.js";

/** Compute mean of an array of numbers. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Compute standard deviation. */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Compute 95% confidence interval using bootstrap. */
export function bootstrapCI(
  values: number[],
  nBootstrap: number = 10000,
): { low: number; high: number } {
  if (values.length < 2) {
    return { low: values[0] ?? 0, high: values[0] ?? 0 };
  }

  const bootstrapMeans: number[] = [];
  for (let i = 0; i < nBootstrap; i++) {
    const sample: number[] = [];
    for (let j = 0; j < values.length; j++) {
      const idx = Math.floor(Math.random() * values.length);
      sample.push(values[idx]);
    }
    bootstrapMeans.push(mean(sample));
  }
  bootstrapMeans.sort((a, b) => a - b);

  const lowIdx = Math.floor(0.025 * bootstrapMeans.length);
  const highIdx = Math.floor(0.975 * bootstrapMeans.length);
  return { low: bootstrapMeans[lowIdx], high: bootstrapMeans[highIdx] };
}

/** Compute baseline summaries from raw results. */
export function computeSummaries(
  results: BenchmarkResult[],
): BaselineSummary[] {
  const groups = new Map<string, BenchmarkResult[]>();

  for (const r of results) {
    const key = `${r.benchmark}|${r.baseline}|${r.noise}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const summaries: BaselineSummary[] = [];
  for (const [key, group] of groups) {
    const [benchmark, baseline, noiseStr] = key.split("|");
    const noise = parseFloat(noiseStr);
    const accuracies = group.map((r) => r.accuracy);
    const queries = group.map((r) => r.queryCount);
    const failures = group.filter((r) => r.failureType && r.failureType !== "none");

    const ci = bootstrapCI(accuracies);

    summaries.push({
      benchmark,
      baseline,
      noise,
      meanAccuracy: mean(accuracies),
      ci95Low: ci.low,
      ci95High: ci.high,
      meanQueries: mean(queries),
      failureCount: failures.length,
      method: "bootstrap",
    });
  }

  return summaries;
}
