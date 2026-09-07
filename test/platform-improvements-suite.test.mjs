// test/platform-improvements-suite.test.mjs
// Comprehensive Unit & Integration Test Suite for Platform Improvements
// Pure Node.js ESM built-ins only

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { SharedMemoryRingBuffer } from "../src/concurrency/shared-memory-ring-buffer.mjs";
import { WorkerThreadPool, globalWorkerPool } from "../src/concurrency/worker-thread-pool.mjs";
import { SymbolicAlphaMiningEngine, symbolicAlphaMiningEngine } from "../src/quant/symbolic-alpha-mining-engine.mjs";
import { DrlAdaptiveExecutionPolicy, drlAdaptiveExecutionPolicy } from "../src/execution/drl-adaptive-execution-policy.mjs";
import { ExtremeValueTheorySentinel, extremeValueTheorySentinel } from "../src/risk/extreme-value-theory-sentinel.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";
import { telegramCommandRouter } from "../src/telegram/telegram-command-router.mjs";
import { app } from "../server.mjs";

test("Pillar 1: SharedMemoryRingBuffer - Lockless Atomics Ring Buffer", async (t) => {
  await t.test("Instantiates ring buffer and correctly pushes/pops float elements", () => {
    const ring = new SharedMemoryRingBuffer({ capacity: 16 });
    const telemetry = ring.getTelemetry();
    assert.strictEqual(telemetry.capacity, 16);
    assert.strictEqual(telemetry.count, 0);

    const ok1 = ring.push(150.25);
    const ok2 = ring.push(150.50);
    const ok3 = ring.push(150.75);
    assert.strictEqual(ok1, true);
    assert.strictEqual(ok2, true);
    assert.strictEqual(ok3, true);
    assert.strictEqual(ring.getCount(), 3);

    const val1 = ring.pop();
    assert.strictEqual(val1, 150.25);
    const val2 = ring.pop();
    assert.strictEqual(val2, 150.50);
    assert.strictEqual(ring.getCount(), 1);
  });

  await t.test("Drain batches and handle empty/full buffer gracefully", () => {
    const ring = new SharedMemoryRingBuffer({ capacity: 8 });
    for (let i = 0; i < 5; i++) {
      ring.push(10.0 + i);
    }
    const drained = ring.drain(3);
    assert.strictEqual(drained.length, 3);
    assert.strictEqual(drained[0], 10.0);
    assert.strictEqual(drained[2], 12.0);

    const remaining = ring.drain(10);
    assert.strictEqual(remaining.length, 2);
    assert.strictEqual(ring.pop(), null);
  });
});

test("Pillar 1: WorkerThreadPool - Parallel Computing & Simulation Dispatch", async (t) => {
  await t.test("Worker pool status telemetry is online and responsive", () => {
    const pool = new WorkerThreadPool({ maxWorkers: 4 });
    const status = pool.getStatus();
    assert.strictEqual(status.status, "WORKER_POOL_ONLINE");
    assert.strictEqual(status.maxWorkers, 4);
    assert.strictEqual(typeof status.totalCompletedTasks, "number");
  });

  await t.test("Executes parallel Monte Carlo simulation task (5,000 paths)", async () => {
    const pool = new WorkerThreadPool({ maxWorkers: 2 });
    const result = await pool.executeTask("MONTE_CARLO", {
      paths: 5000,
      steps: 30,
      initialEquity: 100000,
      meanReturn: 0.001,
      volatility: 0.015
    });

    assert.strictEqual(result.taskType, "MONTE_CARLO");
    assert.strictEqual(result.paths, 5000);
    assert.ok(result.probabilityOfRuin >= 0 && result.probabilityOfRuin <= 1);
    assert.ok(result.expectedMaxDrawdown >= 0);
    assert.ok(result.medianFinalEquity > 0);
  });

  await t.test("Executes Genetic Evolution and CPCV Split computation tasks", async () => {
    const pool = new WorkerThreadPool({ maxWorkers: 2 });
    const geneticRes = await pool.executeTask("GENETIC_EVOLVE", {
      generations: 3,
      populationSize: 10
    });
    assert.strictEqual(geneticRes.taskType, "GENETIC_EVOLVE");
    assert.strictEqual(geneticRes.generationsCompleted, 3);
    assert.ok(geneticRes.bestFitness > 0);

    const cpcvRes = await pool.executeTask("CPCV_SPLIT", {
      totalGroups: 6,
      testGroupSize: 2
    });
    assert.strictEqual(cpcvRes.taskType, "CPCV_SPLIT");
    assert.strictEqual(cpcvRes.totalCombinations, 15);
  });
});

