// P1 Failure Analysis
// Classifies and reports failure cases from the P1 benchmark.

import fs from 'fs';
import path from 'path';
import { type P1Metrics } from './p1Score.js';
import { ALL_FORMULAS, FORMULA_BY_ID, type FormulaEntry } from './formulaLibrary.js';
import { toString } from './symbolicExpr.js';

// ---------------------------------------------------------------------------
// Failure types
// ---------------------------------------------------------------------------

export type P1FailureType =
  | 'wrong_expression'       // predicted a different (non-equivalent) expression
  | 'overfit_noise'          // high train accuracy but low heldout accuracy
  | 'symbolic_mismatch'      // numerically close but symbolically different
  | 'high_complexity'        // predicted expression is much more complex than target
  | 'invalid_numeric_output' // predicted expression produces NaN/Inf
  | 'query_not_informative'  // queries didn't reduce candidate set
  | 'oracle_gap';            // significant gap between prediction and oracle

// ---------------------------------------------------------------------------
// Failure case
// ---------------------------------------------------------------------------

export interface P1FailureCase {
  formula_id: string;
  target_expr: string;
  predicted_expr: string;
  baseline: string;
  noise_level: number;
  heldout_accuracy: number;
  symbolic_equivalent: boolean;
  failure_type: P1FailureType;
  why_it_failed: string;
}

// ---------------------------------------------------------------------------
// Classify failure
// ---------------------------------------------------------------------------

export function classifyFailure(m: P1Metrics): P1FailureType | null {
  // Not a failure if symbolically equivalent
  if (m.symbolicEquivalent) return null;
  // Not a failure for oracle (by definition)
  if (m.baseline === 'oracle') return null;

  // Random search always gets wrong expression (no querying)
  if (m.baseline === 'random_search') {
    return 'wrong_expression';
  }

  // Oracle gap: R² is significantly below 1.0
  if (m.heldoutAccuracy < 0.5) {
    return 'oracle_gap';
  }

  // Symbolic mismatch: high R² but not symbolically equivalent
  if (m.heldoutAccuracy >= 0.9 && !m.symbolicEquivalent) {
    return 'symbolic_mismatch';
  }

  // Overfit noise: moderate R² with noise present
  if (m.noiseLevel > 0 && m.heldoutAccuracy < 0.9 && m.heldoutAccuracy >= 0.5) {
    return 'overfit_noise';
  }

  // Invalid numeric output: R² = 0 for active methods
  if (m.heldoutAccuracy === 0 && m.complexity > 0) {
    return 'invalid_numeric_output';
  }

  // Query not informative: candidate set barely reduced
  if (m.candidateSetSize > 100 && m.queryCost > 0) {
    return 'query_not_informative';
  }

  // High complexity: predicted expression is very complex
  if (m.complexity > 20) {
    return 'high_complexity';
  }

  // Default: wrong expression
  return 'wrong_expression';
}

// ---------------------------------------------------------------------------
// Generate failure explanation
// ---------------------------------------------------------------------------

export function explainFailure(m: P1Metrics, failureType: P1FailureType): string {
  const targetFormula = FORMULA_BY_ID.get(m.formulaId);
  const targetStr = targetFormula ? toString(targetFormula.expr) : m.formulaId;

  switch (failureType) {
    case 'wrong_expression':
      return `Predicted a different expression for ${m.formulaId} (${targetStr}). R²=${m.heldoutAccuracy.toFixed(4)}, candidate set reduced to ${m.candidateSetSize}.`;
    case 'overfit_noise':
      return `Overfit to noise at level ${m.noiseLevel}. R²=${m.heldoutAccuracy.toFixed(4)} for ${m.formulaId}. The baseline fit noise patterns rather than the true function.`;
    case 'symbolic_mismatch':
      return `Numerically close (R²=${m.heldoutAccuracy.toFixed(4)}) but symbolically different for ${m.formulaId}. The predicted expression approximates the target but is not the same symbolic form.`;
    case 'high_complexity':
      return `Predicted expression has complexity ${m.complexity} for ${m.formulaId}. The expression is overly complex relative to the target.`;
    case 'invalid_numeric_output':
      return `Predicted expression produces invalid output (R²=0) for ${m.formulaId}. The expression likely evaluates to NaN or Infinity on test points.`;
    case 'query_not_informative':
      return `Queries did not effectively reduce candidate set (${m.candidateSetSize} remaining after ${m.queryCost} queries) for ${m.formulaId}.`;
    case 'oracle_gap':
      return `Large gap from oracle: R²=${m.heldoutAccuracy.toFixed(4)} for ${m.formulaId}. The baseline failed to identify the correct expression.`;
  }
}

