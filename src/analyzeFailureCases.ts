// P0 Failure case analysis: extract detailed failure cases from multi-seed results.
// Generates docs/failure_analysis.md with per-case breakdown.
//
// Usage:
//   npx tsx src/analyzeFailureCases.ts --result-dir results/p0_multi_seed

import fs from 'fs';
import path from 'path';
import { computeFailureType, ALL_FAILURE_TYPES, type FailureType } from './metrics.js';
import type { RunResult } from './runActive.js';
import type { Task } from './taskGenerator.js';
import { RULE_BY_ID } from './rules.js';

interface FailureCaseDetail {
  caseId: string;
  seed: number;
  condition: string;
  taskId: string;
  trueRuleId: string;
  predictedRuleId: string | null;
  failureType: FailureType;
  queriesMade: number;
  finalVersionSpaceSize: number;
  initialVersionSpaceSize: number;
  observations: string;
  lastAssistantMessage: string;
  whyItFailed: string;
}

function analyzeWhyItFailed(case_: {
  failureType: FailureType;
  trueRuleId: string;
  predictedRuleId: string | null;
  finalVersionSpaceSize: number;
  queriesMade: number;
  lastAssistantMessage: string;
}): string {
  switch (case_.failureType) {
    case 'overconfident_guess':
      return `LLM predicted "${case_.predictedRuleId}" when version space still had ${case_.finalVersionSpaceSize} candidates. ` +
        `The model did not use enough queries to narrow down the hypothesis space before committing to an answer.`;
    case 'version_space_mismatch':
      return `Version space still had ${case_.finalVersionSpaceSize} candidates after all queries. ` +
        `The query strategy was insufficient to discriminate between remaining rules.`;
    case 'wrong_rule':
      return `Version space was reduced to 1, but the predicted rule "${case_.predictedRuleId}" was wrong. ` +
        `This suggests a bug in the version-space update logic or the model picked a rule outside the version space.`;
    case 'timeout':
      return `The model ran out of turns without producing a final answer. ` +
        `Last response: "${case_.lastAssistantMessage.substring(0, 200)}"`;
    case 'invalid_json':
      return `The model's response could not be parsed as valid JSON. ` +
        `Last response: "${case_.lastAssistantMessage.substring(0, 200)}"`;
    case 'api_error':
      return `API call failed, preventing task completion.`;
    default:
      return `Unknown failure type.`;
  }
}

function getLastAssistantMessage(conversation: any[]): string {
  for (let i = conversation.length - 1; i >= 0; i--) {
    if (conversation[i].role === 'assistant') return conversation[i].content || '';
  }
  return '';
}

