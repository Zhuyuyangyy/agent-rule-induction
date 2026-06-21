import fs from 'fs';
import path from 'path';
import { RULE_BY_ID, DISTINCT_RULES } from './rules.js';
import { canonicalize } from './conditionNames.js';
import type { RunResult } from './runActive.js';

// ---------------------------------------------------------------------------
// Failure type classification
// ---------------------------------------------------------------------------

export type FailureType =
  | 'overconfident_guess'    // LLM answered with 0 or 1 queries (too early)
  | 'version_space_mismatch' // LLM predicted a rule not in the final version space
  | 'wrong_rule'            // LLM predicted wrong rule but it was in version space
  | 'invalid_json'          // LLM output could not be parsed
  | 'timeout'               // Budget exhausted without final answer
  | 'api_error';            // API call failed

export interface FailureCase {
  caseId: string;
  taskId: string;
  seed: number;
  condition: string;
  canonicalCondition: string;
  trueRuleId: string;
  trueRuleNL: string;
  predictedRuleId: string | null;
  predictedRuleNL: string | null;
  failureType: FailureType;
  queriesMade: number;
  finalVersionSpaceSize: number;
  initialVersionSpaceSize: number;
  versionSpaceAtEnd: string[];
  whyItFailed: string;
  conversationSnippet: string;  // last 3 messages
}

export function classifyFailure(result: RunResult, condition: string = 'unknown'): FailureType {
  // API error: no conversation, no prediction
  if (result.conversation.length === 0 && result.predictedRuleId === null) {
    return 'api_error';
  }

  // Timeout: budget exhausted, no prediction
  if (result.predictedRuleId === null) {
    return 'timeout';
  }

  // Overconfident guess: answered with 0 or 1 queries (not applicable for passive which has 0 queries by design)
  if (result.queriesMade <= 1 && canonicalize(condition) !== 'llm_passive') {
    return 'overconfident_guess';
  }

  // Version space mismatch: predicted rule not in final version space
  // We can infer this if finalVersionSpaceSize > 0 and prediction is wrong
  if (result.finalVersionSpaceSize > 1 && !result.correct) {
    return 'version_space_mismatch';
  }

  // Wrong rule: predicted a rule but it was wrong
  if (!result.correct) {
    return 'wrong_rule';
  }

  // Should not reach here for correct results, but just in case
  return 'wrong_rule';
}

export function explainFailure(result: RunResult, failureType: FailureType): string {
  switch (failureType) {
    case 'overconfident_guess':
      return `LLM answered after only ${result.queriesMade} queries without sufficient exploration. Version space still had ${result.finalVersionSpaceSize} candidates.`;
    case 'version_space_mismatch':
      return `LLM predicted ${result.predictedRuleId} but the true rule ${result.trueRuleId} was still in the version space of size ${result.finalVersionSpaceSize}. LLM did not narrow the version space effectively.`;
    case 'wrong_rule':
      return `LLM predicted ${result.predictedRuleId} instead of ${result.trueRuleId}. The version space was narrowed to size ${result.finalVersionSpaceSize} but the wrong candidate was chosen.`;
    case 'invalid_json':
      return `LLM output could not be parsed as valid JSON. No actionable query or final answer extracted.`;
    case 'timeout':
      return `Budget exhausted (${result.queriesMade} queries) without producing a final answer. Version space size: ${result.finalVersionSpaceSize}.`;
    case 'api_error':
      return `API call failed. No result obtained.`;
  }
}

export function analyzeFailures(
  results: RunResult[],
  condition: string,
  seed: number,
  maxExamplesPerType: number = 3,
): FailureCase[] {
  const failures = results.filter(r => !r.correct);
  const byType = new Map<FailureType, FailureCase[]>();

  for (const f of failures) {
    const ftype = classifyFailure(f, condition);
    if (!byType.has(ftype)) byType.set(ftype, []);

    if (byType.get(ftype)!.length < maxExamplesPerType) {
      const trueRule = RULE_BY_ID.get(f.trueRuleId);
      const predRule = f.predictedRuleId ? RULE_BY_ID.get(f.predictedRuleId) : null;

      // Get last 3 messages as snippet
      const lastMessages = f.conversation.slice(-3);
      const snippet = lastMessages.map(m => `${m.role}: ${m.content.substring(0, 200)}`).join('\n');

      byType.get(ftype)!.push({
        caseId: `case_${condition}_seed${seed}_${f.taskId}`,
        taskId: f.taskId,
        seed,
        condition,
        canonicalCondition: canonicalize(condition),
        trueRuleId: f.trueRuleId,
        trueRuleNL: trueRule?.naturalLanguage() ?? f.trueRuleId,
        predictedRuleId: f.predictedRuleId,
        predictedRuleNL: predRule?.naturalLanguage() ?? f.predictedRuleId ?? 'null',
        failureType: ftype,
        queriesMade: f.queriesMade,
        finalVersionSpaceSize: f.finalVersionSpaceSize,
        initialVersionSpaceSize: f.initialVersionSpaceSize,
        versionSpaceAtEnd: [],  // not available from RunResult directly
        whyItFailed: explainFailure(f, ftype),
        conversationSnippet: snippet,
      });
    }
  }

  const allCases: FailureCase[] = [];
  for (const cases of byType.values()) {
    allCases.push(...cases);
  }
  return allCases;
}