// ---------------------------------------------------------------------------
// Analyze failures from metrics
// ---------------------------------------------------------------------------

export function analyzeFailures(allMetrics: P1Metrics[]): P1FailureCase[] {
  const failures: P1FailureCase[] = [];

  for (const m of allMetrics) {
    const failureType = classifyFailure(m);
    if (!failureType) continue;

    const targetFormula = FORMULA_BY_ID.get(m.formulaId);
    const targetStr = targetFormula ? toString(targetFormula.expr) : m.formulaId;

    // For predicted expression, we'd need the actual predicted formula
    // Since metrics don't store the predicted formula, we use a placeholder
    failures.push({
      formula_id: m.formulaId,
      target_expr: targetStr,
      predicted_expr: '(see failure_cases.jsonl for details)',
      baseline: m.baseline,
      noise_level: m.noiseLevel,
      heldout_accuracy: m.heldoutAccuracy,
      symbolic_equivalent: m.symbolicEquivalent,
      failure_type: failureType,
      why_it_failed: explainFailure(m, failureType),
    });
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Generate failure analysis report
// ---------------------------------------------------------------------------

export function generateFailureReport(allMetrics: P1Metrics[], outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });

  const failures = analyzeFailures(allMetrics);

  // Count by type
  const byType = new Map<P1FailureType, number>();
  for (const f of failures) {
    byType.set(f.failure_type, (byType.get(f.failure_type) ?? 0) + 1);
  }

  // Count by baseline
  const byBaseline = new Map<string, number>();
  for (const f of failures) {
    byBaseline.set(f.baseline, (byBaseline.get(f.baseline) ?? 0) + 1);
  }

  // Generate report
  const lines: string[] = [
    '# P1 Failure Analysis',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total failure cases: ${failures.length}`,
    '',

    '## Failure Types',
    '',
    '| Type | Count |',
    '|------|------:|',
  ];

  for (const [type, count] of byType) {
    lines.push(`| ${type} | ${count} |`);
  }

  lines.push('');
  lines.push('## Failures by Baseline');
  lines.push('');
  lines.push('| Baseline | Failure Count |');
  lines.push('|----------|-------------:|');
  for (const [baseline, count] of byBaseline) {
    lines.push(`| ${baseline} | ${count} |`);
  }

  // Example cases per type
  lines.push('');
  lines.push('## Example Cases by Failure Type');
  lines.push('');

  const typeGroups = new Map<P1FailureType, P1FailureCase[]>();
  for (const f of failures) {
    if (!typeGroups.has(f.failure_type)) typeGroups.set(f.failure_type, []);
    typeGroups.get(f.failure_type)!.push(f);
  }

  for (const [type, cases] of typeGroups) {
    lines.push(`### ${type}`);
    lines.push('');
    const examples = cases.slice(0, 3);
    for (const ex of examples) {
      lines.push(`- **${ex.formula_id}** (baseline: ${ex.baseline}, noise: ${ex.noise_level})`);
      lines.push(`  - Target: \`${ex.target_expr}\``);
      lines.push(`  - R²: ${ex.heldout_accuracy.toFixed(4)}`);
      lines.push(`  - Why: ${ex.why_it_failed}`);
      lines.push('');
    }
  }

  fs.writeFileSync(path.join(outputDir, 'p1_failure_analysis.md'), lines.join('\n') + '\n');
  console.log(`Failure analysis written to ${outputDir}/p1_failure_analysis.md`);
}
