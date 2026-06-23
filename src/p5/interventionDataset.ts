// P5 Intervention Dataset: Generate observational and interventional data
// from a causal graph. Supports do-interventions on individual nodes.

import type { CausalGraph, CausalNode } from './causalGraph.js';
import { topologicalOrder, adjacencyMatrix } from './causalGraph.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An intervention: setting a node to a fixed value (do-calculus style) */
export interface Intervention {
  /** Node ID to intervene on */
  nodeId: string;
  /** Value to set the node to */
  value: number;
}

/** A single sample from the causal model */
export interface CausalSample {
  /** Node values: nodeId -> value */
  values: Record<string, number>;
  /** Whether this is observational or interventional */
  isInterventional: boolean;
  /** The intervention applied (null for observational) */
  intervention: Intervention | null;
}

/** Dataset containing observational and interventional samples */
export interface CausalDataset {
  graph: CausalGraph;
  /** Observational samples */
  observational: CausalSample[];
  /** Interventional samples grouped by intervention target */
  interventional: CausalSample[];
  /** Total sample count */
  totalSamples: number;
  /** Noise level applied */
  noiseLevel: number;
}

export interface DatasetOptions {
  seed: number;
  noiseLevel: number;
  /** Number of observational samples */
  obsCount: number;
  /** Number of interventional samples per intervention target */
  intPerTarget: number;
}

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller for normal distribution
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// ---------------------------------------------------------------------------
// Sample generation
// ---------------------------------------------------------------------------

/**
 * Generate a single sample from the causal model.
 * Evaluates nodes in topological order. If a node is intervened on,
 * its value is set to the intervention value instead of being computed
 * from parents.
 */
function generateSample(
  graph: CausalGraph,
  intervention: Intervention | null,
  rng: () => number,
  noiseLevel: number,
): CausalSample {
  const adj = adjacencyMatrix(graph);
  const order = topologicalOrder(adj);
  const values: Record<string, number> = {};

  for (const idx of order) {
    const node = graph.nodes[idx];

    // If this node is intervened on, set value directly
    if (intervention && intervention.nodeId === node.id) {
      values[node.id] = intervention.value;
      continue;
    }

    // Compute value from parents + intercept + noise
    let value = node.intercept;
    for (const [parentId, coeff] of Object.entries(node.coefficients)) {
      value += coeff * (values[parentId] ?? 0);
    }

    // Add noise
    const noise = normalRandom(rng) * node.noiseStd * (1 + noiseLevel);
    value += noise;

    values[node.id] = value;
  }

  return {
    values,
    isInterventional: intervention !== null,
    intervention,
  };
}

/**
 * Generate a full dataset with observational and interventional samples.
 */
export function generateSamples(
  graph: CausalGraph,
  options: DatasetOptions,
): CausalDataset {
  const { seed, noiseLevel, obsCount, intPerTarget } = options;
  const rng = mulberry32(seed);

  // Generate observational samples
  const observational: CausalSample[] = [];
  for (let i = 0; i < obsCount; i++) {
    observational.push(generateSample(graph, null, rng, noiseLevel));
  }

  // Generate interventional samples: intervene on each non-root node
  // at several values
  const interventional: CausalSample[] = [];
  const interventionValues = [-2, -1, 0, 1, 2];

  for (const node of graph.nodes) {
    // Skip root nodes (no parents) — intervening on them is still valid
    for (const val of interventionValues) {
      const intervention: Intervention = { nodeId: node.id, value: val };
      for (let i = 0; i < intPerTarget; i++) {
        interventional.push(generateSample(graph, intervention, rng, noiseLevel));
      }
    }
  }

  return {
    graph,
    observational,
    interventional,
    totalSamples: observational.length + interventional.length,
    noiseLevel,
  };
}

// ---------------------------------------------------------------------------
// Query simulation
// ---------------------------------------------------------------------------

/**
 * Simulate a single query: given an intervention, return the resulting sample.
 * Used by baselines to simulate active data collection.
 */
export function simulateQuery(
  graph: CausalGraph,
  intervention: Intervention | null,
  rng: () => number,
  noiseLevel: number,
): CausalSample {
  return generateSample(graph, intervention, rng, noiseLevel);
}

/**
 * Compute the true conditional mean of a target node given an intervention
 * (or no intervention). This is the noiseless expected value.
 */
export function computeTrueMean(
  graph: CausalGraph,
  targetNodeId: string,
  intervention: Intervention | null,
): number {
  const adj = adjacencyMatrix(graph);
  const order = topologicalOrder(adj);
  const values: Record<string, number> = {};

  for (const idx of order) {
    const node = graph.nodes[idx];

    if (intervention && intervention.nodeId === node.id) {
      values[node.id] = intervention.value;
      continue;
    }

    let value = node.intercept;
    for (const [parentId, coeff] of Object.entries(node.coefficients)) {
      value += coeff * (values[parentId] ?? 0);
    }
    values[node.id] = value;
  }

  return values[targetNodeId] ?? 0;
}
