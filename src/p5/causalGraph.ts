// P5 Causal Graph: Types and utilities for causal mechanism discovery.
// Generates random DAGs, computes adjacency matrices, topological orderings,
// and parent sets. This is a controlled benchmark — NOT real-world causal
// discovery.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CausalNode {
  id: string;
  index: number;
  /** Linear coefficient for each parent edge */
  coefficients: Record<string, number>;
  /** Intercept term */
  intercept: number;
  /** Noise standard deviation for this node's value */
  noiseStd: number;
}

export interface CausalEdge {
  from: string;
  to: string;
  coefficient: number;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  nodeCount: number;
  edgeCount: number;
  /** Config that generated this graph */
  config: GraphConfig;
}

export interface GraphConfig {
  nodeCount: number;
  /** Probability of an edge existing between any ordered pair (i -> j, i < j) */
  density: number;
  seed: number;
}

// ---------------------------------------------------------------------------
// Graph generation
// ---------------------------------------------------------------------------

/** Seeded PRNG (mulberry32) */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random causal DAG.
 * Nodes are ordered topologically (0..n-1). Edges only go from lower index
 * to higher index, guaranteeing acyclicity. Each potential edge (i -> j, i < j)
 * is included with probability `density`.
 */
export function generateCausalGraph(config: GraphConfig): CausalGraph {
  const { nodeCount, density, seed } = config;
  const rng = mulberry32(seed);

  const nodeIds: string[] = [];
  for (let i = 0; i < nodeCount; i++) {
    nodeIds.push(`X${i}`);
  }

  // Generate edges (only i < j to ensure DAG)
  const edges: CausalEdge[] = [];
  const parentMap: Map<string, string[]> = new Map();
  for (const id of nodeIds) parentMap.set(id, []);

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (rng() < density) {
        const from = nodeIds[i];
        const to = nodeIds[j];
        const coefficient = 0.3 + rng() * 1.7; // coefficient in [0.3, 2.0]
        edges.push({ from, to, coefficient });
        parentMap.get(to)!.push(from);
      }
    }
  }

  // Build nodes with coefficients
  const nodes: CausalNode[] = nodeIds.map((id, i) => {
    const parents = parentMap.get(id)!;
    const coefficients: Record<string, number> = {};
    for (const p of parents) {
      const edge = edges.find(e => e.from === p && e.to === id)!;
      coefficients[p] = edge.coefficient;
    }
    return {
      id,
      index: i,
      coefficients,
      intercept: (rng() - 0.5) * 2, // intercept in [-1, 1]
      noiseStd: 0.1 + rng() * 0.4, // noise std in [0.1, 0.5]
    };
  });

  return {
    nodes,
    edges,
    nodeCount,
    edgeCount: edges.length,
    config,
  };
}

// ---------------------------------------------------------------------------
// Adjacency matrix
// ---------------------------------------------------------------------------

/**
 * Return the adjacency matrix of the graph.
 * adj[i][j] = 1 if there is an edge from node i to node j, else 0.
 */
export function adjacencyMatrix(graph: CausalGraph): number[][] {
  const n = graph.nodeCount;
  const adj: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (const edge of graph.edges) {
    const fromIdx = graph.nodes.findIndex(node => node.id === edge.from);
    const toIdx = graph.nodes.findIndex(node => node.id === edge.to);
    if (fromIdx >= 0 && toIdx >= 0) {
      adj[fromIdx][toIdx] = 1;
    }
  }

  return adj;
}

// ---------------------------------------------------------------------------
// DAG check
// ---------------------------------------------------------------------------

/**
 * Check if a given adjacency matrix represents a DAG.
 * Uses Kahn's algorithm: if we can topologically sort all nodes, it's a DAG.
 */
export function isDAG(adj: number[][]): boolean {
  const n = adj.length;
  const inDegree = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (adj[i][j] === 1) inDegree[j]++;
    }
  }

  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    visited++;
    for (let j = 0; j < n; j++) {
      if (adj[node][j] === 1) {
        inDegree[j]--;
        if (inDegree[j] === 0) queue.push(j);
      }
    }
  }

  return visited === n;
}

// ---------------------------------------------------------------------------
// Topological order
// ---------------------------------------------------------------------------

/**
 * Return the topological ordering of nodes in a CausalGraph.
 * Since our graphs are generated with edges only from lower to higher index,
 * the topological order is simply [0, 1, ..., n-1].
 * This function works for any DAG given its adjacency matrix.
 */
export function topologicalOrder(adj: number[][]): number[] {
  const n = adj.length;
  const inDegree = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (adj[i][j] === 1) inDegree[j]++;
    }
  }

  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const order: number[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (let j = 0; j < n; j++) {
      if (adj[node][j] === 1) {
        inDegree[j]--;
        if (inDegree[j] === 0) queue.push(j);
      }
    }
  }

  return order;
}

// ---------------------------------------------------------------------------
// Parent lookup
// ---------------------------------------------------------------------------

/**
 * Get the parent node IDs of a given node in the graph.
 */
export function getParents(graph: CausalGraph, nodeId: string): string[] {
  const parents: string[] = [];
  for (const edge of graph.edges) {
    if (edge.to === nodeId) {
      parents.push(edge.from);
    }
  }
  return parents;
}

// ---------------------------------------------------------------------------
// Graph configs for benchmark
// ---------------------------------------------------------------------------

/** 8 graph configurations: 5-8 nodes x 2 density levels */
export const GRAPH_CONFIGS: GraphConfig[] = [
  { nodeCount: 5, density: 0.3, seed: 100 },
  { nodeCount: 5, density: 0.6, seed: 101 },
  { nodeCount: 6, density: 0.3, seed: 102 },
  { nodeCount: 6, density: 0.6, seed: 103 },
  { nodeCount: 7, density: 0.3, seed: 104 },
  { nodeCount: 7, density: 0.6, seed: 105 },
  { nodeCount: 8, density: 0.3, seed: 106 },
  { nodeCount: 8, density: 0.6, seed: 107 },
];
