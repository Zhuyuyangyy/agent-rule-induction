// P5 Scoring: Metrics for causal mechanism discovery.
// Evaluates graph accuracy, intervention R², counterfactual accuracy,
// compression, query cost, and oracle gap.

import type { CausalGraph } from './causalGraph.js';
import { adjacencyMatrix } from './causalGraph.js';
import type { CausalDataset, CausalSample, Intervention } from './interventionDataset.js';
import { computeTrueMean } from './interventionDataset.js';

// ---------------------------------------------------------------------------
// Graph accuracy
// ---------------------------------------------------------------------------

/**
 * Compute structural accuracy of a predicted adjacency matrix against the
 * true adjacency matrix. Returns precision, recall, and F1 for edge detection.
 */
export function graphAccuracy(
  predictedAdj: number[][],
  trueAdj: number[][],
): { precision: number; recall: number; f1: number; shd: number } {
  const n = trueAdj.length;
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let shd = 0; // Structural Hamming Distance

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const pred = predictedAdj[i][j] === 1;
      const truth = trueAdj[i][j] === 1;

      if (pred && truth) tp++;
      else if (pred && !truth) fp++;
      else if (!pred && truth) fn++;

      if (pred !== truth) shd++;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

  return { precision, recall, f1, shd };
}

// ---------------------------------------------------------------------------
// Intervention R²
// ---------------------------------------------------------------------------

/**
 * Compute R² for predicting node values under interventions.
 * For each interventional sample, compute the predicted value using the
 * predicted graph's structural equations, then measure R² against observed.
 */
export function interventionR2(
  predictedGraph: CausalGraph,
  dataset: CausalDataset,
): number {
  const samples = dataset.interventional;
  if (samples.length === 0) return 0;

  // For each node, compute R² of predicted vs actual
  const allActual: number[] = [];
  const allPredicted: number[] = [];

  for (const sample of samples) {
    const predValues = evaluateGraph(predictedGraph, sample.intervention);

    for (const node of predictedGraph.nodes) {
      const actual = sample.values[node.id];
      const predicted = predValues[node.id];
      if (Number.isFinite(actual) && Number.isFinite(predicted)) {
        allActual.push(actual);
        allPredicted.push(predicted);
      }
    }
  }

  if (allActual.length < 2) return 0;

  const meanActual = allActual.reduce((s, v) => s + v, 0) / allActual.length;
  const ssTot = allActual.reduce((s, a) => s + (a - meanActual) ** 2, 0);
  const ssRes = allPredicted.reduce((s, p, i) => s + (p - allActual[i]) ** 2, 0);

  if (ssTot === 0) return ssRes === 0 ? 1 : 0;
  return Math.max(0, 1 - ssRes / ssTot);
}

// ---------------------------------------------------------------------------
// Counterfactual accuracy
// ---------------------------------------------------------------------------

/**
 * Compute counterfactual accuracy: given observational data, predict the
 * outcome under a hypothetical intervention, and compare to the true
 * counterfactual (computed from the true graph).
 */
export function counterfactualAccuracy(
  predictedGraph: CausalGraph,
  trueGraph: CausalGraph,
  dataset: CausalDataset,
  rng: () => number,
): number {
  // Pick a subset of observational samples and a set of interventions
  const obsSamples = dataset.observational.slice(0, 20);
  if (obsSamples.length === 0) return 0;

  const targetNodes = trueGraph.nodes;
  const interventionValues = [-1, 0, 1];
  let totalError = 0;
  let count = 0;

  for (const obs of obsSamples) {
    for (const node of targetNodes) {
      for (const val of interventionValues) {
        const intervention: Intervention = { nodeId: node.id, value: val };

        // True counterfactual (noiseless)
        const trueCF = computeTrueMean(trueGraph, node.id, intervention);

        // Predicted counterfactual (noiseless)
        const predValues = evaluateGraph(predictedGraph, intervention);
        const predCF = predValues[node.id] ?? 0;

        if (Number.isFinite(trueCF) && Number.isFinite(predCF)) {
          const scale = Math.max(Math.abs(trueCF), 1);
          totalError += Math.abs(predCF - trueCF) / scale;
          count++;
        }
      }
    }
  }

  return count > 0 ? Math.max(0, 1 - totalError / count) : 0;
}

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

