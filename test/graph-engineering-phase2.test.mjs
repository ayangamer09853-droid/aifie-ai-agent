/**
 * AIFIE GRAPH ENGINEERING PHASE 2 TEST SUITE
 * 
 * Tests:
 * 1. GraphTemporalEngine snapshots, diffing, Frobenius matrix distance, and regime shift detection.
 * 2. GraphSpectralEmbeddings Node2Vec biased random walks, embedding training, cosine similarity, nearest neighbors.
 * 3. GraphExecutionSlicer centrality-aware order slicing, downstream spillover risk, TWAP/VWAP schedules.
 * 4. FinancialCausalityGraph dynamic event mutation & state persistence.
 * 5. GraphVisualizer shockwave SVG rendering.
 * 6. QuantResearch MCP Tools 33–36 (temporal diff, embeddings, slicer, event ingestion).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { FinancialCausalityGraph, financialCausalityGraph } from "../src/graph/financial-causality-graph.mjs";
import { GraphNetworkTopology } from "../src/graph/graph-network-topology.mjs";
import { GraphTemporalEngine } from "../src/graph/graph-temporal-engine.mjs";
import { GraphSpectralEmbeddings } from "../src/graph/graph-spectral-embeddings.mjs";
import { GraphExecutionSlicer } from "../src/graph/graph-execution-slicer.mjs";
import { GraphVisualizer } from "../src/graph/graph-visualizer.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

describe("Phase 2 Graph Engineering & Quantitative Intelligence", () => {
  const testGraph = new FinancialCausalityGraph();
  const testTopology = new GraphNetworkTopology(testGraph);

  test("1. GraphTemporalEngine captures snapshots and calculates matrix diffs", () => {
    const temporal = new GraphTemporalEngine({ maxSnapshots: 10 });
    
    // Baseline snapshot
    const snap1 = temporal.captureSnapshot(testGraph, testTopology.getCompleteTopologyReport(), "BASELINE_T0");
    assert.ok(snap1.id.startsWith("SNAP_"));
    assert.equal(snap1.nodeCount, testGraph.getAllNodes().length);
    assert.equal(snap1.edgeCount, testGraph.getAllEdges().length);

    // Mutate graph with market event
    testGraph.applyMarketEvent({
      type: "VOLATILITY_SHOCK",
      targetNode: "VIX_VOLATILITY_SPIKE",
      deltaWeight: 0.15
    });

    // Target snapshot
    const snap2 = temporal.captureSnapshot(testGraph, testTopology.getCompleteTopologyReport(), "AFTER_VOL_SHOCK");

    const diff = temporal.compareSnapshots(snap1.id, snap2.id);
    assert.ok(diff.metrics.frobeniusDistance >= 0);
    assert.ok(diff.metrics.regimeShiftIndex >= 0);
    assert.ok(diff.changes.mutatedEdgesCount >= 1);
    assert.ok(["STABLE", "LOW_DRIFT", "MODERATE_RESTRUCTURING", "CRITICAL_PHASE_TRANSITION"].includes(diff.metrics.regimeState));
  });

  test("2. GraphSpectralEmbeddings trains continuous node vectors and computes similarity", () => {
    const embeddings = new GraphSpectralEmbeddings({
      dimensions: 16,
      walkLength: 8,
      numWalks: 15,
      epochs: 4
    });

    const result = embeddings.train(testGraph);
    assert.equal(result.success, true);
    assert.equal(result.dimensions, 16);
    assert.ok(result.totalWalks > 0);

    const vecAapl = embeddings.getVector("AAPL");
    assert.ok(Array.isArray(vecAapl));
    assert.equal(vecAapl.length, 16);

    const simAaplNvda = embeddings.cosineSimilarity("AAPL", "NVDA");
    assert.ok(simAaplNvda >= -1.0 && simAaplNvda <= 1.0);

    const nearestAapl = embeddings.findNearestNeighbors("AAPL", 3);
    assert.ok(nearestAapl.length <= 3);
    assert.ok(nearestAapl.every(n => n.node && typeof n.similarity === "number"));
  });

  test("3. GraphExecutionSlicer creates institutional centrality-aware slicing schedules", () => {
    const slicer = new GraphExecutionSlicer({
      causalityGraph: testGraph,
      topologyMetrics: testTopology.getCompleteTopologyReport()
    });

    const plan = slicer.createExecutionPlan({
      symbol: "NVDA",
      side: "BUY",
      totalQuantity: 2000,
      currentPrice: 125.50,
      durationMinutes: 30,
      slices: 6,
      algorithm: "GRAPH_ADAPTIVE_TWAP",
      urgency: 0.6
    });

    assert.ok(plan.planId.startsWith("SLICER_"));
    assert.equal(plan.symbol, "NVDA");
    assert.equal(plan.totalQuantity, 2000);
    assert.equal(plan.schedule.length, 6);

    const sumQty = plan.schedule.reduce((acc, s) => acc + s.quantity, 0);
    assert.equal(sumQty, 2000);

    assert.ok(plan.networkProfile.pageRankCentrality > 0);
    assert.ok(Array.isArray(plan.downstreamSpilloverRisks));
    assert.ok(plan.impactEstimates.basePermanentImpactBps >= 0);
  });

  test("4. FinancialCausalityGraph dynamic event mutation & state serialization", () => {
    const graph = new FinancialCausalityGraph();
    const event = graph.applyMarketEvent({
      type: "RATE_CUT_SURPRISE",
      targetNode: "FED_RATE_CUT",
      deltaWeight: 0.05
    });

    assert.equal(event.type, "RATE_CUT_SURPRISE");
    assert.equal(event.targetNode, "FED_RATE_CUT");
    assert.ok(event.mutatedEdgesCount >= 1);

    const exported = graph.exportState();
    assert.ok(exported.nodes.length > 0);
    assert.ok(exported.edges.length > 0);

    const newGraph = new FinancialCausalityGraph();
    newGraph.importState(exported);
    assert.equal(newGraph.getAllNodes().length, exported.nodes.length);
    assert.equal(newGraph.getAllEdges().length, exported.edges.length);
  });

  test("5. GraphVisualizer shockwave SVG rendering with keyframes and overlays", () => {
    const visualizer = new GraphVisualizer(testGraph);
    const shock = testGraph.simulateShockCascade({ sourceNode: "CRUDE_OIL_SPIKE", initialMagnitude: 1.2 });
    
    const svg = visualizer.renderShockwaveSvg({ shockResult: shock, width: 800, height: 500 });
    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("CRUDE_OIL_SPIKE"));
    assert.ok(svg.includes("pulse-ring") || svg.includes("shock-glow"));
    assert.ok(svg.includes("</svg>"));
  });

  test("6. QuantResearch MCP Server Tools 33-36 execution", async () => {
    const mcp = createQuantResearchMcpServer();

    // Tool 33: get_graph_temporal_diff
    const tool33 = mcp.tools.get("get_graph_temporal_diff");
    assert.ok(tool33);
    const res33 = await mcp.callTool("get_graph_temporal_diff", {});
    assert.ok(res33.metrics);
    assert.ok(res33.metrics.regimeState);

    // Tool 34: compute_graph_embeddings
    const tool34 = mcp.tools.get("compute_graph_embeddings");
    assert.ok(tool34);
    const res34 = await mcp.callTool("compute_graph_embeddings", { nodeId: "AAPL", topK: 3, retrain: true });
    assert.equal(res34.node, "AAPL");
    assert.ok(res34.vector);
    assert.ok(Array.isArray(res34.nearestNeighbors));

    // Tool 35: slice_graph_aware_order
    const tool35 = mcp.tools.get("slice_graph_aware_order");
    assert.ok(tool35);
    const res35 = await mcp.callTool("slice_graph_aware_order", {
      symbol: "AAPL",
      side: "BUY",
      totalQuantity: 500,
      currentPrice: 232.0,
      durationMinutes: 15,
      slices: 5
    });
    assert.equal(res35.symbol, "AAPL");
    assert.equal(res35.schedule.length, 5);

    // Tool 36: ingest_graph_market_event
    const tool36 = mcp.tools.get("ingest_graph_market_event");
    assert.ok(tool36);
    const res36 = await mcp.callTool("ingest_graph_market_event", {
      type: "EARNINGS_BEAT",
      targetNode: "NVDA",
      deltaWeight: 0.08
    });
    assert.equal(res36.type, "EARNINGS_BEAT");
    assert.equal(res36.targetNode, "NVDA");
  });
});

