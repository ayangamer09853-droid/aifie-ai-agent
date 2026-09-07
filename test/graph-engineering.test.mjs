// test/graph-engineering.test.mjs
// Comprehensive Institutional Test Suite for Graph Engineering Architecture
// Pure Node.js ESM built-ins only

import { test } from "node:test";
import assert from "node:assert/strict";

import { FinancialCausalityGraph, financialCausalityGraph } from "../src/graph/financial-causality-graph.mjs";
import { GraphNetworkTopology } from "../src/graph/graph-network-topology.mjs";
import { AgentStateGraph, createAutonomousTradingWorkflow } from "../src/graph/agent-state-graph.mjs";
import { GraphRAGReasoningEngine } from "../src/graph/graph-rag-reasoning-engine.mjs";
import { GraphVisualizer } from "../src/graph/graph-visualizer.mjs";

test("FinancialCausalityGraph: Pre-seeded institutional knowledge and structure", () => {
  const summary = financialCausalityGraph.getGraphSummary();
  assert.ok(summary.totalNodes >= 20, "Should have pre-seeded at least 20 nodes");
  assert.ok(summary.totalEdges >= 20, "Should have pre-seeded at least 20 edges");
  assert.ok(summary.categoryCounts["CENTRAL_BANK"] >= 2, "Should include Central Bank nodes");
  assert.ok(summary.categoryCounts["ASSET_EQUITY"] >= 5, "Should include Equity asset nodes");

  const aaplNode = financialCausalityGraph.getNode("AAPL");
  assert.equal(aaplNode.id, "AAPL");
  assert.equal(aaplNode.category, "ASSET_EQUITY");
});

test("FinancialCausalityGraph: Dynamic node and edge mutations", () => {
  const g = new FinancialCausalityGraph();
  const initialSummary = g.getGraphSummary();

  const customNode = g.addNode({
    id: "CUSTOM_MACRO_EVENT",
    label: "Custom Liquidity Injection",
    category: "CENTRAL_BANK"
  });
  assert.equal(customNode.id, "CUSTOM_MACRO_EVENT");

  const customEdge = g.addEdge({
    from: "CUSTOM_MACRO_EVENT",
    to: "BTC",
    type: "LIQUIDITY_SURGE",
    weight: 0.95,
    lagHours: 1,
    confidence: 0.99
  });
  assert.equal(customEdge.from, "CUSTOM_MACRO_EVENT");
  assert.equal(customEdge.to, "BTC");
  assert.equal(customEdge.weight, 0.95);

  const updatedSummary = g.getGraphSummary();
  assert.equal(updatedSummary.totalNodes, initialSummary.totalNodes + 1);
  assert.equal(updatedSummary.totalEdges, initialSummary.totalEdges + 1);
});

test("FinancialCausalityGraph: Multi-hop causal path finding", () => {
  const paths = financialCausalityGraph.findCausalPaths("FED_RATE_HIKE", "AAPL", 4);
  assert.ok(Array.isArray(paths), "Paths should be an array");
  assert.ok(paths.length > 0, "Should discover multi-hop causal paths from Fed Rate Hike to AAPL");

  const topPath = paths[0];
  assert.equal(topPath.source, "FED_RATE_HIKE");
  assert.equal(topPath.target, "AAPL");
  assert.ok(topPath.hops >= 1, "Should have at least 1 hop");
  assert.ok(topPath.compositeImpact < 0, "Rate hike path should have net negative valuation impact on AAPL");
  assert.ok(topPath.narrative.includes("AAPL"), "Narrative should include AAPL target");
});

test("FinancialCausalityGraph: Macroeconomic shock cascade simulation", () => {
  const shock = financialCausalityGraph.simulateShockCascade({
    sourceNode: "CRUDE_OIL_SPIKE",
    initialMagnitude: 1.5,
    maxHops: 3,
    dampingFactor: 0.75
  });

  assert.equal(shock.sourceNode, "CRUDE_OIL_SPIKE");
  assert.ok(shock.totalImpactedNodes > 0, "Should propagate to downstream nodes");

  const energyImpact = shock.impactedNodes.find(n => n.nodeId === "ENERGY_OIL_GAS_SECTOR" || n.nodeId === "XOM");
  assert.ok(energyImpact, "Energy sector / XOM should be impacted by oil spike");
  assert.equal(energyImpact.direction, "POSITIVE_IMPACT", "Energy sector should benefit from oil spike");

  const airlinesImpact = shock.impactedNodes.find(n => n.nodeId === "AIRLINES_TRANSPORT_SECTOR" || n.nodeId === "DAL");
  assert.ok(airlinesImpact, "Airlines should be impacted by oil spike");
  assert.equal(airlinesImpact.direction, "NEGATIVE_IMPACT", "Airlines should experience margin compression from oil spike");
});

