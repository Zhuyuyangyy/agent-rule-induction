// P4 Candidate Generator
// Simulated LLM candidate generator that produces candidate expression strings
// based on templates. Since we don't have a real LLM API, this uses template-based
// generation with plausibility scoring and intentional invalid candidates.

import type { DimVector } from '../p2/dimensionalConstraints.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CandidateContext {
  /** Variable names from the target formula */
  variableNames: string[];
  /** Dimension of each variable */
  variableDimensions: Record<string, DimVector>;
  /** Expected output dimension */
  outputDimension: DimVector;
  /** Number of input variables */
  inputDimension: number;
}

export interface GeneratedCandidate {
  /** The raw candidate string (as if from an LLM) */
  raw: string;
  /** Template family used to generate */
  templateFamily: string;
  /** Plausibility score (0-1, based on dimensional consistency heuristics) */
  plausibility: number;
  /** Whether this candidate was intentionally made invalid */
  intentionallyInvalid: boolean;
  /** Type of invalidity (if applicable) */
  invalidType?: 'syntax_error' | 'wrong_dimension' | 'nonsense';
}

export interface GenerationStats {
  totalGenerated: number;
  parseSuccessRate: number;
  hallucinationRate: number;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

type TemplateFn = (vars: string[], rng: () => number) => string;

interface Template {
  name: string;
  family: string;
  generate: TemplateFn;
  /** Heuristic plausibility based on dimensional fit */
  plausibility: (ctx: CandidateContext) => number;
}

function pickVar(vars: string[], rng: () => number): string {
  return vars[Math.floor(rng() * vars.length)];
}

function pickTwoVars(vars: string[], rng: () => number): [string, string] {
  if (vars.length < 2) return [vars[0], vars[0]];
  const i = Math.floor(rng() * vars.length);
  let j = Math.floor(rng() * vars.length);
  while (j === i) j = Math.floor(rng() * vars.length);
  return [vars[i], vars[j]];
}

function pickThreeVars(vars: string[], rng: () => number): [string, string, string] {
  if (vars.length < 3) return [vars[0], vars[1 % vars.length], vars[2 % vars.length]];
  const indices = new Set<number>();
  while (indices.size < 3) indices.add(Math.floor(rng() * vars.length));
  const arr = Array.from(indices);
  return [vars[arr[0]], vars[arr[1]], vars[arr[2]]];
}

const TEMPLATES: Template[] = [
  // Linear: a*x1 + b*x2
  {
    name: 'linear',
    family: 'linear',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (0.5 + rng() * 2).toFixed(2);
      const b = (0.5 + rng() * 2).toFixed(2);
      return `${a}*${x1} + ${b}*${x2}`;
    },
    plausibility: (ctx) => {
      // Linear combos are common in physics
      return ctx.inputDimension >= 2 ? 0.6 : 0.3;
    },
  },
  // Product: x1 * x2
  {
    name: 'product',
    family: 'product',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      return `${x1} * ${x2}`;
    },
    plausibility: (ctx) => 0.7,
  },
  // Power: x1^n
  {
    name: 'power',
    family: 'power',
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const n = Math.floor(rng() * 3) + 2; // 2, 3, or 4
      return `${x}^${n}`;
    },
    plausibility: (ctx) => 0.5,
  },
  // Inverse: 1/x1
  {
    name: 'inverse',
    family: 'inverse',
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      return `1/${x}`;
    },
    plausibility: (ctx) => 0.4,
  },
  // Compound: a*x1*x2/x3^2
  {
    name: 'compound',
    family: 'compound',
    generate: (vars, rng) => {
      if (vars.length >= 3) {
        const [x1, x2, x3] = pickThreeVars(vars, rng);
        const a = (0.5 + rng() * 2).toFixed(2);
        return `${a}*${x1}*${x2}/${x3}^2`;
      }
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (0.5 + rng() * 2).toFixed(2);
      return `${a}*${x1}/${x2}^2`;
    },
    plausibility: (ctx) => ctx.inputDimension >= 3 ? 0.65 : 0.4,
  },
  // Trig: sin(x1), cos(x1)
  {
    name: 'trig_sin',
    family: 'trig',
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      return `sin(${x})`;
    },
    plausibility: (ctx) => 0.3, // Trig is less common in basic physics
  },
  {
    name: 'trig_cos',
    family: 'trig',
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      return `cos(${x})`;
    },
    plausibility: (ctx) => 0.3,
  },
  // Mixed: a*x1^2 + b*x2
  {
    name: 'mixed',
    family: 'mixed',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (0.5 + rng() * 2).toFixed(2);
      const b = (0.5 + rng() * 2).toFixed(2);
      return `${a}*${x1}^2 + ${b}*${x2}`;
    },
    plausibility: (ctx) => 0.55,
  },
  // Sqrt: sqrt(x1)
  {
    name: 'sqrt',
    family: 'sqrt',
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      return `sqrt(${x})`;
    },
    plausibility: (ctx) => 0.5,
  },
  // Division: x1/x2
  {
    name: 'division',
    family: 'division',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      return `${x1}/${x2}`;
    },
    plausibility: (ctx) => 0.6,
  },
  // Product with constant: a*x1*x2
  {
    name: 'scaled_product',
    family: 'product',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (0.5 + rng() * 3).toFixed(2);
      return `${a}*${x1}*${x2}`;
    },
    plausibility: (ctx) => 0.65,
  },
  // Inverse square: a/x1^2
  {
    name: 'inverse_square',
    family: 'inverse_square',
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const a = (0.5 + rng() * 3).toFixed(2);
      return `${a}/${x}^2`;
    },
    plausibility: (ctx) => 0.45,
  },
  // Trig with product: A*sin(omega*t)
  {
    name: 'trig_product',
    family: 'trig',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (0.5 + rng() * 3).toFixed(2);
      return `${a}*sin(${x1}*${x2})`;
    },
    plausibility: (ctx) => 0.35,
  },
  // Sqrt of division: sqrt(x1/x2)
  {
    name: 'sqrt_div',
    family: 'sqrt',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      return `sqrt(${x1}/${x2})`;
    },
    plausibility: (ctx) => 0.55,
  },
  // Scaled sqrt: a*sqrt(x1/x2)
  {
    name: 'scaled_sqrt_div',
    family: 'sqrt',
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (5 + rng() * 2).toFixed(2);
      return `${a}*sqrt(${x1}/${x2})`;
    },
    plausibility: (ctx) => 0.6,
  },
];

