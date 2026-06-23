// P5 Benchmark: Causal Mechanism Discovery
// Given observational and interventional data from a known causal DAG,
// discover the graph structure and mechanism parameters. This is a controlled
// causal benchmark — NOT real-world causal discovery.
//
// Claim boundary:
//   Allowed: P5 tests causal mechanism discovery in a controlled sandbox with
//     known ground-truth DAGs and linear mechanisms.
//   Forbidden: The system discovered real causal relationships in the wild.
//     The system solved general causal inference.

import {
  generateCausalGraph, adjacencyMatrix, isDAG, topologicalOrder,
  GRAPH_CONFIGS, type CausalGraph, type GraphConfig,
} from './causalGraph.js';
import {
  generateSamples, simulateQuery, computeTrueMean,
  type CausalDataset, type Intervention,
} from './interventionDataset.js';
import {
  computeP5Metrics, graphAccuracy, type P5Metrics,
} from './p5Score.js';
import * as fs from 'fs';
import * as path from 'path';

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

// ---------------------------------------------------------------------------
// Baseline 1: random_graph_search
// Generate a random DAG with the same number of nodes, return it.
// ---------------------------------------------------------------------------

function baselineRandomGraphSearch(
  trueGraph: CausalGraph,
  rng: () => number,
): { predicted: CausalGraph; queryCost: number } {
  // Generate a random DAG with same node count and density
  const config: GraphConfig = {
    nodeCount: trueGraph.nodeCount,
    density: trueGraph.config.density,
    seed: Math.floor(rng() * 100000),
  };
  const predicted = generateCausalGraph(config);
  return { predicted, queryCost: 0 };
}

// ---------------------------------------------------------------------------
// Baseline 2: greedy_fit
// Use observational data to greedily fit edges via correlation thresholding.
// ---------------------------------------------------------------------------

function baselineGreedyFit(
  trueGraph: CausalGraph,
  dataset: CausalDataset,
): { predicted: CausalGraph; queryCost: number } {
  const n = trueGraph.nodeCount;
  const samples = dataset.observational;

  // Compute correlation matrix
  const nodeIds = trueGraph.nodes.map(nd => nd.id);
  const corrMatrix = computeCorrelationMatrix(samples, nodeIds);

  // Greedy edge selection: add edge i -> j if corr > threshold and i < j
  const threshold = 0.3;
  const edges: { from: string; to: string; coefficient: number }[] = [];
  const parentMap: Map<string, string[]> = new Map();
  for (const id of nodeIds) parentMap.set(id, []);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(corrMatrix[i][j]) > threshold) {
        const from = nodeIds[i];
        const to = nodeIds[j];
        const coefficient = estimateEdgeCoefficient(samples, from, to);
        edges.push({ from, to, coefficient });
        parentMap.get(to)!.push(from);
      }
    }
  }

  // Build predicted graph
  const predicted = buildGraphFromEdges(trueGraph, edges, parentMap);
  return { predicted, queryCost: samples.length };
}

// ---------------------------------------------------------------------------
// Baseline 3: active_random_intervention
// Randomly intervene on nodes, use interventional data to discover edges.
// ---------------------------------------------------------------------------

