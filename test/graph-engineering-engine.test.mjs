// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { GraphEngine } from "../src/graph-engineering/core/graph-engine.mjs";
import { GraphNode, GRAPH_NODE_TYPES } from "../src/graph-engineering/core/graph-node.mjs";
import { GraphEdge } from "../src/graph-engineering/core/graph-edge.mjs";
import { GraphState } from "../src/graph-engineering/core/graph-state.mjs";
import { GraphVersionManager } from "../src/graph-engineering/core/graph-version.mjs";
import { EntityGraphStore } from "../src/graph-engineering/knowledge/entity-graph.mjs";
import { GraphRagEngine } from "../src/graph-engineering/knowledge/graph-rag.mjs";
import { createTradingTaskGraph } from "../src/graph-engineering/graphs/trading.graph.mjs";
import { globalGraphTracer } from "../src/graph-engineering/observability/graph-tracer.mjs";

test("GraphEngine: executes multi-node pipeline with state transitions", async () => {
  const engine = new GraphEngine({ name: "UnitTestPipeline" });

  engine.addNode(new GraphNode({
    id: "START",
    type: GRAPH_NODE_TYPES.EVENT,
    handler: async (state) => ({ taskState: { stepOne: true } })
  }));

  engine.addNode(new GraphNode({
    id: "PROCESS",
    type: GRAPH_NODE_TYPES.FUNCTION,
    handler: async (state) => ({ taskState: { stepTwo: true } })
  }));

  engine.addEdge(new GraphEdge({ from: "START", to: "PROCESS", reasonCode: "STEP_ONE_DONE" }));

  const res = await engine.run("START", { goal: "TEST_RUN" });
  assert.equal(res.success, true);
  assert.equal(res.totalSteps, 2);
  assert.equal(res.finalState.taskState.stepOne, true);
  assert.equal(res.finalState.taskState.stepTwo, true);
});

test("GraphVersionManager: computes deterministic topology checksum and checks integrity", () => {
  const vm = new GraphVersionManager();
  const nodes = [{ id: "A", type: "FUNCTION" }, { id: "B", type: "AGENT" }];
  const edges = [{ from: "A", to: "B", reasonCode: "FORWARD" }];

  const validation = vm.validateTopology({ version: "1.0.1", nodes, edges });
  assert.equal(validation.valid, true);
  assert.ok(validation.checksum);

  const brokenValidation = vm.validateTopology({ version: "1.0.2", nodes, edges: [{ from: "A", to: "C" }] });
  assert.equal(brokenValidation.valid, false);
  assert.ok(brokenValidation.errors[0].includes("non-existent target node"));
});

test("EntityGraphStore & GraphRagEngine: retrieves structured multi-hop relational context", () => {
  const store = new EntityGraphStore();
  const rag = new GraphRagEngine({ graph: store });

  const context = rag.retrieveContext("BTC", 2);
  assert.equal(context.found, true);
  assert.ok(context.relationsCount >= 2);
  assert.ok(context.contextText.includes("BINANCE"));
  assert.ok(context.contextText.includes("MOMENTUM_V3"));
});

test("Trading Task Graph: end-to-end execution passes valid trade and triggers shadow order", async () => {
  const tradingGraph = createTradingTaskGraph({ strategyName: "momentum-v3" });

  // Clean market quote
  const context = {
    tick: {
      symbol: "BTCUSDT",
      price: 65000,
      timestamp: Date.now(),
      sequence: 1
    },
    rsi: 30, // Oversold -> Strategy will propose BUY
    regime: "TRENDING_BULL",
    spreadPercent: 0.03,
    imminentHighImpactNews: false,
    quantity: 0.1 // $6,500 notional (within $50k limit)
  };

  const result = await tradingGraph.run("NODE_MARKET_DATA", {}, context);
  assert.equal(result.success, true);
  assert.equal(result.finalState.marketState.status, "SAFE");
  assert.equal(result.finalState.riskState.approved, true);
  assert.equal(result.finalState.executionState.executed, true);
  assert.ok(result.finalState.executionState.order);
  assert.equal(result.finalState.executionState.order.symbol, "BTCUSDT");

  // Trace causal lineage
  const lineage = globalGraphTracer.traceCausalLineage(result.finalState.runId);
  assert.equal(lineage.found !== false, true);
  assert.ok(lineage.causalLineage.length >= 5);
});

test("Trading Task Graph: routing rejects trade when market data is stale", async () => {
  const tradingGraph = createTradingTaskGraph({ strategyName: "momentum-v3" });

  // Stale quote
  const context = {
    tick: {
      symbol: "BTCUSDT",
      price: 65000,
      timestamp: Date.now() - 30000 // 30s stale
    }
  };

  const result = await tradingGraph.run("NODE_MARKET_DATA", {}, context);
  assert.equal(result.success, true);
  assert.equal(result.finalState.marketState.status, "UNSAFE");
  assert.equal(result.finalState.executionState.executed, false);
  assert.equal(result.finalState.executionState.status, "REJECTED");
});