function main() {
  const args = process.argv.slice(2);
  let resultDir = 'results/p0_multi_seed';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--result-dir' && args[i + 1]) { resultDir = args[i + 1]; i++; }
  }

  const allCases: FailureCaseDetail[] = [];
  const failureByType: Record<string, number> = {};
  for (const ft of ALL_FAILURE_TYPES) failureByType[ft] = 0;

  // Scan seed directories
  const seedDirs = fs.readdirSync(resultDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('seed_'))
    .sort();

  for (const seedDir of seedDirs) {
    const seed = parseInt(seedDir.name.replace('seed_', ''));
    const seedPath = path.join(resultDir, seedDir.name);

    // Load tasks
    const tasksPath = path.join(seedPath, `tasks_seed${seed}.json`);
    if (!fs.existsSync(tasksPath)) continue;
    const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as Task[];
    const taskMap = new Map(tasks.map(t => [t.taskId, t]));

    // Scan condition directories
    for (const condDir of fs.readdirSync(seedPath, { withFileTypes: true }).filter(d => d.isDirectory())) {
      const jsonlPath = path.join(seedPath, condDir.name, 'results.jsonl');
      if (!fs.existsSync(jsonlPath)) continue;

      const lines = fs.readFileSync(jsonlPath, 'utf-8').trim().split('\n').filter(l => l.trim());
      const results: RunResult[] = lines.map(line => JSON.parse(line));

      for (const r of results) {
        const ft = computeFailureType(r);
        failureByType[ft] = (failureByType[ft] || 0) + 1;

        if (ft === 'correct') continue;

        const task = taskMap.get(r.taskId);
        const obsStr = task
          ? task.initialObservations.map(o => `(${o.input[0]},${o.input[1]},${o.input[2]})->${o.output}`).join('; ')
          : 'N/A';

        const lastMsg = getLastAssistantMessage(r.conversation);
        const caseDetail: FailureCaseDetail = {
          caseId: `${seed}_${condDir.name}_${r.taskId}`,
          seed,
          condition: condDir.name,
          taskId: r.taskId,
          trueRuleId: r.trueRuleId,
          predictedRuleId: r.predictedRuleId,
          failureType: ft,
          queriesMade: r.queriesMade,
          finalVersionSpaceSize: r.finalVersionSpaceSize,
          initialVersionSpaceSize: r.initialVersionSpaceSize,
          observations: obsStr,
          lastAssistantMessage: lastMsg.substring(0, 500),
          whyItFailed: '',
        };
        caseDetail.whyItFailed = analyzeWhyItFailed(caseDetail);
        allCases.push(caseDetail);
      }
    }
  }

  // Generate report
  const lines: string[] = [
    '# P0 Failure Case Analysis',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total failure cases: ${allCases.length}`,
    '',
    '## Failure Type Summary',
    '',
    '| Failure Type | Count | Description |',
    '|--------------|-------|-------------|',
    ...ALL_FAILURE_TYPES.map(ft => {
      if (ft === 'correct') return `| correct | ${failureByType[ft] || 0} | Task completed correctly |`;
      const desc: Record<string, string> = {
        wrong_rule: 'VS=1 but predicted wrong rule',
        version_space_mismatch: 'VS>1 at end, no prediction made',
        overconfident_guess: 'VS>1 but predicted a specific rule anyway',
        invalid_json: 'Response could not be parsed',
        timeout: 'Ran out of turns without final answer',
        api_error: 'API call failed',
      };
      return `| ${ft} | ${failureByType[ft] || 0} | ${desc[ft] || ''} |`;
    }),
    '',
  ];

  // Group by failure type and show top 3 examples per type
  const byType: Record<string, FailureCaseDetail[]> = {};
  for (const c of allCases) {
    if (!byType[c.failureType]) byType[c.failureType] = [];
    byType[c.failureType].push(c);
  }

  for (const ft of ALL_FAILURE_TYPES) {
    if (ft === 'correct') continue;
    const cases = byType[ft] || [];
    if (cases.length === 0) continue;

    lines.push(`## ${ft} (${cases.length} cases)`, '');
    lines.push('Sample cases (up to 3):', '');

    const sample = cases.slice(0, 3);
    for (const c of sample) {
      lines.push(`### Case ${c.caseId}`, '');
      lines.push(`- **Condition**: ${c.condition}`);
      lines.push(`- **True rule**: ${c.trueRuleId}`);
      lines.push(`- **Predicted rule**: ${c.predictedRuleId ?? '(none)'}`);
      lines.push(`- **Queries made**: ${c.queriesMade}`);
      lines.push(`- **Final VS size**: ${c.finalVersionSpaceSize} (initial: ${c.initialVersionSpaceSize})`);
      lines.push(`- **Observations**: ${c.observations}`);
      lines.push(`- **Why it failed**: ${c.whyItFailed}`);
      if (c.lastAssistantMessage) {
        lines.push(`- **Last assistant message**: \`${c.lastAssistantMessage.substring(0, 300)}\``);
      }
      lines.push('');
    }
  }

  // Condition-level failure breakdown
  lines.push('## Failure Breakdown by Condition', '');
  const byCondition: Record<string, FailureCaseDetail[]> = {};
  for (const c of allCases) {
    if (!byCondition[c.condition]) byCondition[c.condition] = [];
    byCondition[c.condition].push(c);
  }

  lines.push('| Condition | Total Failures | overconfident_guess | version_space_mismatch | wrong_rule | timeout | invalid_json | api_error |');
  lines.push('|-----------|---------------|--------------------|-----------------------|------------|---------|-------------|----------|');
  for (const [cond, cases] of Object.entries(byCondition).sort()) {
    const typeCounts: Record<string, number> = {};
    for (const c of cases) typeCounts[c.failureType] = (typeCounts[c.failureType] || 0) + 1;
    lines.push(`| ${cond} | ${cases.length} | ${typeCounts.overconfident_guess || 0} | ${typeCounts.version_space_mismatch || 0} | ${typeCounts.wrong_rule || 0} | ${typeCounts.timeout || 0} | ${typeCounts.invalid_json || 0} | ${typeCounts.api_error || 0} |`);
  }
  lines.push('');

  // Write report
  const outDir = path.join(resultDir);
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, 'failure_analysis.md');
  fs.writeFileSync(reportPath, lines.join('\n') + '\n');
  console.log(`Failure analysis written to ${reportPath}`);

  // Also write JSONL for programmatic access
  const jsonlPath = path.join(outDir, 'failure_cases.jsonl');
  fs.writeFileSync(jsonlPath, allCases.map(c => JSON.stringify(c)).join('\n') + '\n');
  console.log(`Failure cases JSONL: ${jsonlPath}`);
}

main();
