// demonstrate-graph-results.mjs
import { financialCausalityGraph } from "./src/graph/financial-causality-graph.mjs";
import { GraphNetworkTopology } from "./src/graph/graph-network-topology.mjs";
import { createAutonomousTradingWorkflow } from "./src/graph/agent-state-graph.mjs";
import { graphRAGReasoningEngine } from "./src/graph/graph-rag-reasoning-engine.mjs";

console.log("================================================================================");
console.log("1. GRAPH SUMMARY & TOPOLOGY METRICS");
console.log("================================================================================");
const topology = new GraphNetworkTopology(financialCausalityGraph);
console.log(JSON.stringify(topology.generateTopologyReport(), null, 2));

console.log("\n================================================================================");
console.log("2. MULTI-HOP CAUSALITY PATH TRACER (FED_RATE_HIKE -> AAPL)");
console.log("================================================================================");
const paths = financialCausalityGraph.findCausalPaths("FED_RATE_HIKE", "AAPL", 4);
console.log(JSON.stringify(paths, null, 2));

console.log("\n================================================================================");
console.log("3. MACROECONOMIC SHOCK CASCADE SIMULATION (CRUDE_OIL_SPIKE, 1.5x MAGNITUDE)");
console.log("================================================================================");
const shock = financialCausalityGraph.simulateShockCascade({
  sourceNode: "CRUDE_OIL_SPIKE",
  initialMagnitude: 1.5,
  maxHops: 3,
  dampingFactor: 0.75
});
console.log(JSON.stringify(shock, null, 2));

console.log("\n================================================================================");
console.log("4. MINIMUM SPANNING TREE (MST) ASSET RISK DIVERSIFICATION BACKBONE");
console.log("================================================================================");
const mst = topology.computeCorrelationMST();
console.log(JSON.stringify(mst, null, 2));

console.log("\n================================================================================");
console.log("5. STATEFUL COMPUTATIONAL AGENT STATEGRAPH WORKFLOW EXECUTION");
console.log("================================================================================");
const workflow = createAutonomousTradingWorkflow();
const wfResult = await workflow.invoke({
  symbol: "AAPL",
  price: 232.50,
  rsi: 54.2,
  macdHist: 0.65,
  macroShock: "FED_RATE_CUT"
});
console.log(JSON.stringify(wfResult, null, 2));

console.log("\n================================================================================");
console.log("6. GRAPHRAG LINEARIZED PROMPT REASONING CONTEXT");
console.log("================================================================================");
const rag = graphRAGReasoningEngine.generateReasoningContext({
  symbol: "AAPL",
  macroEvents: ["FED_RATE_HIKE"],
  queryText: "Assess AAPL downside risk given surging 10Y yields"
});
console.log(rag.linearizedContext);