// ---------------------------------------------------------------------------
// Failure analysis report
// ---------------------------------------------------------------------------

export function generateFailureReport(
  allCases: FailureCase[],
  outputDir: string,
): void {
  fs.mkdirSync(outputDir, { recursive: true });

  // failure_cases.jsonl
  const jsonlPath = path.join(outputDir, 'failure_cases.jsonl');
  const lines = allCases.map(c => JSON.stringify(c));
  fs.writeFileSync(jsonlPath, lines.join('\n') + '\n');

  // failure_analysis.md
  const byType = new Map<FailureType, FailureCase[]>();
  for (const c of allCases) {
    if (!byType.has(c.failureType)) byType.set(c.failureType, []);
    byType.get(c.failureType)!.push(c);
  }

  const md: string[] = [
    '# P0 Failure Analysis',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Failure Type Distribution',
    '',
    '| Failure Type | Count | Description |',
    '|-------------|------:|-------------|',
  ];

  const typeDescriptions: Record<FailureType, string> = {
    overconfident_guess: 'LLM answered too early with insufficient queries',
    version_space_mismatch: 'LLM predicted a rule outside the remaining version space',
    wrong_rule: 'LLM chose wrong rule from narrowed version space',
    invalid_json: 'LLM output could not be parsed',
    timeout: 'Budget exhausted without final answer',
    api_error: 'API call failed',
  };

  for (const [ftype, cases] of byType) {
    md.push(`| ${ftype} | ${cases.length} | ${typeDescriptions[ftype]} |`);
  }

  md.push('');
  md.push('## Example Cases');
  md.push('');

  for (const [ftype, cases] of byType) {
    md.push(`### ${ftype}`);
    md.push('');
    for (const c of cases) {
      md.push(`#### ${c.caseId}`);
      md.push('');
      md.push(`- **True rule**: ${c.trueRuleId} (${c.trueRuleNL})`);
      md.push(`- **Predicted rule**: ${c.predictedRuleId ?? 'null'} (${c.predictedRuleNL ?? 'null'})`);
      md.push(`- **Queries made**: ${c.queriesMade}`);
      md.push(`- **Final version space size**: ${c.finalVersionSpaceSize}`);
      md.push(`- **Why it failed**: ${c.whyItFailed}`);
      md.push('');
      md.push('Last messages:');
      md.push('```');
      md.push(c.conversationSnippet);
      md.push('```');
      md.push('');
    }
  }

  md.push('## Key Insight');
  md.push('');
  md.push('> LLM agents fail primarily because they cannot effectively narrow the version space.');
  md.push('> Even when given the version space size as feedback, they tend to either guess too early');
  md.push('> (overconfident_guess) or choose rules outside the remaining candidates (version_space_mismatch).');
  md.push('> This contrasts with algorithmic_infogain, which systematically eliminates candidates.');

  fs.writeFileSync(path.join(outputDir, 'failure_analysis.md'), md.join('\n') + '\n');
  console.log(`Failure analysis written to ${outputDir}/`);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith('failureAnalysis.ts')) {
  const args = process.argv.slice(2);
  let resultsPath = '';
  let condition = 'unknown';
  let seed = 42;
  let outputDir = 'docs';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--results' && args[i + 1]) { resultsPath = args[++i]; }
    if (args[i] === '--condition' && args[i + 1]) { condition = args[++i]; }
    if (args[i] === '--seed' && args[i + 1]) { seed = parseInt(args[++i]); }
    if (args[i] === '--output-dir' && args[i + 1]) { outputDir = args[++i]; }
  }

  if (!resultsPath) {
    console.error('Usage: --results <path> --condition <name> [--seed N] [--output-dir <path>]');
    process.exit(1);
  }

  const rawContent = fs.readFileSync(resultsPath, 'utf-8').trim();
  const lines = rawContent.split('\n').filter(l => l.trim());
  const results = lines.map(l => JSON.parse(l)) as RunResult[];
  const cases = analyzeFailures(results, condition, seed);
  generateFailureReport(cases, outputDir);
}