function baselineActiveRandomIntervention(
  trueGraph: CausalGraph,
  dataset: CausalDataset,
  budget: number,
  noiseLevel: number,
  rng: () => number,
): { predicted: CausalGraph; queryCost: number } {
  const n = trueGraph.nodeCount;
  const nodeIds = trueGraph.nodes.map(nd => nd.id);

  // Collect data from random interventions
  const collectedSamples: { values: Record<string, number>; intervention: Intervention | null }[] = [];

  // Start with observational data
  for (const s of dataset.observational) {
    collectedSamples.push({ values: s.values, intervention: s.intervention });
  }

  // Random interventions within budget
  for (let q = 0; q < budget; q++) {
    const targetIdx = Math.floor(rng() * n);
    const targetNode = nodeIds[targetIdx];
    const value = (rng() - 0.5) * 4;
    const intervention: Intervention = { nodeId: targetNode, value };
    const sample = simulateQuery(trueGraph, intervention, rng, noiseLevel);
    collectedSamples.push({ values: sample.values, intervention: sample.intervention });
  }

  // Use collected data to discover edges
  const corrMatrix = computeCorrelationMatrix(
    collectedSamples.map(s => ({ values: s.values, isInterventional: false, intervention: null })),
    nodeIds,
  );

  // Also use interventional data: if intervening on X_i changes X_j,
  // then there's a causal path from i to j
  const intEdges = new Set<string>();
  for (const s of collectedSamples) {
    if (s.intervention) {
      const intNode = s.intervention.nodeId;
      const intVal = s.intervention.value;
      // Check which other nodes are affected
      for (const nodeId of nodeIds) {
        if (nodeId === intNode) continue;
        // Simple heuristic: if corr between intervened node and this node is high
        const iIdx = nodeIds.indexOf(intNode);
        const jIdx = nodeIds.indexOf(nodeId);
        if (iIdx < jIdx && Math.abs(corrMatrix[iIdx][jIdx]) > 0.2) {
          intEdges.add(`${intNode}->${nodeId}`);
        }
      }
    }
  }

  // Build edge list
  const threshold = 0.25;
  const edges: { from: string; to: string; coefficient: number }[] = [];
  const parentMap: Map<string, string[]> = new Map();
  for (const id of nodeIds) parentMap.set(id, []);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(corrMatrix[i][j]) > threshold || intEdges.has(`${nodeIds[i]}->${nodeIds[j]}`)) {
        const from = nodeIds[i];
        const to = nodeIds[j];
        const coefficient = estimateEdgeCoefficient(
          collectedSamples.map(s => ({ values: s.values, isInterventional: false, intervention: null as Intervention | null })),
          from, to,
        );
        edges.push({ from, to, coefficient });
        parentMap.get(to)!.push(from);
      }
    }
  }

  const predicted = buildGraphFromEdges(trueGraph, edges, parentMap);
  return { predicted, queryCost: budget };
}

// ---------------------------------------------------------------------------
// Baseline 4: active_infogain_intervention
// Intervene on nodes that maximize expected information gain about the graph.
// ---------------------------------------------------------------------------

function baselineActiveInfogainIntervention(
  trueGraph: CausalGraph,
  dataset: CausalDataset,
  budget: number,
  noiseLevel: number,
  rng: () => number,
): { predicted: CausalGraph; queryCost: number } {
  const n = trueGraph.nodeCount;
  const nodeIds = trueGraph.nodes.map(nd => nd.id);

  // Start with observational data
  const collectedSamples: { values: Record<string, number>; intervention: Intervention | null }[] = [];
  for (const s of dataset.observational) {
    collectedSamples.push({ values: s.values, intervention: s.intervention });
  }

  // Track uncertainty per edge: initially all edges are uncertain
  const edgeUncertainty: Map<string, number> = new Map();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      edgeUncertainty.set(`${nodeIds[i]}->${nodeIds[j]}`, 1);
    }
  }

  for (let q = 0; q < budget; q++) {
    // Select intervention target that maximizes expected info gain
    // Heuristic: intervene on the node with the most uncertain outgoing edges
    let bestNode = nodeIds[0];
    let bestScore = -1;

    for (const nodeId of nodeIds) {
      const nodeIdx = nodeIds.indexOf(nodeId);
      let score = 0;
      for (let j = nodeIdx + 1; j < n; j++) {
        const key = `${nodeId}->${nodeIds[j]}`;
        score += edgeUncertainty.get(key) ?? 0;
      }
      // Also count incoming edges from nodes with higher uncertainty
      for (let i = 0; i < nodeIdx; i++) {
        const key = `${nodeIds[i]}->${nodeId}`;
        score += (edgeUncertainty.get(key) ?? 0) * 0.5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestNode = nodeId;
      }
    }

    // Intervene on best node at a random value
    const value = (rng() - 0.5) * 4;
    const intervention: Intervention = { nodeId: bestNode, value };
    const sample = simulateQuery(trueGraph, intervention, rng, noiseLevel);
    collectedSamples.push({ values: sample.values, intervention: sample.intervention });

    // Update edge uncertainty based on new data
    const corrMatrix = computeCorrelationMatrix(
      collectedSamples.map(s => ({ values: s.values, isInterventional: false, intervention: null as Intervention | null })),
      nodeIds,
    );

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const key = `${nodeIds[i]}->${nodeIds[j]}`;
        const corr = Math.abs(corrMatrix[i][j]);
        // Reduce uncertainty proportional to correlation strength
        edgeUncertainty.set(key, Math.max(0, 1 - corr * 2));
      }
    }
  }

  // Build graph from collected data
  const corrMatrix = computeCorrelationMatrix(
    collectedSamples.map(s => ({ values: s.values, isInterventional: false, intervention: null as Intervention | null })),
    nodeIds,
  );

  const threshold = 0.2;
  const edges: { from: string; to: string; coefficient: number }[] = [];
  const parentMap: Map<string, string[]> = new Map();
  for (const id of nodeIds) parentMap.set(id, []);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(corrMatrix[i][j]) > threshold) {
        const from = nodeIds[i];
        const to = nodeIds[j];
        const coefficient = estimateEdgeCoefficient(
          collectedSamples.map(s => ({ values: s.values, isInterventional: false, intervention: null as Intervention | null })),
          from, to,
        );
        edges.push({ from, to, coefficient });
        parentMap.get(to)!.push(from);
      }
    }
  }

  const predicted = buildGraphFromEdges(trueGraph, edges, parentMap);
  return { predicted, queryCost: budget };
}