test("Pillar 3: SymbolicAlphaMiningEngine - Genetic Formula Discovery", async (t) => {
  await t.test("Generates syntax tree and compiles to executable formula string", () => {
    const engine = new SymbolicAlphaMiningEngine({ populationSize: 10 });
    const tree = engine.generateRandomTree(0);
    assert.ok(tree);
    const formula = engine.treeToFormula(tree);
    assert.ok(typeof formula === "string");
    assert.ok(formula.length > 0);
  });

  await t.test("Evaluates AST expression on bar series and computes Pearson IC", () => {
    const engine = new SymbolicAlphaMiningEngine();
    const bars = [];
    for (let i = 0; i < 50; i++) {
      bars.push({
        close: 100 + i + Math.sin(i),
        open: 99 + i,
        high: 102 + i,
        low: 98 + i,
        volume: 1000 + i * 10,
        vwap: 100 + i,
        returns: 0.01
      });
    }

    const ast = {
      type: "binary_op",
      op: "-",
      left: { type: "terminal", value: "close" },
      right: { type: "terminal", value: "vwap" }
    };

    const evaluated = engine.evaluateExpression(ast, bars);
    assert.strictEqual(evaluated.length, bars.length);

    const targetReturns = bars.map((b, i) => i > 0 ? (b.close - bars[i - 1].close) / bars[i - 1].close : 0);
    const icStats = engine.computePearsonIC(evaluated, targetReturns);
    assert.ok(typeof icStats.ic === "number");
    assert.ok(typeof icStats.tStat === "number");
  });

  await t.test("Runs genetic mining tournament and promotes champion factors", () => {
    const engine = new SymbolicAlphaMiningEngine({ populationSize: 15 });
    const res = engine.runMiningTournament({ generations: 3 });
    assert.strictEqual(res.status, "MINING_TOURNAMENT_COMPLETED");
    assert.strictEqual(res.generations, 3);
    assert.ok(res.champion);
    assert.ok(typeof res.champion.formula === "string");
    assert.ok(Array.isArray(res.topRankedAlphas));
    assert.strictEqual(res.topRankedAlphas.length, 5);
  });
});

test("Pillar 4: DrlAdaptiveExecutionPolicy - Deep Reinforcement Learning Execution", async (t) => {
  await t.test("Selects optimal action from discretized market microstructure state", () => {
    const policy = new DrlAdaptiveExecutionPolicy();
    const decision = policy.selectAction({
      symbol: "NVDA",
      side: "BUY",
      orderQuantity: 500,
      spreadBps: 1.5,
      marketImbalance: 0.40,
      toxicityVPIN: 0.15,
      urgency: "LOW"
    });

    assert.ok(["PASSIVE_POST_MAKER", "AGGRESSIVE_TAKER_SLICE", "ICEBERG_HIDDEN_PEG", "WAIT_AND_SNIPE"].includes(decision.action));
    assert.ok(decision.actionDetails.sliceCount >= 1);
    assert.ok(decision.stateKey.length > 0);
  });

  await t.test("Updates Q-table via Bellman equation with post-trade TCA feedback", () => {
    const policy = new DrlAdaptiveExecutionPolicy();
    const update = policy.updateQTable({
      stateKey: "LOW_SPREAD|BULLISH_BOOK|BENIGN_FLOW|URG_LOW",
      action: "PASSIVE_POST_MAKER",
      arrivalPrice: 150.00,
      fillPrice: 150.01,
      expectedSpreadBps: 2.0,
      orderSizeUSD: 50000,
      side: "BUY"
    });

    assert.strictEqual(update.action, "PASSIVE_POST_MAKER");
    assert.ok(typeof update.slippageBps === "number");
    assert.ok(typeof update.reward === "number");
    assert.ok(typeof update.updatedQ === "number");

    const status = policy.getPolicyStatus();
    assert.strictEqual(status.status, "DRL_EXECUTION_POLICY_ONLINE");
    assert.ok(status.totalExecutedTrades >= 1);
  });
});

test("Pillar 5: ExtremeValueTheorySentinel - EVT Tail-Risk & Liquidity-Adjusted VaR", async (t) => {
  await t.test("Fits Generalized Pareto Distribution (GPD) via POT method", () => {
    const sentinel = new ExtremeValueTheorySentinel();
    const returns = [];
    for (let i = 0; i < 200; i++) {
      returns.push((Math.random() - 0.5) * 0.02);
    }
    // inject tail shock
    returns.push(-0.06, -0.08, -0.09, -0.11);

    const fit = sentinel.fitGeneralizedPareto(returns, { thresholdQuantile: 0.90 });
    assert.strictEqual(fit.status, "GPD_FIT_CONVERGED");
    assert.ok(fit.exceedanceCount > 0);
    assert.ok(fit.tailVaR_99 > 0);
    assert.ok(fit.tailCVaR_99 > fit.tailVaR_99);
  });

  await t.test("Calculates Liquidity-Adjusted VaR (L-VaR) under market impact", () => {
    const sentinel = new ExtremeValueTheorySentinel();
    const lvar = sentinel.calculateLiquidityAdjustedVaR({
      portfolioValueUSD: 200000,
      standardVaRUSD: 8000,
      positions: [
        { symbol: "AAPL", positionValueUSD: 120000, dailyVolumeUSD: 1000000000, spreadBps: 1.0, volatility: 0.02 },
        { symbol: "ILLIQUID_TOKEN", positionValueUSD: 80000, dailyVolumeUSD: 200000, spreadBps: 45.0, volatility: 0.08 }
      ]
    });

    assert.strictEqual(lvar.portfolioValueUSD, 200000);
    assert.strictEqual(lvar.standardVaRUSD, 8000);
    assert.ok(lvar.liquidityPenaltyUSD > 0);
    assert.ok(lvar.liquidityAdjustedVaRUSD > lvar.standardVaRUSD);
    assert.ok(lvar.liquidityRiskMultiplier > 1.0);
  });
});

