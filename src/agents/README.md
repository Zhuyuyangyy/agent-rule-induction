# Active Theory Discovery — Multi-Agent Workflow

## Overview

This module implements a bounded multi-agent system for scientific theory exploration. Agents work together in a controlled loop to propose, verify, challenge, and record candidate expressions — but **no agent ever serves as the final judge**, and **the system does NOT claim discovery of new physical laws**.

## Key Principle

> **LLMs are proposal mechanisms, not final judges.** No agent can self-certify discovery.

Every candidate must survive external verification (SymPy-based constraint checking) and adversarial challenge (SkepticAgent). The ReviewerAgent enforces a hard boundary on claims. The workflow returns surviving candidates and a complete audit trail for external human review.

## Agent Roles

| Agent | Role | Action | What It Does |
|-------|------|--------|-------------|
| **ProposerAgent** | `proposer` | `propose_candidates` | Generates candidate expressions from 15 template families (linear, quadratic, product, ratio, power, sqrt, exp, log, sin, cos, mixed1, mixed2, rational, polynomial, correction). Can also propose corrections to existing candidates. |
| **ExperimentDesignerAgent** | `experiment_designer` | `design_experiment` | Selects query points that maximize variance across candidate predictions (active infogain / max-discrepancy sampling). |
| **VerifierAgent** | `verifier` | `verify_candidates` | Calls the SymPy verifier sidecar to check dimensional homogeneity, complexity bounds, and symbolic constraints. |
| **SkepticAgent** | `skeptic` | `challenge_candidates` | Tests candidates on edge cases for numerical instability (NaN/Inf), overfitting indicators, and extreme value behavior. |
| **ReviewerAgent** | `reviewer` | `review_claims` | Scans all candidate metadata and audit log for forbidden overclaiming language. |
| **ArchivistAgent** | `archivist` | `archive` | Records audit log, candidate pool state, and observation history to disk each round. |

## The Workflow Loop

```
┌─────────────────────────────────────────────────────┐
│  1. ProposerAgent generates candidates              │
│  2. VerifierAgent checks constraints                │
│  3. ExperimentDesignerAgent selects queries          │
│  4. Oracle observes (simulated or real)              │
│  5. Eliminate inconsistent candidates               │
│  6. SkepticAgent challenges remaining candidates    │
│  7. ReviewerAgent checks for overclaiming           │
│  8. ArchivistAgent records state                    │
│  9. Repeat until budget exhausted or 1 candidate    │
└─────────────────────────────────────────────────────┘
```

Termination conditions:
- Budget exhausted (`budgetRemaining <= 0`)
- Maximum rounds reached (`round >= maxRounds`)
- Only one candidate survives

## Forbidden Claims

The ReviewerAgent enforces a hard boundary on these claims. They must NEVER appear in any output:

- "discovers new physical laws"
- "surpasses relativity"
- "complete AI scientist"
- "solves scientific discovery"

## Metrics Tracked

| Metric | Description |
|--------|-------------|
| `proposalValidityRate` | Fraction of proposed candidates that pass verification |
| `verifierRejectionRate` | Fraction of candidates rejected by the SymPy verifier |
| `activeQueryGain` | Average information gain per query (variance-based) |
| `hallucinationRate` | Fraction of candidates that produce NaN on all observations |
| `claimViolationRate` | Average forbidden-claim violations per round |

## Template Types

The ProposerAgent uses 15 template families matching P4:

1. **linear** — `a*x1 + b*x2`
2. **quadratic** — `a*x^2 + b*x + c`
3. **product** — `x1 * x2`
4. **ratio** — `x1 / x2`
5. **power** — `x^n`
6. **sqrt** — `sqrt(x)`
7. **exp** — `exp(a*x)`
8. **log** — `log(x)`
9. **sin** — `sin(a*x)`
10. **cos** — `cos(a*x)`
11. **mixed1** — `a*x1^2 + b*x2`
12. **mixed2** — `a*sqrt(x1/x2)`
13. **rational** — `a*x1*x2 / x3^2`
14. **polynomial** — `a*x^3 + b*x^2 + c*x`
15. **correction** — `delta * x^2` (correction term for existing candidates)

## Usage

```typescript
import { runWorkflow, SimulatedOracle } from "./workflow.js";

const result = await runWorkflow({
  maxRounds: 10,
  budgetPerRound: 5,
  proposerConfig: {
    variableNames: ["r", "v", "m"],
    candidatesPerRound: 5,
    rng: Math.random,
  },
  experimentDesignerConfig: {
    variableRanges: { r: [0.1, 100], v: [0, 30], m: [0.1, 10] },
    sampleSize: 20,
    rng: Math.random,
  },
  verifierAgentConfig: {
    variableDimensions: { r: "[L]", v: "[L][T]^-1", m: "[M]" },
    expectedDimension: "[L][T]^-2",
    maxComplexity: 20,
  },
  skepticConfig: {
    variableEdgeCases: { r: [0.001, 1e6, -1], v: [0.001, 1e4, -1], m: [0.001, 1e4, -1] },
    overfittingThreshold: 2.0,
  },
  archivistConfig: { outputDir: "./output/agents" },
  oracle: new SimulatedOracle("6.674e-11 * m / r^2", 0.01, Math.random),
  consistencyTolerance: 0.1,
  verifierEnabled: true,
  reviewerEnabled: true,
});

console.log("Surviving candidates:", result.finalState.candidates.length);
console.log("Metrics:", result.metrics);
```

## Important Disclaimers

- This system does **NOT** discover new physical laws.
- It explores candidate expressions within bounded templates and constraints.
- All results require external human review before any scientific claims are made.
- The audit trail is the primary output — not the surviving candidates themselves.
