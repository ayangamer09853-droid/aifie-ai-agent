/**
 * AIFIE GRAPH ENGINEERING PHASE 3 TEST SUITE
 * 
 * Tests:
 * 1. GraphAttentionNetwork (GAT) multi-head self-attention and contagion prediction.
 * 2. GraphCEPEngine sliding-window Complex Event Processing pattern matching.
 * 3. GraphRLExecutionRouter adaptive Q-learning and order slice routing.
 * 4. GraphStrategyBacktester discrete event backtest calculus and performance metrics.
 * 5. QuantResearch MCP Server Tools 37-42 execution.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { FinancialCausalityGraph } from "../src/graph/financial-causality-graph.mjs";
import { GraphAttentionNetwork, graphAttentionNetwork } from "../src/graph/graph-attention-network.mjs";
import { GraphCEPEngine, graphCEPEngine } from "../src/graph/graph-cep-engine.mjs";
import { GraphRLExecutionRouter, graphRLExecutionRouter } from "../src/graph/graph-rl-execution-router.mjs";
import { GraphStrategyBacktester, graphStrategyBacktester } from "../src/graph/graph-strategy-backtester.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

describe("Phase 3 Graph Attention, CEP, RL Execution & Backtesting", () => {
  const testGraph = new FinancialCausalityGraph();

  test("1. GraphAttentionNetwork computes multi-head attention and contagion scores", () => {
    const gat = new GraphAttentionNetwork({ inputDim: 8, hiddenDim: 8, numHeads: 4 });
    const forwardResult = gat.forward(testGraph, {
      AAPL: { price: 230, rsi: 55, volatility: 0.22, orderImbalance: 0.15 }
    });

    assert.equal(forwardResult.success, true);
    assert.equal(forwardResult.numHeads, 4);
    assert.ok(forwardResult.numNodes > 10);
    assert.ok(Object.keys(forwardResult.attentionMatrix).length > 0);
    assert.ok(Object.keys(forwardResult.contagionRiskScores).length > 0);

    const predAapl = gat.predictContagion(testGraph, "AAPL");
    assert.equal(predAapl.symbol, "AAPL");
    assert.ok(predAapl.contagionRiskScore >= 0.0 && predAapl.contagionRiskScore <= 1.0);
    assert.ok(["LOW", "MODERATE", "ELEVATED", "CRITICAL"].includes(predAapl.vulnerabilityTier));
    assert.ok(Array.isArray(predAapl.topAttentionDrivers));
  });

  test("2. GraphCEPEngine processes sliding-window event patterns and triggers alerts", () => {
    const cep = new GraphCEPEngine({ maxWindowEvents: 50, windowDurationMs: 60000 });

    // Ingest events that satisfy MACRO_RATE_VOLATILITY_CASCADE
    cep.ingestEvent({ type: "FED_RATE_HIKE_ANNOUNCEMENT", symbol: "FED_RATE_HIKE" });
    const triggers = cep.ingestEvent({ type: "VIX_VOLATILITY_SPIKE", symbol: "VIX_VOLATILITY_SPIKE" });

    assert.ok(Array.isArray(triggers));
    assert.ok(triggers.length >= 1);
    assert.equal(triggers[0].ruleId, "MACRO_RATE_VOLATILITY_CASCADE");
    assert.equal(triggers[0].severity, "CRITICAL");

    const summary = cep.getWindowSummary();
    assert.ok(summary.activeEventsInWindow >= 2);
    assert.ok(summary.totalPatternsTriggered >= 1);
  });

  test("3. GraphRLExecutionRouter evaluates Q-learning policy and routes execution slices", () => {
    const router = new GraphRLExecutionRouter({ learningRate: 0.1, discountFactor: 0.9, epsilon: 0.0 });
    const state = [0.08, 0.001, 0.2, 0.8, 0.5];

    // Select action
    const actionDecision = router.selectAction(state);
    assert.ok(actionDecision.actionName);
    assert.ok(actionDecision.actionIndex >= 0 && actionDecision.actionIndex < 5);

    // Calculate reward and update policy
    const reward = router.calculateReward({ slippageBps: 0.5, feeBps: 0.2, marketImpactBps: 0.4, fillRate: 1.0 });
    const nextState = [0.08, 0.001, 0.15, 0.7, 0.4];
    router.update(state, actionDecision.actionIndex, reward, nextState);

    assert.equal(router.totalSteps, 1);
    assert.ok(router.experienceReplay.length >= 1);

    const slicePlan = router.routeExecutionSlice({
      symbol: "NVDA",
      sliceQuantity: 500,
      currentPrice: 128.50,
      pageRank: 0.08,
      urgency: 0.7
    });

    assert.equal(slicePlan.symbol, "NVDA");
    assert.ok(slicePlan.decision.action);
    assert.ok(slicePlan.decision.expectedVenue);
  });

  test("4. GraphStrategyBacktester computes PnL, Sharpe, Sortino and Drawdown calculus", () => {
    const backtester = new GraphStrategyBacktester({ initialCapital: 100000, slippageBps: 1.0 });
    const report = backtester._runDefaultSyntheticBacktest("AAPL");

    assert.equal(report.symbol, "AAPL");
    assert.equal(report.initialCapital, 100000);
    assert.ok(typeof report.finalEquity === "number");
    assert.ok(typeof report.performanceMetrics.sharpeRatio === "number");
    assert.ok(typeof report.performanceMetrics.sortinoRatio === "number");
    assert.ok(report.performanceMetrics.maxDrawdownPct >= 0);
    assert.ok(Array.isArray(report.equityCurveSample));
  });

  test("5. QuantResearch MCP Server Tools 37-42 execution", async () => {
    const mcp = createQuantResearchMcpServer();

    // Tool 37: predict_gnn_contagion
    assert.ok(mcp.tools.has("predict_gnn_contagion"));
    const res37 = await mcp.callTool("predict_gnn_contagion", { symbol: "AAPL" });
    assert.equal(res37.symbol, "AAPL");
    assert.ok(res37.contagionRiskScore >= 0);

    // Tool 38: evaluate_graph_cep_stream
    assert.ok(mcp.tools.has("evaluate_graph_cep_stream"));
    const res38 = await mcp.callTool("evaluate_graph_cep_stream", { type: "FED_RATE_HIKE_ANNOUNCEMENT", symbol: "FED_RATE_HIKE" });
    assert.ok(res38.windowSummary);

    // Tool 39: route_rl_execution_slice
    assert.ok(mcp.tools.has("route_rl_execution_slice"));
    const res39 = await mcp.callTool("route_rl_execution_slice", {
      symbol: "AAPL",
      sliceQuantity: 100,
      currentPrice: 232.0,
      urgency: 0.5
    });
    assert.equal(res39.symbol, "AAPL");
    assert.ok(res39.decision);

    // Tool 40: backtest_graph_strategy
    assert.ok(mcp.tools.has("backtest_graph_strategy"));
    const res40 = await mcp.callTool("backtest_graph_strategy", { symbol: "AAPL", initialCapital: 100000 });
    assert.ok(res40.performanceMetrics);

    // Tool 41: scrub_graph_timeline
    assert.ok(mcp.tools.has("scrub_graph_timeline"));
    const res41 = await mcp.callTool("scrub_graph_timeline", { snapshotId: "latest" });
    assert.ok(res41.snapshot || res41.allAvailableSnapshots);

    // Tool 42: get_gat_attention_matrix
    assert.ok(mcp.tools.has("get_gat_attention_matrix"));
    const res42 = await mcp.callTool("get_gat_attention_matrix", {});
    assert.equal(res42.success, true);
    assert.ok(res42.attentionMatrix);
  });
});