/**
 * Compute the compression ratio: how many edges the predicted graph has
 * relative to the maximum possible (n*(n-1)/2 for a DAG).
 * Lower is better (sparser graph), but only meaningful when accuracy is high.
 */
export function compression(predictedGraph: CausalGraph): number {
  const n = predictedGraph.nodeCount;
  const maxEdges = n * (n - 1) / 2;
  if (maxEdges === 0) return 1;
  return predictedGraph.edgeCount / maxEdges;
}

// ---------------------------------------------------------------------------
// Helper: evaluate graph
// ---------------------------------------------------------------------------

/**
 * Evaluate a causal graph under an intervention (noiseless).
 * Returns node values computed in topological order.
 */
function evaluateGraph(
  graph: CausalGraph,
  intervention: Intervention | null,
): Record<string, number> {
  const adj = adjacencyMatrix(graph);
  const n = graph.nodeCount;
  const values: Record<string, number> = {};

  // Simple topological evaluation (nodes are already in order 0..n-1)
  for (let idx = 0; idx < n; idx++) {
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

  return values;
}

// ---------------------------------------------------------------------------
// Composite P5 Metrics
// ---------------------------------------------------------------------------

export interface P5Metrics {
  graphConfig: string;
  baseline: string;
  noiseLevel: number;
  seed: number;
  /** Graph structure F1 score */
  graphF1: number;
  /** Graph structure precision */
  graphPrecision: number;
  /** Graph structure recall */
  graphRecall: number;
  /** Structural Hamming Distance */
  shd: number;
  /** R² on interventional data */
  interventionR2: number;
  /** Counterfactual prediction accuracy */
  counterfactualAccuracy: number;
  /** Compression ratio (edges / max possible) */
  compression: number;
  /** Number of queries used */
  queryCost: number;
  /** Gap from oracle performance */
  oracleGap: number;
}

export function computeP5Metrics(
  predictedGraph: CausalGraph | null,
  trueGraph: CausalGraph,
  dataset: CausalDataset,
  baseline: string,
  noiseLevel: number,
  seed: number,
  queryCost: number,
  oracleF1: number,
  oracleR2: number,
  rng: () => number,
): P5Metrics {
  const configLabel = `n${trueGraph.nodeCount}_d${trueGraph.config.density}`;

  if (!predictedGraph) {
    return {
      graphConfig: configLabel,
      baseline,
      noiseLevel,
      seed,
      graphF1: 0,
      graphPrecision: 0,
      graphRecall: 0,
      shd: trueGraph.nodeCount * (trueGraph.nodeCount - 1),
      interventionR2: 0,
      counterfactualAccuracy: 0,
      compression: 1,
      queryCost,
      oracleGap: oracleF1,
    };
  }

  const trueAdj = adjacencyMatrix(trueGraph);
  const predAdj = adjacencyMatrix(predictedGraph);

  // Pad predicted adj to match true adj size if needed
  const n = trueAdj.length;
  const paddedPred: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i < predAdj.length && j < predAdj.length ? predAdj[i][j] : 0
    )
  );

  const ga = graphAccuracy(paddedPred, trueAdj);
  const intR2 = interventionR2(predictedGraph, dataset);
  const cfAcc = counterfactualAccuracy(predictedGraph, trueGraph, dataset, rng);
  const comp = compression(predictedGraph);
  const oracleGap = Math.max(0, oracleF1 - ga.f1);

  return {
    graphConfig: configLabel,
    baseline,
    noiseLevel,
    seed,
    graphF1: ga.f1,
    graphPrecision: ga.precision,
    graphRecall: ga.recall,
    shd: ga.shd,
    interventionR2: intR2,
    counterfactualAccuracy: cfAcc,
    compression: comp,
    queryCost,
    oracleGap,
  };
}
