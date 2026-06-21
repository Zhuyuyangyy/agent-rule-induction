import fs from 'fs';
import { RULE_BY_ID, INPUT_SPACE, DISTINCT_RULES } from './rules.js';
import type { RunResult } from './runActive.js';

export interface Metrics {
  condition: string; totalTasks: number; accuracy: number; avgQueries: number;
  avgFinalVS: number; avgVSReduction: number; duplicateQueryRate: number;
  earlyStopRate: number; partialCreditRate: number; queryEfficiency: number;
  avgTokens: number;
  failureTypeCounts: Record<string, number>;
}

export type FailureType =
  | 'correct'
  | 'wrong_rule'
  | 'version_space_mismatch'
  | 'overconfident_guess'
  | 'invalid_json'
  | 'timeout'
  | 'api_error';

export const ALL_FAILURE_TYPES: readonly FailureType[] = [
  'correct', 'wrong_rule', 'version_space_mismatch', 'overconfident_guess',
  'invalid_json', 'timeout', 'api_error',
];

export function computeFailureType(r: RunResult): FailureType {
  if (r.finalVersionSpaceSize < 0) return 'api_error';
  if (r.correct) return 'correct';
  // No prediction at all → timeout (ran out of turns)
  if (!r.predictedRuleId) return 'timeout';
  // VS > 1 and predicted something → overconfident guess
  if (r.finalVersionSpaceSize > 1 && r.predictedRuleId) return 'overconfident_guess';
  // VS > 1 and no prediction → version space mismatch
  if (r.finalVersionSpaceSize > 1) return 'version_space_mismatch';
  // VS = 1 but wrong → wrong_rule
  return 'wrong_rule';
}

function extractTokens(r: RunResult): number {
  let total = 0;
  for (const m of r.conversation) {
    const u: any = (m as any).usage;
    if (u) {
      if (typeof u.total_tokens === 'number') total += u.total_tokens;
      else if (typeof u.prompt_tokens === 'number' && typeof u.completion_tokens === 'number') total += u.prompt_tokens + u.completion_tokens;
    }
  }
  return total;
}

export function computeAllMetrics(results: RunResult[], condition: string): Metrics {
  const total = results.length;
  if (total === 0) return {
    condition, totalTasks: 0, accuracy: 0, avgQueries: 0, avgFinalVS: 0, avgVSReduction: 0,
    duplicateQueryRate: 0, earlyStopRate: 0, partialCreditRate: 0, queryEfficiency: 0,
    avgTokens: 0, failureTypeCounts: {},
  };
  const correct = results.filter(r => r.correct).length;
  const totalQueries = results.reduce((s, r) => s + r.queriesMade, 0);
  const totalFinalVS = results.reduce((s, r) => s + r.finalVersionSpaceSize, 0);
  const totalVSReduction = results.reduce((s, r) => { const init = r.initialVersionSpaceSize || 48; return s + (init - r.finalVersionSpaceSize) / init; }, 0);
  const totalDups = results.reduce((s, r) => s + r.queryResults.filter(q => q.is_duplicate).length, 0);
  const totalQR = results.reduce((s, r) => s + r.queryResults.length, 0);
  const maxQ = results[0]?.config?.maxQueries || 6;
  const earlyStops = results.filter(r => r.queriesMade < maxQ).length;
  const partial = results.filter(r => r.correct || r.finalVersionSpaceSize === 1).length;
  const totalTokens = results.reduce((s, r) => s + extractTokens(r), 0);
  const failureTypeCounts: Record<string, number> = {};
  for (const r of results) {
    const ft = computeFailureType(r);
    failureTypeCounts[ft] = (failureTypeCounts[ft] || 0) + 1;
  }
  return {
    condition, totalTasks: total, accuracy: correct / total, avgQueries: totalQueries / total,
    avgFinalVS: totalFinalVS / total, avgVSReduction: totalVSReduction / total,
    duplicateQueryRate: totalQR > 0 ? totalDups / totalQR : 0, earlyStopRate: earlyStops / total,
    partialCreditRate: partial / total, queryEfficiency: correct / total / (totalQueries / total || 1),
    avgTokens: totalTokens / total,
    failureTypeCounts,
  };
}

export function loadResults(path: string): RunResult[] {
  if (!fs.existsSync(path)) return [];
  const lines = fs.readFileSync(path, 'utf-8').trim().split('\n').filter(l => l.trim());
  return lines.map(line => JSON.parse(line));
}