test("GraphNetworkTopology: Centrality metrics (Degree, PageRank, Betweenness, Eigenvector)", () => {
  const topology = new GraphNetworkTopology(financialCausalityGraph);

  const degrees = topology.computeDegreeCentrality();
  assert.ok(degrees["AAPL"], "Should calculate degree for AAPL");
  assert.ok(degrees["AAPL"].totalDegree >= 1);

  const pageRank = topology.computePageRank({ alpha: 0.85, maxIterations: 50 });
  assert.ok(pageRank["AAPL"] > 0, "PageRank for AAPL should be positive");
  assert.ok(pageRank["NVDA"] > 0, "PageRank for NVDA should be positive");

  const betweenness = topology.computeBetweennessCentrality();
  assert.ok(betweenness["TECH_GROWTH_SECTOR"] >= 0, "Betweenness should be non-negative");

  const eigen = topology.computeEigenvectorCentrality();
  assert.ok(Object.keys(eigen).length > 0, "Eigenvector centrality should evaluate all nodes");
});

test("GraphNetworkTopology: Minimum Spanning Tree (MST) risk clustering", () => {
  const topology = new GraphNetworkTopology(financialCausalityGraph);
  const mst = topology.computeCorrelationMST();

  assert.ok(mst.universeSize >= 4, "Universe should include multiple asset nodes");
  assert.equal(mst.mstEdgesCount, mst.universeSize - 1, "MST must have exactly V - 1 edges");
  assert.ok(mst.totalTreeDistance > 0, "Total tree distance must be positive");
  assert.ok(mst.centralHubAsset, "Should identify central hub asset");
});

test("GraphNetworkTopology: Community detection and overall topology report", () => {
  const topology = new GraphNetworkTopology(financialCausalityGraph);
  const communities = topology.detectCommunities();
  assert.ok(communities.totalCommunities >= 2, "Should identify distinct market sector clusters");

  const report = topology.generateTopologyReport();
  assert.ok(report.graphSummary.totalNodes > 0);
  assert.ok(report.topBellwethers.length > 0);
  assert.ok(report.mstOverview.centralHub);
});

test("AgentStateGraph: Computational workflow with conditional routing and cycles", async () => {
  const workflow = createAutonomousTradingWorkflow();

  // Test Bullish Execution Path
  const result = await workflow.invoke({
    symbol: "AAPL",
    price: 235.0,
    rsi: 55,
    macdHist: 0.8,
    macroShock: "FED_RATE_CUT"
  });

  assert.equal(result.isCompleted, true);
  assert.ok(result.totalSteps >= 4, "Should execute through graph steps");
  assert.ok(result.visitedNodes.includes("ingest_market_context"));
  assert.ok(result.visitedNodes.includes("evaluate_technical_signals"));
  assert.ok(result.visitedNodes.includes("ai_bull_bear_debate"));
  assert.equal(result.finalState.orderResult.status, "SIMULATED_FILLED");
});

test("GraphRAGReasoningEngine: Entity recognition and prompt linearization", () => {
  const rag = new GraphRAGReasoningEngine(financialCausalityGraph);

  const entities = rag.extractEntities("Fed announced another rate hike and crude oil spiked, impacting AAPL and NVDA tech stocks");
  assert.ok(entities.some(e => e.id === "FED_RATE_HIKE"), "Should extract Fed Rate Hike");
  assert.ok(entities.some(e => e.id === "CRUDE_OIL_SPIKE"), "Should extract Crude Oil Spike");
  assert.ok(entities.some(e => e.id === "AAPL"), "Should extract AAPL");
  assert.ok(entities.some(e => e.id === "NVDA"), "Should extract NVDA");

  const reasoning = rag.generateReasoningContext({
    symbol: "AAPL",
    macroEvents: ["FED_RATE_HIKE"],
    queryText: "Evaluate Apple valuation risk after rate hike"
  });

  assert.equal(reasoning.symbol, "AAPL");
  assert.ok(reasoning.linearizedContext.includes("FINANCIAL KNOWLEDGE & CAUSALITY GRAPH CONTEXT"));
  assert.ok(reasoning.linearizedContext.includes("Multi-Hop Macroeconomic Causal Impact Paths"));
});

test("GraphVisualizer: SVG vector and network dataset generation", () => {
  const visualizer = new GraphVisualizer(financialCausalityGraph);
  const data = visualizer.exportNetworkData();

  assert.ok(data.nodes.length >= 20, "Should export all nodes");
  assert.ok(data.links.length >= 20, "Should export all links");
  assert.ok(data.nodes[0].color, "Nodes must have categorized color codes");

  const svg = visualizer.renderSvg({ width: 800, height: 600, highlightedNodeId: "AAPL" });
  assert.ok(svg.includes("<svg"), "Should generate valid SVG markup");
  assert.ok(svg.includes("AIFIE FINANCIAL KNOWLEDGE & CAUSALITY GRAPH"));
  assert.ok(svg.includes('data-id="AAPL"'));
});