// ---------------------------------------------------------------------------
// Baseline 5: oracle_graph
// Always returns the true graph.
// ---------------------------------------------------------------------------

function baselineOracleGraph(
  trueGraph: CausalGraph,
): { predicted: CausalGraph; queryCost: number } {
  return { predicted: trueGraph, queryCost: 0 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeCorrelationMatrix(
  samples: { values: Record<string, number> }[],
  nodeIds: string[],
): number[][] {
  const n = nodeIds.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  if (samples.length < 2) return matrix;

  // Compute means
  const means: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (const s of samples) {
      const v = s.values[nodeIds[i]];
      if (Number.isFinite(v)) { sum += v; count++; }
    }
    means.push(count > 0 ? sum / count : 0);
  }

  // Compute std devs and correlations
  const stds: number[] = [];
  for (let i = 0; i < n; i++) {
    let ss = 0;
    let count = 0;
    for (const s of samples) {
      const v = s.values[nodeIds[i]];
      if (Number.isFinite(v)) { ss += (v - means[i]) ** 2; count++; }
    }
    stds.push(count > 1 ? Math.sqrt(ss / (count - 1)) : 1);
  }

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      let cov = 0;
      let count = 0;
      for (const s of samples) {
        const vi = s.values[nodeIds[i]];
        const vj = s.values[nodeIds[j]];
        if (Number.isFinite(vi) && Number.isFinite(vj)) {
          cov += (vi - means[i]) * (vj - means[j]);
          count++;
        }
      }
      const denom = stds[i] * stds[j] * (count > 1 ? count - 1 : 1);
      const corr = denom > 0 ? cov / denom : 0;
      const clampedCorr = Math.max(-1, Math.min(1, corr));
      matrix[i][j] = clampedCorr;
      matrix[j][i] = clampedCorr;
    }
  }

  return matrix;
}

function estimateEdgeCoefficient(
  samples: { values: Record<string, number> }[],
  from: string,
  to: string,
): number {
  // Simple OLS: regress to on from
  let sumXY = 0;
  let sumXX = 0;
  let count = 0;

  const meanFrom = samples.reduce((s, dp) => s + (dp.values[from] ?? 0), 0) / samples.length;
  const meanTo = samples.reduce((s, dp) => s + (dp.values[to] ?? 0), 0) / samples.length;

  for (const dp of samples) {
    const x = (dp.values[from] ?? 0) - meanFrom;
    const y = (dp.values[to] ?? 0) - meanTo;
    sumXY += x * y;
    sumXX += x * x;
    count++;
  }

  return sumXX > 0 ? sumXY / sumXX : 0;
}

