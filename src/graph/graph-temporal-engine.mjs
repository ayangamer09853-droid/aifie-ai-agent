/**
 * AIFIE GRAPH TEMPORAL ENGINE & REGIME SHIFT DETECTOR
 * 
 * Manages time-stamped graph snapshots, historical diffing, and quantitative
 * detection of systemic topology phase transitions and contagion vectors.
 * 
 * Capabilities:
 * - Snapshots capturing nodes, edges, weights, centralities at time t
 * - Frobenius norm difference between adjacency matrices
 * - Centrality rank displacement (PageRank, Betweenness Δ)
 * - Emerging systemic risk and contagion channel detection
 * 
 * Pure Node.js ESM - Built-in standard library only.
 */

import { EventEmitter } from "node:events";

export class GraphTemporalEngine extends EventEmitter {
  /**
   * @param {Object} options
   * @param {number} [options.maxSnapshots=100] Maximum snapshots retained in memory
   */
  constructor(options = {}) {
    super();
    this.maxSnapshots = options.maxSnapshots || 100;
    /** @type {Array<{ id: string, timestamp: string, label: string, nodeCount: number, edgeCount: number, state: Object }>} */
    this.snapshots = [];
  }

  /**
   * Capture a point-in-time snapshot from a graph instance and topology calculator
   * @param {Object} causalityGraph FinancialCausalityGraph instance
   * @param {Object} topologyData Precomputed topology metrics
   * @param {string} [label] Optional human-readable label
   * @returns {Object} Snapshot record
   */
  captureSnapshot(causalityGraph, topologyData = null, label = "REGULAR_SNAPSHOT") {
    const timestamp = new Date().toISOString();
    const id = `SNAP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const nodes = causalityGraph.getAllNodes().map(n => ({ ...n }));
    const edges = causalityGraph.getAllEdges().map(e => ({ ...e }));

    // Build dense adjacency weights map for fast matrix math
    const adjacency = {};
    for (const e of edges) {
      if (!adjacency[e.source]) adjacency[e.source] = {};
      adjacency[e.source][e.target] = { weight: e.weight, confidence: e.confidence };
    }

    const snapshot = {
      id,
      timestamp,
      label,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      state: {
        nodes,
        edges,
        adjacency,
        topology: topologyData || null
      }
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.emit("snapshot_created", { id, timestamp, label });
    return snapshot;
  }

  /**
   * Get all snapshot summaries
   * @returns {Array<Object>}
   */
  getSnapshotList() {
    return this.snapshots.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      label: s.label,
      nodeCount: s.nodeCount,
      edgeCount: s.edgeCount,
      hasTopology: !!s.state.topology
    }));
  }

  /**
   * Get snapshot by ID or latest
   * @param {string} [id]
   * @returns {Object|null}
   */
  getSnapshot(id) {
    if (!id || id === "latest") {
      return this.snapshots[this.snapshots.length - 1] || null;
    }
    return this.snapshots.find(s => s.id === id) || null;
  }

  /**
   * Compare two graph snapshots to calculate structural diffs & regime shifts
   * @param {string} snapshotIdA Baseline snapshot ID (e.g. t_0 or earlier)
   * @param {string} snapshotIdB Target snapshot ID (e.g. t_current or later)
   * @returns {Object} Quantitative diff report
   */
  compareSnapshots(snapshotIdA, snapshotIdB) {
    const snapA = this.getSnapshot(snapshotIdA);
    const snapB = this.getSnapshot(snapshotIdB);

    if (!snapA || !snapB) {
      throw new Error(`One or both snapshots not found (A: ${snapshotIdA}, B: ${snapshotIdB})`);
    }

    const nodesA = new Map(snapA.state.nodes.map(n => [n.id, n]));
    const nodesB = new Map(snapB.state.nodes.map(n => [n.id, n]));

    const addedNodes = [];
    const removedNodes = [];
    const sharedNodes = [];

    for (const [id, node] of nodesB.entries()) {
      if (!nodesA.has(id)) addedNodes.push(node);
      else sharedNodes.push(id);
    }
    for (const [id, node] of nodesA.entries()) {
      if (!nodesB.has(id)) removedNodes.push(node);
    }

    // Edge map keys: `source->target:relation` (handling from/to/type as well)
    const edgeKey = e => `${e.from || e.source}-->${e.to || e.target}::${e.type || e.relation || 'CAUSAL'}`;
    const edgesA = new Map(snapA.state.edges.map(e => [edgeKey(e), e]));
    const edgesB = new Map(snapB.state.edges.map(e => [edgeKey(e), e]));

    const addedEdges = [];
    const removedEdges = [];
    const mutatedEdges = [];
    let squaredWeightDiffSum = 0;
    let totalComparedEdges = 0;

    for (const [key, edgeB] of edgesB.entries()) {
      if (!edgesA.has(key)) {
        addedEdges.push(edgeB);
        squaredWeightDiffSum += edgeB.weight * edgeB.weight;
      } else {
        const edgeA = edgesA.get(key);
        const weightDelta = Number((edgeB.weight - edgeA.weight).toFixed(4));
        const confDelta = Number((edgeB.confidence - edgeA.confidence).toFixed(4));
        if (Math.abs(weightDelta) > 0.0001 || Math.abs(confDelta) > 0.0001) {
          mutatedEdges.push({
            key,
            source: edgeB.source,
            target: edgeB.target,
            relation: edgeB.relation,
            oldWeight: edgeA.weight,
            newWeight: edgeB.weight,
            weightDelta,
            oldConfidence: edgeA.confidence,
            newConfidence: edgeB.confidence,
            confDelta
          });
        }
        squaredWeightDiffSum += weightDelta * weightDelta;
      }
      totalComparedEdges++;
    }

    for (const [key, edgeA] of edgesA.entries()) {
      if (!edgesB.has(key)) {
        removedEdges.push(edgeA);
        squaredWeightDiffSum += edgeA.weight * edgeA.weight;
        totalComparedEdges++;
      }
    }

    // Frobenius norm of adjacency matrix difference
    const frobeniusDistance = Number(Math.sqrt(squaredWeightDiffSum).toFixed(4));

    // Centrality Displacements
    const pageRankDelta = {};
    let maxPageRankShift = { node: null, delta: 0 };
    
    if (snapA.state.topology?.centralities?.pageRank && snapB.state.topology?.centralities?.pageRank) {
      const prA = snapA.state.topology.centralities.pageRank;
      const prB = snapB.state.topology.centralities.pageRank;
      for (const nodeId of sharedNodes) {
        const scoreA = prA[nodeId] || 0;
        const scoreB = prB[nodeId] || 0;
        const delta = Number((scoreB - scoreA).toFixed(4));
        pageRankDelta[nodeId] = {
          before: scoreA,
          after: scoreB,
          delta
        };
        if (Math.abs(delta) > Math.abs(maxPageRankShift.delta)) {
          maxPageRankShift = { node: nodeId, delta };
        }
      }
    }

    // Quantify Regime Shift Severity (0.0 to 1.0)
    const normalizedFrobenius = Math.min(1.0, frobeniusDistance / Math.max(1, Math.sqrt(totalComparedEdges)));
    const edgeChurnRate = (addedEdges.length + removedEdges.length + mutatedEdges.length) / Math.max(1, totalComparedEdges);
    const regimeShiftIndex = Number(Math.min(1.0, (normalizedFrobenius * 0.6) + (edgeChurnRate * 0.4)).toFixed(4));

    let regimeState = "STABLE";
    if (regimeShiftIndex >= 0.6) regimeState = "CRITICAL_PHASE_TRANSITION";
    else if (regimeShiftIndex >= 0.3) regimeState = "MODERATE_RESTRUCTURING";
    else if (regimeShiftIndex >= 0.1) regimeState = "LOW_DRIFT";

    return {
      baseline: { id: snapA.id, timestamp: snapA.timestamp, label: snapA.label },
      target: { id: snapB.id, timestamp: snapB.timestamp, label: snapB.label },
      metrics: {
        frobeniusDistance,
        regimeShiftIndex,
        regimeState,
        edgeChurnRate: Number(edgeChurnRate.toFixed(4)),
        maxPageRankShift
      },
      changes: {
        addedNodesCount: addedNodes.length,
        removedNodesCount: removedNodes.length,
        addedEdgesCount: addedEdges.length,
        removedEdgesCount: removedEdges.length,
        mutatedEdgesCount: mutatedEdges.length,
        addedNodes,
        removedNodes,
        addedEdges,
        removedEdges,
        mutatedEdges: mutatedEdges.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta))
      },
      pageRankDisplacements: pageRankDelta
    };
  }
}
