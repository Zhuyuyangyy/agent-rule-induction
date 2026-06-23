/**
 * Core types for the Active Theory Discovery benchmark suite.
 *
 * These types define the standard interfaces that all benchmarks (P0-P5)
 * should implement for consistent result formatting and metric reporting.
 */

/** A single benchmark result row. */
export interface BenchmarkResult {
  benchmark: string;
  baseline: string;
  noise: number;
  seed: number;
  /** Primary accuracy metric (0-1). */
  accuracy: number;
  /** Symbolic equivalence rate (0-1). */
  symbolicEquivalentRate: number;
  /** Number of queries used. */
  queryCount: number;
  /** Oracle gap: 1 - accuracy of best non-oracle baseline. */
  oracleGap?: number;
  /** Failure type classification. */
  failureType?: FailureType;
  /** Additional metrics specific to each benchmark. */
  extra?: Record<string, number | string>;
}

/** Standard failure type classification. */
export type FailureType =
  | "wrong_expression"
  | "oracle_gap"
  | "symbolic_mismatch"
  | "overfit_noise"
  | "high_complexity"
  | "invalid_numeric_output"
  | "query_not_informative"
  | "parse_failure"
  | "hallucination"
  | "false_positive"
  | "none";

/** Benchmark configuration. */
export interface BenchmarkConfig {
  benchmark: string;
  noiseLevels: number[];
  budget: number;
  seeds: number[];
  baselines: string[];
  outputPath: string;
}

/** Summary statistics for a baseline across seeds. */
export interface BaselineSummary {
  benchmark: string;
  baseline: string;
  noise: number;
  meanAccuracy: number;
  ci95Low: number;
  ci95High: number;
  meanQueries: number;
  failureCount: number;
  /** Computed from bootstrap or analytical CI. */
  method: "bootstrap" | "analytical";
}

/** Standard artifact output format. */
export interface ArtifactOutput {
  reportPath: string;
  summaryCsvPath: string;
  failureCasesPath: string;
  configPath: string;
  manifestPath: string;
}

/** Standard metrics computed across all benchmarks. */
export interface StandardMetrics {
  heldoutAccuracy: number;
  symbolicEquivalentRate: number;
  dimensionalValidityRate?: number;
  queryCost: number;
  complexity?: number;
  oracleGap: number;
  failureType: FailureType;
}
