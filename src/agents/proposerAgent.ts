/**
 * ProposerAgent - Generates candidate expressions from templates.
 *
 * Uses the same 15 template families as P4, plus a correction template.
 * Can also propose corrections to existing candidates based on observations.
 * This agent only PROPOSES — it never certifies or validates.
 */

import { BaseAgent } from "./baseAgent.js";
import type { AgentAction, Candidate, TemplateType, WorkflowState } from "./types.js";

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

interface Template {
  type: TemplateType;
  generate: (vars: string[], rng: () => number) => string;
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

const TEMPLATES: Template[] = [
  // 1. linear: a*x1 + b*x2
  {
    type: "linear",
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (0.5 + rng() * 2).toFixed(2);
      const b = (0.5 + rng() * 2).toFixed(2);
      return `${a}*${x1} + ${b}*${x2}`;
    },
  },
  // 2. quadratic: a*x^2 + b*x + c
  {
    type: "quadratic",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const a = (0.5 + rng() * 2).toFixed(2);
      const b = (0.1 + rng()).toFixed(2);
      const c = (rng() * 0.5).toFixed(2);
      return `${a}*${x}^2 + ${b}*${x} + ${c}`;
    },
  },
  // 3. product: x1 * x2
  {
    type: "product",
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      return `${x1} * ${x2}`;
    },
  },
  // 4. ratio: x1 / x2
  {
    type: "ratio",
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      return `${x1} / ${x2}`;
    },
  },
  // 5. power: x^n
  {
    type: "power",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const n = Math.floor(rng() * 3) + 2;
      return `${x}^${n}`;
    },
  },
  // 6. sqrt: sqrt(x)
  {
    type: "sqrt",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      return `sqrt(${x})`;
    },
  },
  // 7. exp: exp(a*x)
  {
    type: "exp",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const a = (0.1 + rng()).toFixed(2);
      return `exp(${a}*${x})`;
    },
  },
  // 8. log: log(x)
  {
    type: "log",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      return `log(${x})`;
    },
  },
  // 9. sin: sin(a*x)
  {
    type: "sin",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const a = (0.5 + rng() * 3).toFixed(2);
      return `sin(${a}*${x})`;
    },
  },
  // 10. cos: cos(a*x)
  {
    type: "cos",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const a = (0.5 + rng() * 3).toFixed(2);
      return `cos(${a}*${x})`;
    },
  },
  // 11. mixed1: a*x1^2 + b*x2
  {
    type: "mixed1",
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (0.5 + rng() * 2).toFixed(2);
      const b = (0.5 + rng() * 2).toFixed(2);
      return `${a}*${x1}^2 + ${b}*${x2}`;
    },
  },
  // 12. mixed2: a*sqrt(x1/x2)
  {
    type: "mixed2",
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const a = (1 + rng() * 5).toFixed(2);
      return `${a}*sqrt(${x1}/${x2})`;
    },
  },
  // 13. rational: a*x1*x2 / x3^2
  {
    type: "rational",
    generate: (vars, rng) => {
      const [x1, x2] = pickTwoVars(vars, rng);
      const x3 = pickVar(vars, rng);
      const a = (0.5 + rng() * 2).toFixed(2);
      return `${a}*${x1}*${x2}/${x3}^2`;
    },
  },
  // 14. polynomial: a*x^3 + b*x^2 + c*x
  {
    type: "polynomial",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const a = (0.1 + rng()).toFixed(2);
      const b = (0.5 + rng() * 2).toFixed(2);
      const c = (0.5 + rng() * 2).toFixed(2);
      return `${a}*${x}^3 + ${b}*${x}^2 + ${c}*${x}`;
    },
  },
  // 15. correction: delta * base_expr (correction to existing candidate)
  {
    type: "correction",
    generate: (vars, rng) => {
      const x = pickVar(vars, rng);
      const delta = (0.01 + rng() * 0.1).toFixed(3);
      return `${delta}*${x}^2`;
    },
  },
];

// ---------------------------------------------------------------------------
// ProposerAgent
// ---------------------------------------------------------------------------

export interface ProposerConfig {
  /** Variable names available for template generation. */
  variableNames: string[];
  /** Number of candidates to generate per round. */
  candidatesPerRound: number;
  /** Seeded RNG function. */
  rng: () => number;
}

export class ProposerAgent extends BaseAgent {
  private config: ProposerConfig;
  private candidateCounter: number;

  constructor(config: ProposerConfig) {
    super("proposer");
    this.config = config;
    this.candidateCounter = 0;
  }

  async act(state: WorkflowState): Promise<AgentAction[]> {
    const candidates: Candidate[] = [];

    // Generate fresh candidates from templates
    for (let i = 0; i < this.config.candidatesPerRound; i++) {
      const templateIdx = Math.floor(this.config.rng() * TEMPLATES.length);
      const template = TEMPLATES[templateIdx];
      const expression = template.generate(this.config.variableNames, this.config.rng);
      const id = `cand_${state.round}_${this.candidateCounter++}`;

      candidates.push({
        id,
        expression,
        source: `template:${template.type}`,
        metadata: {
          templateType: template.type,
          round: state.round,
        },
      });
    }

    // Propose corrections to surviving candidates if observations exist
    if (state.observations.length > 0 && state.candidates.length > 0) {
      const correctionCandidates = this.proposeCorrections(state);
      candidates.push(...correctionCandidates);
    }

    return [this.logAction("propose_candidates", { candidates })];
  }

  /**
   * Propose correction terms for existing candidates based on residual patterns.
   */
  private proposeCorrections(state: WorkflowState): Candidate[] {
    const corrections: Candidate[] = [];
    const survivingCandidates = state.candidates.filter(
      (c) => !state.eliminatedIds.includes(c.id),
    );

    // Propose a correction for up to 2 surviving candidates per round
    const candidatesToCorrect = survivingCandidates.slice(0, 2);

    for (const candidate of candidatesToCorrect) {
      const correctionTemplate = TEMPLATES.find((t) => t.type === "correction")!;
      const correctionExpr = correctionTemplate.generate(
        this.config.variableNames,
        this.config.rng,
      );
      const id = `corr_${state.round}_${this.candidateCounter++}`;

      corrections.push({
        id,
        expression: `${candidate.expression} + ${correctionExpr}`,
        source: `correction:${candidate.id}`,
        metadata: {
          templateType: "correction",
          baseCandidateId: candidate.id,
          correctionTerm: correctionExpr,
          round: state.round,
        },
      });
    }

    return corrections;
  }
}