function buildGraphFromEdges(
  trueGraph: CausalGraph,
  edges: { from: string; to: string; coefficient: number }[],
  parentMap: Map<string, string[]>,
): CausalGraph {
  const nodes = trueGraph.nodes.map(nd => {
    const parents = parentMap.get(nd.id) ?? [];
    const coefficients: Record<string, number> = {};
    for (const p of parents) {
      const edge = edges.find(e => e.from === p && e.to === nd.id);
      coefficients[p] = edge?.coefficient ?? 0.5;
    }
    return {
      id: nd.id,
      index: nd.index,
      coefficients,
      intercept: nd.intercept,
      noiseStd: nd.noiseStd,
    };
  });

  return {
    nodes,
    edges: edges.map(e => ({ from: e.from, to: e.to, coefficient: e.coefficient })),
    nodeCount: trueGraph.nodeCount,
    edgeCount: edges.length,
    config: trueGraph.config,
  };
}

// ---------------------------------------------------------------------------
// Main Benchmark Runner
// ---------------------------------------------------------------------------

export interface P5BenchmarkOptions {
  noiseLevels: number[];
  budget: number;
  seeds: number;
  outputDir: string;
}

const BASELINES = [
  'random_graph_search',
  'greedy_fit',
  'active_random_intervention',
  'active_infogain_intervention',
  'oracle_graph',
] as const;

type BaselineName = typeof BASELINES[number];