test("REST Endpoints & MCP Server Tools 82-85", async (t) => {
  let server;
  let baseUrl;

  await t.test("Start HTTP Server on ephemeral port", async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  await t.test("GET /api/concurrency/telemetry returns online status", async () => {
    const res = await fetch(`${baseUrl}/api/concurrency/telemetry`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.workerPool.status, "WORKER_POOL_ONLINE");
    assert.strictEqual(typeof data.ringBuffer.capacity, "number");
  });

  await t.test("POST /api/quant/symbolic-alpha/mine discovers formulaic factors", async () => {
    const res = await fetch(`${baseUrl}/api/quant/symbolic-alpha/mine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generations: 2 })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "MINING_TOURNAMENT_COMPLETED");
    assert.ok(data.champion);
  });

  await t.test("POST /api/execution/drl/select-action selects routing action", async () => {
    const res = await fetch(`${baseUrl}/api/execution/drl/select-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "BTCUSDT",
        side: "BUY",
        orderQuantity: 2.5,
        spreadBps: 2.0
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.action);
    assert.ok(data.actionDetails);
  });

  await t.test("POST /api/risk/lvar/calculate computes liquidity adjusted risk", async () => {
    const res = await fetch(`${baseUrl}/api/risk/lvar/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portfolioValueUSD: 100000,
        standardVaRUSD: 4000
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.liquidityAdjustedVaRUSD >= 4000);
  });

  await t.test("MCP Server executes Tools 82, 83, 84, and 85", async () => {
    const mcpServer = createQuantResearchMcpServer();

    // Tool 82
    const tool82 = mcpServer.tools.get("run_parallel_monte_carlo_sim");
    assert.ok(tool82);
    const res82 = await tool82.handler({ paths: 2000, steps: 20 });
    assert.strictEqual(res82.taskType, "MONTE_CARLO");

    // Tool 83
    const tool83 = mcpServer.tools.get("mine_symbolic_alpha_factors");
    assert.ok(tool83);
    const res83 = await tool83.handler({ generations: 2 });
    assert.strictEqual(res83.status, "MINING_TOURNAMENT_COMPLETED");

    // Tool 84
    const tool84 = mcpServer.tools.get("evaluate_drl_execution_action");
    assert.ok(tool84);
    const res84 = await tool84.handler({ symbol: "ETHUSDT", side: "BUY", orderQuantity: 10 });
    assert.ok(res84.action);

    // Tool 85
    const tool85 = mcpServer.tools.get("calculate_evt_and_liquidity_var");
    assert.ok(tool85);
    const res85 = await tool85.handler({ portfolioValueUSD: 50000, standardVaRUSD: 2000 });
    assert.ok(res85.liquidityAdjustedVaRUSD >= 2000);
  });

  await t.test("Telegram Router handles /symbolicalpha, /drlexec, /lvar, and /evt", async () => {
    const resAlpha = await telegramCommandRouter.routeCommand({ command: "/symbolicalpha", fullText: "/symbolicalpha 2", chatId: "test" });
    assert.strictEqual(resAlpha.handled, true);
    assert.ok(resAlpha.response.text.includes("GENETIC SYMBOLIC ALPHA MINING"));

    const resDrl = await telegramCommandRouter.routeCommand({ command: "/drlexec", fullText: "/drlexec BTCUSDT 5", chatId: "test" });
    assert.strictEqual(resDrl.handled, true);
    assert.ok(resDrl.response.text.includes("DRL ADAPTIVE EXECUTION POLICY"));

    const resLvar = await telegramCommandRouter.routeCommand({ command: "/lvar", fullText: "/lvar", chatId: "test" });
    assert.strictEqual(resLvar.handled, true);
    assert.ok(resLvar.response.text.includes("LIQUIDITY-ADJUSTED VaR"));

    const resEvt = await telegramCommandRouter.routeCommand({ command: "/evt", fullText: "/evt", chatId: "test" });
    assert.strictEqual(resEvt.handled, true);
    assert.ok(resEvt.response.text.includes("EXTREME VALUE THEORY"));
  });

  await t.test("Teardown HTTP Server", async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
