import { RULE_BY_ID, INPUT_SPACE, DISTINCT_RULES, type Rule } from './rules.js';

export interface QueryResult {
  result: boolean;
  step: number;
  version_space_size: number;
  split_entropy: number;
  vs_reduction: number;
  is_duplicate: boolean;
}

export interface Observation {
  input: [number, number, number];
  output: boolean;
}

export class RuleInductionEnv {
  private trueRule: Rule;
  private vsRuleIds: Set<string>;
  private _queriesMade: number;
  private _queriedInputs: Set<string>;
  private maxQueries: number;

  constructor(trueRuleId: string, initObs: Observation[], vsRuleIds: string[], maxQueries: number = 6) {
    this.trueRule = RULE_BY_ID.get(trueRuleId)!;
    this.vsRuleIds = new Set(vsRuleIds);
    this._queriesMade = 0;
    this._queriedInputs = new Set<string>();
    this.maxQueries = maxQueries;
  }

  query(x: [number, number, number], opts?: { force?: boolean }): QueryResult {
    const key = x.join(',');
    const isDuplicate = this._queriedInputs.has(key);

    if (this.isDone() && !opts?.force) {
      const result = this.trueRule.call(x);
      return { result, step: this._queriesMade, version_space_size: this.vsRuleIds.size, split_entropy: 0, vs_reduction: 0, is_duplicate: true };
    }

    const prevSize = this.vsRuleIds.size;
    const result = this.trueRule.call(x);
    this._queriedInputs.add(key);
    if (!isDuplicate) { this._queriesMade++; }

    const newVs = new Set<string>();
    for (const ruleId of this.vsRuleIds) {
      const rule = RULE_BY_ID.get(ruleId)!;
      if (rule.call(x) === result) { newVs.add(ruleId); }
    }
    this.vsRuleIds = newVs;

    const newSize = this.vsRuleIds.size;
    const splitEntropy = computeSplitEntropy(x, this.vsRuleIds);
    const vsReduction = prevSize > 0 ? (prevSize - newSize) / prevSize : 0;

    return { result, step: this._queriesMade, version_space_size: newSize, split_entropy: splitEntropy, vs_reduction: vsReduction, is_duplicate: isDuplicate };
  }

  isDone(): boolean { return this._queriesMade >= this.maxQueries || this.vsRuleIds.size <= 1; }
  get versionSpace(): string[] { return Array.from(this.vsRuleIds); }
  get queriesMade(): number { return this._queriesMade; }
  get queriedInputs(): [number, number, number][] { return Array.from(this._queriedInputs).map(k => k.split(',').map(Number) as [number, number, number]); }
}

export function computeSplitEntropy(x: [number, number, number], vsRuleIds: Set<string>): number {
  let posCount = 0;
  for (const ruleId of vsRuleIds) { if (RULE_BY_ID.get(ruleId)!.call(x)) posCount++; }
  const negCount = vsRuleIds.size - posCount;
  if (posCount === 0 || negCount === 0) return 0;
  const p = posCount / vsRuleIds.size;
  const q = negCount / vsRuleIds.size;
  return -(p * Math.log2(p) + q * Math.log2(q));
}

export function computeGreedyOptimalQuery(env: RuleInductionEnv): [number, number, number] {
  const vs = new Set(env.versionSpace);
  if (vs.size <= 1) return [0, 0, 0];
  let bestInput: [number, number, number] = [0, 0, 0];
  let bestEntropy = -1;
  const queried = new Set(env.queriedInputs.map(q => q.join(',')));
  for (const x of INPUT_SPACE) {
    if (queried.has(x.join(','))) continue;
    const entropy = computeSplitEntropy(x, vs);
    if (entropy > bestEntropy) { bestEntropy = entropy; bestInput = x; }
  }
  return bestInput;
}

export function computeRandomQuery(env: RuleInductionEnv, rng: () => number): [number, number, number] {
  const queried = new Set(env.queriedInputs.map(q => q.join(',')));
  const available = INPUT_SPACE.filter(x => !queried.has(x.join(',')));
  if (available.length === 0) return [0, 0, 0];
  return available[Math.floor(rng() * available.length)];
}
