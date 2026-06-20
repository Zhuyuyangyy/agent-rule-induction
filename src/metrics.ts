import fs from 'fs';
import { RULE_BY_ID, INPUT_SPACE, DISTINCT_RULES } from './rules.js';
import type { RunResult } from './runActive.js';
import { computeFailureType as computeFailureTypeP0, type FailureType as FailureTypeP0, extractTokenUsage } from './apiSafety.js';

export interface Metrics {
  condition: string; totalTasks: number; accuracy: number; avgQueries: number;
  avgFinalVS: number; avgVSReduction: number; duplicateQueryRate: number;
  earlyStopRate: number; partialCreditRate: number; queryEfficiency: number;
  avgTokens: number; avgLatencyMs: number; invalidOutputRate: number;
  failureTypeCounts: Record<string, number>;
}

export type FailureType = 'correct' | 'wrong_rule' | 'ambiguous_vs' | 'no_answer' | 'api_error'
  | 'insufficient_queries' | 'invalid_json' | 'timeout' | 'version_space_mismatch' | 'overconfident_guess';

export function computeFailureType(r: RunResult): FailureType {
  if (r.finalVersionSpaceSize < 0) return 'api_error';
  if (r.correct) return 'correct';
  if (!r.predictedRuleId) return 'invalid_json';
  const maxQ = r.config?.maxQueries || 6;
  if (r.queriesMade < maxQ && r.finalVersionSpaceSize > 1) return 'overconfident_guess';
  if (r.finalVersionSpaceSize > 1 && r.queriesMade >= maxQ) return 'version_space_mismatch';
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
    avgTokens: 0, avgLatencyMs: 0, invalidOutputRate: 0, failureTypeCounts: {},
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
  // Invalid output: predictedRuleId is null or not a valid rule ID
  const invalidOutputs = results.filter(r => !r.predictedRuleId || !DISTINCT_RULES.includes(r.predictedRuleId)).length;
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
    avgTokens: totalTokens / total, avgLatencyMs: 0, invalidOutputRate: invalidOutputs / total,
    failureTypeCounts,
  };
}

export function loadResults(path: string): RunResult[] {
  if (!fs.existsSync(path)) return [];
  const lines = fs.readFileSync(path, 'utf-8').trim().split('\n').filter(l => l.trim());
  return lines.map(line => JSON.parse(line));
}
