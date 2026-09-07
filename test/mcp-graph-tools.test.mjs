// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

test("Quant Research MCP Server registers Tools 102-105", async () => {
  const server = createQuantResearchMcpServer();

  assert.ok(server.tools.has("run_graph_trading_cycle"), "Tool 102 must be registered");
  assert.ok(server.tools.has("get_shadow_mode_portfolio"), "Tool 103 must be registered");
  assert.ok(server.tools.has("evaluate_proposal_with_critic"), "Tool 104 must be registered");
  assert.ok(server.tools.has("get_strategy_leaderboard"), "Tool 105 must be registered");
});

test("MCP Tool 102 run_graph_trading_cycle executes task graph", async () => {
  const server = createQuantResearchMcpServer();
  const res = await server.callTool("run_graph_trading_cycle", {
    symbol: "BTCUSDT",
    price: 66000,
    strategy: "momentum-v3",
    regime: "TRENDING_BULL"
  });

  assert.ok(res);
  assert.equal(res.status, "EXECUTED");
  assert.ok(res.stepsExecuted >= 5);
  assert.equal(res.execution?.executed, true);
});

test("MCP Tool 103 get_shadow_mode_portfolio returns portfolio status", async () => {
  const server = createQuantResearchMcpServer();
  const res = await server.callTool("get_shadow_mode_portfolio", {});

  assert.ok(res);
  assert.ok(typeof res.equity === "number");
  assert.ok(typeof res.cash === "number");
});

test("MCP Tool 104 evaluate_proposal_with_critic evaluates trade", async () => {
  const server = createQuantResearchMcpServer();
  const res = await server.callTool("evaluate_proposal_with_critic", {
    symbol: "BTCUSDT",
    strategy: "momentum-v3",
    direction: "BUY",
    confidence: 0.85,
    regime: "RANGE_CHOPPY",
    spreadPercent: 0.25
  });

  assert.ok(res);
  assert.equal(res.approved, false, "Should be vetoed due to choppy regime and wide spread");
  assert.ok(res.reasonCodes.includes("REGIME_MISMATCH_CHOPPY"));
});

test("MCP Tool 105 get_strategy_leaderboard returns rankings and ASCII table", async () => {
  const server = createQuantResearchMcpServer();
  const res = await server.callTool("get_strategy_leaderboard", {});

  assert.ok(res);
  assert.ok(Array.isArray(res.leaderboard));
  assert.ok(typeof res.ascii === "string");
  assert.ok(res.ascii.includes("STRATEGY"));
});
