/**
 * Artifact writer - standardized output for benchmark results.
 */

import * as fs from "fs";
import * as path from "path";
import type { BenchmarkResult, BaselineSummary, BenchmarkConfig } from "./types.js";

/** Write benchmark artifacts to disk in standard format. */
export function writeArtifacts(
  outputPath: string,
  results: BenchmarkResult[],
  summaries: BaselineSummary[],
  config: BenchmarkConfig,
): void {
  fs.mkdirSync(outputPath, { recursive: true });

  // Write summary CSV
  const csvPath = path.join(outputPath, "summary.csv");
  writeSummaryCsv(csvPath, summaries);

  // Write failure cases JSONL
  const jsonlPath = path.join(outputPath, "failure_cases.jsonl");
  writeFailureCases(jsonlPath, results);

  // Write config
  const configPath = path.join(outputPath, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Write report
  const reportPath = path.join(outputPath, "report.md");
  writeReport(reportPath, config, summaries, results);

  // Write manifest
  const manifestPath = path.join(outputPath, "manifest.json");
  const manifest = {
    benchmark: config.benchmark,
    generatedAt: new Date().toISOString(),
    files: {
      report: "report.md",
      summary: "summary.csv",
      failureCases: "failure_cases.jsonl",
      config: "config.json",
    },
    resultCount: results.length,
    summaryCount: summaries.length,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function writeSummaryCsv(csvPath: string, summaries: BaselineSummary[]): void {
  const headers = [
    "benchmark", "baseline", "noise", "meanAccuracy",
    "ci95Low", "ci95High", "meanQueries", "failureCount", "method",
  ];
  const rows = summaries.map((s) =>
    [s.benchmark, s.baseline, s.noise, s.meanAccuracy,
     s.ci95Low, s.ci95High, s.meanQueries, s.failureCount, s.method].join(",")
  );
  fs.writeFileSync(csvPath, [headers.join(","), ...rows].join("\n"));
}

function writeFailureCases(jsonlPath: string, results: BenchmarkResult[]): void {
  const failures = results.filter((r) => r.failureType && r.failureType !== "none");
  const lines = failures.map((f) => JSON.stringify(f));
  fs.writeFileSync(jsonlPath, lines.join("\n") + (lines.length > 0 ? "\n" : ""));
}

function writeReport(
  reportPath: string,
  config: BenchmarkConfig,
  summaries: BaselineSummary[],
  results: BenchmarkResult[],
): void {
  const lines: string[] = [];
  lines.push(`# ${config.benchmark} Benchmark Report`);
  lines.push("");
  lines.push(`- **Baselines**: ${config.baselines.join(", ")}`);
  lines.push(`- **Noise levels**: ${config.noiseLevels.join(", ")}`);
  lines.push(`- **Seeds**: ${config.seeds.length}`);
  lines.push(`- **Budget**: ${config.budget} queries`);
  lines.push(`- **Total evaluations**: ${results.length}`);
  lines.push("");

  // Summary table per noise level
  for (const noise of config.noiseLevels) {
    lines.push(`## Noise = ${noise}`);
    lines.push("");
    lines.push("| Baseline | Mean Accuracy | 95% CI | Mean Queries | Failures |");
    lines.push("|----------|--------------:|-------:|-------------:|---------:|");
    const noiseSums = summaries.filter((s) => s.noise === noise);
    for (const s of noiseSums) {
      lines.push(
        `| ${s.baseline} | ${(s.meanAccuracy * 100).toFixed(1)}% ` +
        `| [${(s.ci95Low * 100).toFixed(1)}%, ${(s.ci95High * 100).toFixed(1)}%] ` +
        `| ${s.meanQueries.toFixed(1)} | ${s.failureCount} |`
      );
    }
    lines.push("");
  }

  lines.push(`*Generated: ${new Date().toISOString()}*`);
  fs.writeFileSync(reportPath, lines.join("\n"));
}