// ---------------------------------------------------------------------------
// Invalid candidate generators
// ---------------------------------------------------------------------------

type InvalidGenerator = (vars: string[], rng: () => number) => GeneratedCandidate;

const INVALID_GENERATORS: InvalidGenerator[] = [
  // Syntax error: unmatched parenthesis
  (vars, rng) => ({
    raw: `(${pickVar(vars, rng)} * ${pickVar(vars, rng)}`,
    templateFamily: 'invalid_syntax',
    plausibility: 0,
    intentionallyInvalid: true,
    invalidType: 'syntax_error',
  }),
  // Syntax error: double operator
  (vars, rng) => ({
    raw: `${pickVar(vars, rng)} ** ${pickVar(vars, rng)}`,
    templateFamily: 'invalid_syntax',
    plausibility: 0,
    intentionallyInvalid: true,
    invalidType: 'syntax_error',
  }),
  // Nonsense: random characters
  (vars, rng) => ({
    raw: `xyz_${Math.floor(rng() * 1000)} + ???`,
    templateFamily: 'invalid_nonsense',
    plausibility: 0,
    intentionallyInvalid: true,
    invalidType: 'nonsense',
  }),
  // Wrong dimension: adding incompatible quantities (e.g., mass + length)
  (vars, rng) => ({
    raw: `${pickVar(vars, rng)} + ${pickVar(vars, rng)} + ${pickVar(vars, rng)}`,
    templateFamily: 'invalid_dimension',
    plausibility: 0.1,
    intentionallyInvalid: true,
    invalidType: 'wrong_dimension',
  }),
  // Syntax error: missing operand
  (vars, rng) => ({
    raw: `${pickVar(vars, rng)} * + ${pickVar(vars, rng)}`,
    templateFamily: 'invalid_syntax',
    plausibility: 0,
    intentionallyInvalid: true,
    invalidType: 'syntax_error',
  }),
];

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------

/**
 * Generate a set of candidate expression strings for a given target context.
 * Simulates what an LLM might propose given the variable names and dimensions.
 *
 * @param ctx - Context about the target formula
 * @param count - Number of candidates to generate
 * @param rng - Seeded random number generator
 * @param invalidRate - Fraction of candidates that should be intentionally invalid (0-1)
 */
export function generateCandidates(
  ctx: CandidateContext,
  count: number,
  rng: () => number,
  invalidRate: number = 0.15,
): GeneratedCandidate[] {
  const candidates: GeneratedCandidate[] = [];
  const numInvalid = Math.floor(count * invalidRate);
  const numValid = count - numInvalid;

  // Generate valid candidates from templates
  for (let i = 0; i < numValid; i++) {
    const templateIdx = Math.floor(rng() * TEMPLATES.length);
    const template = TEMPLATES[templateIdx];
    const raw = template.generate(ctx.variableNames, rng);
    const plausibility = template.plausibility(ctx);

    candidates.push({
      raw,
      templateFamily: template.family,
      plausibility,
      intentionallyInvalid: false,
    });
  }

  // Generate intentionally invalid candidates
  for (let i = 0; i < numInvalid; i++) {
    const genIdx = Math.floor(rng() * INVALID_GENERATORS.length);
    const candidate = INVALID_GENERATORS[genIdx](ctx.variableNames, rng);
    candidates.push(candidate);
  }

  // Shuffle to mix valid and invalid
  shuffleInPlace(candidates, rng);

  return candidates;
}

/**
 * Generate candidates that include the correct formula as one of the options.
 * This simulates an LLM that sometimes "gets lucky" and proposes the right answer.
 */
export function generateCandidatesWithTarget(
  ctx: CandidateContext,
  targetRaw: string,
  count: number,
  rng: () => number,
  invalidRate: number = 0.15,
  targetInsertProb: number = 0.3,
): GeneratedCandidate[] {
  const candidates = generateCandidates(ctx, count, rng, invalidRate);

  // With some probability, replace a random candidate with the target
  if (rng() < targetInsertProb) {
    const idx = Math.floor(rng() * candidates.length);
    candidates[idx] = {
      raw: targetRaw,
      templateFamily: 'target_match',
      plausibility: 1.0,
      intentionallyInvalid: false,
    };
  }

  return candidates;
}

/**
 * Compute generation statistics from a batch of candidates and their parse results.
 */
export function computeGenerationStats(
  candidates: GeneratedCandidate[],
  parseResults: { success: boolean }[],
): GenerationStats {
  const total = candidates.length;
  if (total === 0) return { totalGenerated: 0, parseSuccessRate: 0, hallucinationRate: 0 };

  const parseSuccesses = parseResults.filter(r => r.success).length;
  const intentionalInvalid = candidates.filter(c => c.intentionallyInvalid).length;

  // hallucinationRate = fraction of candidates that are syntactically invalid
  // (including both intentional and unintentional failures)
  const parseFailures = total - parseSuccesses;

  return {
    totalGenerated: total,
    parseSuccessRate: parseSuccesses / total,
    hallucinationRate: parseFailures / total,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