export async function runP5Benchmark(options: P5BenchmarkOptions): Promise<void> {
  const { noiseLevels, budget, seeds, outputDir } = options;

  console.log('=== P5: Causal Mechanism Discovery Benchmark ===\n');
  console.log(`Graph configs: ${GRAPH_CONFIGS.length}`);
  console.log(`Noise levels: ${noiseLevels.join(', ')}`);
  console.log(`Budget: ${budget} queries`);
  console.log(`Seeds: ${seeds}`);
  console.log(`Baselines: ${BASELINES.join(', ')}\n`);

  const allMetrics: P5Metrics[] = [];
  const failureCases: any[] = [];

  for (const noiseLevel of noiseLevels) {
    console.log(`--- Noise level: ${noiseLevel} ---`);

    for (const graphConfig of GRAPH_CONFIGS) {
      for (let seedIdx = 0; seedIdx < seeds; seedIdx++) {
        const seed = graphConfig.seed + seedIdx * 100;
        const rng = mulberry32(seed);

        // Generate true graph and dataset
        const trueGraph = generateCausalGraph({ ...graphConfig, seed });
        const dataset = generateSamples(trueGraph, {
          seed,
          noiseLevel,
          obsCount: 100,
          intPerTarget: 5,
        });

        // Compute oracle metrics for gap calculation
        const trueAdj = adjacencyMatrix(trueGraph);
        const oracleGa = graphAccuracy(trueAdj, trueAdj);

        for (const baseline of BASELINES) {
          let predictedGraph: CausalGraph | null = null;
          let queryCost = 0;

          switch (baseline) {
            case 'random_graph_search': {
              const r = baselineRandomGraphSearch(trueGraph, rng);
              predictedGraph = r.predicted;
              queryCost = r.queryCost;
              break;
            }
            case 'greedy_fit': {
              const r = baselineGreedyFit(trueGraph, dataset);
              predictedGraph = r.predicted;
              queryCost = r.queryCost;
              break;
            }
            case 'active_random_intervention': {
              const r = baselineActiveRandomIntervention(trueGraph, dataset, budget, noiseLevel, rng);
              predictedGraph = r.predicted;
              queryCost = r.queryCost;
              break;
            }
            case 'active_infogain_intervention': {
              const r = baselineActiveInfogainIntervention(trueGraph, dataset, budget, noiseLevel, rng);
              predictedGraph = r.predicted;
              queryCost = r.queryCost;
              break;
            }
            case 'oracle_graph': {
              const r = baselineOracleGraph(trueGraph);
              predictedGraph = r.predicted;
              queryCost = r.queryCost;
              break;
            }
          }

          const metrics = computeP5Metrics(
            predictedGraph,
            trueGraph,
            dataset,
            baseline,
            noiseLevel,
            seed,
            queryCost,
            oracleGa.f1,
            1, // oracle R² is always 1
            rng,
          );
          allMetrics.push(metrics);

          // Record failure cases: non-oracle baselines with low F1
          if (metrics.graphF1 < 0.5 && baseline !== 'oracle_graph') {
            failureCases.push({
              graphConfig: metrics.graphConfig,
              baseline,
              noiseLevel,
              seed,
              graphF1: metrics.graphF1,
              shd: metrics.shd,
              interventionR2: metrics.interventionR2,
              queryCost,
            });
          }
        }
      }
    }
  }

  // Generate report
  const report = generateReport(allMetrics, noiseLevels, budget, seeds);
  const summary = generateSummaryCSV(allMetrics, noiseLevels);

  // Write outputs
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'report.md'), report);
  fs.writeFileSync(path.join(outputDir, 'summary.csv'), summary);
  fs.writeFileSync(
    path.join(outputDir, 'failure_cases.jsonl'),
    failureCases.map(fc => JSON.stringify(fc)).join('\n') + '\n',
  );

  console.log(`\nResults written to ${outputDir}/`);
  console.log(`  report.md`);
  console.log(`  summary.csv`);
  console.log(`  failure_cases.jsonl`);
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function generateReport(
  metrics: P5Metrics[],
  noiseLevels: number[],
  budget: number,
  seeds: number,
): string {
  const lines: string[] = [];

  lines.push('# P5: Causal Mechanism Discovery Benchmark Report\n');
  lines.push(`**Graph configs**: ${GRAPH_CONFIGS.length} (5-8 nodes x 2 density levels)`);
  lines.push(`**Noise levels**: ${noiseLevels.join(', ')}`);
  lines.push(`**Budget**: ${budget} queries`);
  lines.push(`**Seeds**: ${seeds}`);
  lines.push(`**Baselines**: ${BASELINES.join(', ')}\n`);

  for (const noise of noiseLevels) {
    lines.push(`## Noise = ${noise}\n`);
    lines.push('| Baseline | Graph F1 | Graph Precision | Graph Recall | SHD | Int R² | CF Accuracy | Compression | Avg Queries | Oracle Gap |');
    lines.push('|----------|---------:|----------------:|-------------:|----:|-------:|------------:|------------:|------------:|-----------:|');

    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const avgF1 = bm.reduce((s, m) => s + m.graphF1, 0) / bm.length;
      const avgPrec = bm.reduce((s, m) => s + m.graphPrecision, 0) / bm.length;
      const avgRec = bm.reduce((s, m) => s + m.graphRecall, 0) / bm.length;
      const avgSHD = bm.reduce((s, m) => s + m.shd, 0) / bm.length;
      const avgR2 = bm.reduce((s, m) => s + m.interventionR2, 0) / bm.length;
      const avgCF = bm.reduce((s, m) => s + m.counterfactualAccuracy, 0) / bm.length;
      const avgComp = bm.reduce((s, m) => s + m.compression, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const avgGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      lines.push(
        `| ${baseline} | ${avgF1.toFixed(4)} | ${avgPrec.toFixed(4)} | ${avgRec.toFixed(4)} | ${avgSHD.toFixed(1)} | ${avgR2.toFixed(4)} | ${avgCF.toFixed(4)} | ${avgComp.toFixed(4)} | ${avgQueries.toFixed(1)} | ${avgGap.toFixed(4)} |`,
      );
    }
    lines.push('');
  }

  // Per-config breakdown
  lines.push('## Per-Config Breakdown\n');
  const configs = [...new Set(metrics.map(m => m.graphConfig))];
  for (const config of configs) {
    lines.push(`### ${config}\n`);
    const cm = metrics.filter(m => m.graphConfig === config);
    lines.push('| Baseline | Graph F1 | SHD | Int R² | CF Accuracy |');
    lines.push('|----------|---------:|----:|-------:|------------:|');
    for (const baseline of BASELINES) {
      const bm = cm.filter(m => m.baseline === baseline);
      if (bm.length === 0) continue;
      const avgF1 = bm.reduce((s, m) => s + m.graphF1, 0) / bm.length;
      const avgSHD = bm.reduce((s, m) => s + m.shd, 0) / bm.length;
      const avgR2 = bm.reduce((s, m) => s + m.interventionR2, 0) / bm.length;
      const avgCF = bm.reduce((s, m) => s + m.counterfactualAccuracy, 0) / bm.length;
      lines.push(`| ${baseline} | ${avgF1.toFixed(4)} | ${avgSHD.toFixed(1)} | ${avgR2.toFixed(4)} | ${avgCF.toFixed(4)} |`);
    }
    lines.push('');
  }

  // Claim boundary
  lines.push('## Claim Boundary\n');
  lines.push('**Allowed**: P5 tests causal mechanism discovery in a controlled sandbox with known ground-truth DAGs and linear mechanisms. P5 evaluates whether active interventional strategies outperform passive observation for graph recovery.');
  lines.push('**Forbidden**: The system discovered real causal relationships in the wild. The system solved general causal inference. The system can replace domain expertise in causal modeling.');

  return lines.join('\n');
}

