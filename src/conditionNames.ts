// Canonical condition naming for P0 experiments.
// All reports and analysis must use these names.
// Legacy names (used in code/cli) map to canonical names here.

export const CONDITION_NAMES: Record<string, string> = {
  // Algorithmic baselines (no LLM)
  random_baseline: 'algorithmic_random_query',
  greedy_baseline: 'algorithmic_infogain',
  algorithmic_random_query: 'algorithmic_random_query',
  algorithmic_infogain: 'algorithmic_infogain',

  // Oracle
  oracle: 'oracle_version_space',
  oracle_version_space: 'oracle_version_space',

  // LLM conditions
  passive: 'llm_passive',
  llm_passive: 'llm_passive',
  active: 'llm_active',
  llm_active: 'llm_active',
  scaffold: 'llm_scaffold',
  llm_scaffold: 'llm_scaffold',

  // LLM variants (grouped under parent conditions for main report)
  active_budget_reminder: 'llm_active',
  active_minquery: 'llm_active',
  active_vscount: 'llm_active',
  query_only_scaffold: 'llm_scaffold',
  final_only_scaffold: 'llm_scaffold',
  model_query_oracle_final: 'llm_scaffold',
  oracle_query_model_final: 'llm_scaffold',
};

export const CANONICAL_CONDITIONS = [
  'algorithmic_random_query',
  'algorithmic_infogain',
  'oracle_version_space',
  'llm_passive',
  'llm_scaffold',
  'llm_active',
] as const;

export type CanonicalCondition = typeof CANONICAL_CONDITIONS[number];

export function canonicalize(name: string): string {
  return CONDITION_NAMES[name] ?? name;
}

export function isAlgorithmic(name: string): boolean {
  const c = canonicalize(name);
  return c === 'algorithmic_random_query' || c === 'algorithmic_infogain';
}

export function isOracle(name: string): boolean {
  return canonicalize(name) === 'oracle_version_space';
}

export function isLLM(name: string): boolean {
  const c = canonicalize(name);
  return c === 'llm_passive' || c === 'llm_scaffold' || c === 'llm_active';
}