function generateSummaryCSV(metrics: P5Metrics[], noiseLevels: number[]): string {
  const header = 'baseline,noise_level,graph_f1,graph_precision,graph_recall,shd,int_r2,cf_accuracy,compression,avg_queries,oracle_gap';
  const rows: string[] = [];

  for (const noise of noiseLevels) {
    for (const baseline of BASELINES) {
      const bm = metrics.filter(m => m.baseline === baseline && m.noiseLevel === noise);
      if (bm.length === 0) continue;

      const avgF1 = bm.reduce((s, m) => s + m.graphF1, 0) / bm.length;
      const avgPrec = bm.reduce((s, m) => s + m.graphPrecision, 0) / bm.length;
      const avgRec = bm.reduce((s, m) => s + m.graphRecall, 0) / bm.length;
      const avgSHD = bm.reduce((s, m) => s + m.shd, 0) / bm.length;
      const avgR2 = bm.reduce((s, m) => s + m.interventionR2, 0) / bm.length;
      const avgCF = bm.reduce((s, m) => s + m.counterfactualAccuracy, 0) / bm.length;
      const avgComp = bm.reduce((s, m) => s + m.compression, 0) / bm.length;
      const avgQueries = bm.reduce((s, m) => s + m.queryCost, 0) / bm.length;
      const avgGap = bm.reduce((s, m) => s + m.oracleGap, 0) / bm.length;

      rows.push(
        `${baseline},${noise},${avgF1.toFixed(4)},${avgPrec.toFixed(4)},${avgRec.toFixed(4)},${avgSHD.toFixed(1)},${avgR2.toFixed(4)},${avgCF.toFixed(4)},${avgComp.toFixed(4)},${avgQueries.toFixed(1)},${avgGap.toFixed(4)}`,
      );
    }
  }

  return header + '\n' + rows.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  let noiseLevels = [0, 0.01, 0.05];
  let budget = 10;
  let seeds = 3;
  let outputDir = 'results/p5_causal_mechanism';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--noise' && args[i + 1]) {
      noiseLevels = args[++i].split(',').map(Number);
    } else if (args[i] === '--budget' && args[i + 1]) {
      budget = parseInt(args[++i]);
    } else if (args[i] === '--seeds' && args[i + 1]) {
      seeds = parseInt(args[++i]);
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[++i];
    }
  }

  await runP5Benchmark({ noiseLevels, budget, seeds, outputDir });
}

main().catch(e => {
  console.error(`P5 benchmark failed: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
