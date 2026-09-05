// test/nextgen-institutional-improvements.test.mjs
// Verification of Next-Generation Institutional Quantitative & Microstructure Framework

import test from "node:test";
import assert from "node:assert/strict";

import {
  LimitOrderBook,
  computeAlmgrenChrissTrajectory
} from "../src/microstructure/limit-order-book-simulator.mjs";

import {
  RealtimeFeatureStore
} from "../src/quant/realtime-feature-store.mjs";

import {
  MultiArmedBanditAllocator
} from "../src/portfolio/multi-armed-bandit-allocator.mjs";

import {
  runMacroStressTestingMatrix,
  computeExtremeValueTheoryTailRisk,
  MACRO_CRISIS_SCENARIOS
} from "../src/risk/macro-stress-testing-matrix.mjs";

import {
  parseNaturalLanguageTradingPrompt,
  renderHeadlessSvgChart
} from "../src/telegram-trading-suite.mjs";

import {
  createQuantResearchMcpServer
} from "../src/mcp/servers/quant-research-mcp.mjs";

test("Limit Order Book (LOB) matches market orders with FIFO queues and Kyle's Lambda", () => {
  const lob = new LimitOrderBook("AAPL", 150.0);
  const snap = lob.getSnapshot(5);

  assert.equal(snap.symbol, "AAPL");
  assert.ok(snap.bids.length > 0);
  assert.ok(snap.asks.length > 0);
  assert.ok(snap.spread > 0);
  assert.equal(typeof snap.orderImbalance, "number");

  // Execute Market Order BUY
  const fillBuy = lob.executeMarketOrder("BUY", 100);
  assert.equal(fillBuy.symbol, "AAPL");
  assert.equal(fillBuy.side, "BUY");
  assert.equal(fillBuy.requestedQuantity, 100);
  assert.equal(fillBuy.executedQuantity, 100);
  assert.equal(fillBuy.unfilledQuantity, 0);
  assert.ok(fillBuy.vwapExecuted >= fillBuy.arrivalPrice);
  assert.ok(fillBuy.slippageBps >= 0);
  assert.ok(fillBuy.kyleLambda >= 0);
  assert.ok(fillBuy.fills.length > 0);

  // Execute Market Order SELL
  const fillSell = lob.executeMarketOrder("SELL", 150);
  assert.equal(fillSell.side, "SELL");
  assert.equal(fillSell.executedQuantity, 150);
  assert.ok(fillSell.vwapExecuted <= fillSell.arrivalPrice);
});

test("Almgren-Chriss Optimal Execution Trajectory computes monotonic decay and exact share sum", () => {
  const trajectoryResult = computeAlmgrenChrissTrajectory({
    totalShares: 2000,
    horizonMinutes: 60,
    numberOfTranches: 10,
    volatilityDaily: 0.02
  });

  assert.equal(trajectoryResult.totalShares, 2000);
  assert.equal(trajectoryResult.numberOfTranches, 10);
  assert.ok(trajectoryResult.kappa > 0);
  assert.ok(trajectoryResult.expectedCostBps > 0);
  assert.equal(trajectoryResult.trajectory.length, 10);

  // Verify slice sum equals total shares exactly
  const sumSlices = trajectoryResult.trajectory.reduce((acc, t) => acc + t.sliceQuantity, 0);
  assert.equal(sumSlices, 2000);
  assert.equal(trajectoryResult.trajectory[9].remainingHoldings, 0);
});

test("Realtime Feature Store ingests ticks and computes zero-latency feature vector", () => {
  const store = new RealtimeFeatureStore();

  // Ingest synthetic ticks
  for (let i = 0; i < 30; i++) {
    const price = 100 + Math.sin(i * 0.3) * 3 + i * 0.2;
    store.ingestTick("NVDA", {
      price,
      volume: 1000 + i * 50,
      high: price * 1.005,
      low: price * 0.995,
      ofi: 0.25,
      vpin: 0.18,
      kalmanBeta: 1.15,
      sentiment: 0.65
    });
  }

  const features = store.computeFeatureVector("NVDA");
  assert.equal(features.ready, true);
  assert.equal(features.symbol, "NVDA");
  assert.ok(typeof features.zScoreMomentum === "number");
  assert.ok(features.rollingVolatility > 0);
  assert.ok(features.parkinsonVolatility > 0);
  assert.equal(features.orderFlowImbalance, 0.25);
  assert.equal(features.vpinToxicity, 0.18);
  assert.equal(features.kalmanBeta, 1.15);
  assert.equal(features.sentimentScore, 0.65);
});

test("Population Stability Index (PSI) Sentry detects feature distribution drift", () => {
  const store = new RealtimeFeatureStore();
  const baseline = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55];
  store.setBaselineDistribution("volatility", baseline);

  // 1. Stable distribution
  const stableLive = [0.12, 0.16, 0.22, 0.24, 0.31, 0.36, 0.41, 0.44, 0.52, 0.54];
  const stablePsi = store.calculatePopulationStabilityIndex("volatility", stableLive);
  assert.equal(stablePsi.status, "STABLE");
  assert.equal(stablePsi.dampeningMultiplier, 1.0);

  // 2. Severely drifted distribution
  const severeDriftLive = [1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.2, 3.5, 3.8, 4.0];
  const severePsi = store.calculatePopulationStabilityIndex("volatility", severeDriftLive);
  assert.equal(severePsi.status, "SEVERE_DRIFT");
  assert.equal(severePsi.dampeningMultiplier, 0.25);
  assert.ok(severePsi.psi >= 0.25);
});

test("Multi-Armed Bandit Allocator routes capital using Thompson Sampling and UCB1", () => {
  const bandit = new MultiArmedBanditAllocator([
    "stat_arb",
    "momentum",
    "pmm_spread"
  ]);

  // Record simulated trading history
  bandit.recordStrategyPerformance("stat_arb", 500, true);
  bandit.recordStrategyPerformance("stat_arb", 350, true);
  bandit.recordStrategyPerformance("stat_arb", 400, true);
  bandit.recordStrategyPerformance("momentum", -250, false);
  bandit.recordStrategyPerformance("momentum", -150, false);

  // Thompson Sampling Allocation
  const thompson = bandit.allocateThompsonSampling(100000);
  assert.equal(thompson.method, "THOMPSON_SAMPLING_BETA");
  assert.equal(thompson.totalCapital, 100000);
  assert.equal(thompson.allocations.length, 3);
  
  const sumThompson = thompson.allocations.reduce((acc, a) => acc + a.allocatedCapital, 0);
  assert.equal(sumThompson, 100000);

  // Winning strategy should have higher allocation than losing strategy
  const statArbAlloc = thompson.allocations.find(a => a.strategy === "stat_arb");
  const momentumAlloc = thompson.allocations.find(a => a.strategy === "momentum");
  assert.ok(statArbAlloc.allocatedCapital > momentumAlloc.allocatedCapital);

  // UCB1 Allocation
  const ucb1 = bandit.allocateUCB1(100000);
  assert.equal(ucb1.method, "UCB1_ALGORITHM");
  assert.equal(ucb1.allocations.length, 3);
  const sumUcb = ucb1.allocations.reduce((acc, a) => acc + a.allocatedCapital, 0);
  assert.equal(sumUcb, 100000);
});

test("Multi-Armed Bandit Allocator executes automated drawdown pruning", () => {
  const bandit = new MultiArmedBanditAllocator(["safe_strat", "failing_strat"]);

  // Force drawdown on failing_strat > 5%
  const failingArm = bandit.strategies.get("failing_strat");
  failingArm.peakEquity = 10000;
  failingArm.currentEquity = 9400; // 6% drawdown
  failingArm.drawdownPct = 6.0;

  const allocation = bandit.allocateThompsonSampling(100000);
  const prunedStrat = allocation.allocations.find(a => a.strategy === "failing_strat");

  assert.equal(prunedStrat.status, "PRUNED_MAX_DRAWDOWN");
  assert.equal(prunedStrat.allocatedCapital, 0);
  assert.equal(prunedStrat.weight, 0);
});

test("Macro Stress-Testing Matrix evaluates historical crisis scenarios", () => {
  const stress = runMacroStressTestingMatrix({
    portfolioCash: 50000,
    positions: [
      { symbol: "AAPL", assetClass: "EQUITY", marketValue: 25000 },
      { symbol: "BTC", assetClass: "CRYPTO", marketValue: 25000 }
    ]
  });

  assert.equal(stress.totalPortfolioValue, 100000);
  assert.equal(stress.scenariosCount, 4);
  assert.ok(stress.scenarios.LEHMAN_2008_GFC);
  assert.ok(stress.scenarios.COVID_MARCH_2020_CRASH);
  assert.ok(stress.scenarios.CRYPTO_MAY_2021_DELEVERAGING);
  assert.ok(stress.scenarios.STAGFLATION_2022_FED_TIGHTENING);

  // Verify portfolio loss was calculated
  assert.ok(stress.scenarios.COVID_MARCH_2020_CRASH.portfolioLossDollars > 0);
  assert.ok(stress.scenarios.COVID_MARCH_2020_CRASH.portfolioLossPct > 0);
  assert.ok(stress.worstCaseLossPct > 0);
});

test("Extreme Value Theory (EVT) GPD Engine computes ultra-extreme VaR and CVaR", () => {
  const evt = computeExtremeValueTheoryTailRisk({
    confidenceLevel: 0.999
  });

  assert.equal(evt.confidenceLevel, 0.999);
  assert.ok(evt.var999Pct > 0);
  assert.ok(evt.cvar999Pct >= evt.var999Pct);
  assert.ok(typeof evt.shapeParameterXi === "number");
  assert.ok(evt.scaleParameterBeta > 0);
  assert.ok(["FAT_TAILED_PARETO", "THIN_TAILED_EXPONENTIAL"].includes(evt.tailType));
});

test("Telegram Trading Suite parses natural language prompts and renders headless SVG charts", () => {
  // 1. Order parsing
  const orderNlp = parseNaturalLanguageTradingPrompt("buy 25 AAPL using twap over 45 minutes");
  assert.equal(orderNlp.intent, "EXECUTE_ORDER");
  assert.equal(orderNlp.side, "BUY");
  assert.equal(orderNlp.quantity, 25);
  assert.equal(orderNlp.symbol, "AAPL");
  assert.equal(orderNlp.executionType, "TWAP");
  assert.equal(orderNlp.durationMinutes, 45);

  // 2. Stress test parsing
  const stressNlp = parseNaturalLanguageTradingPrompt("run stress test for 2020 covid crash");
  assert.equal(stressNlp.intent, "RUN_STRESS_TEST");
  assert.equal(stressNlp.scenario, "COVID_MARCH_2020_CRASH");

  // 3. Rebalance parsing
  const rebalanceNlp = parseNaturalLanguageTradingPrompt("rebalance portfolio using hrp");
  assert.equal(rebalanceNlp.intent, "PORTFOLIO_OPTIMIZATION");
  assert.equal(rebalanceNlp.method, "HIERARCHICAL_RISK_PARITY");

  // 4. Headless SVG Chart generation
  const svg = renderHeadlessSvgChart({ symbol: "BTC", points: [85000, 86200, 85800, 87400, 88200] });
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("BTC 1H INTRADAY"));
  assert.ok(svg.includes("</svg>"));
});

test("Quant Research MCP Server registers and executes all 5 new NextGen tools", async () => {
  const mcpServer = createQuantResearchMcpServer();

  // Verify all 5 new tools are registered
  const expectedTools = [
    "simulate_l3_order_book_impact",
    "compute_almgren_chriss_trajectory",
    "query_feature_store_and_psi_drift",
    "allocate_capital_thompson_sampling",
    "execute_macro_scenario_stress_test"
  ];

  for (const name of expectedTools) {
    assert.ok(mcpServer.tools.has(name), `Expected MCP tool ${name} to be registered`);
  }

  // Execute Tool 20: simulate_l3_order_book_impact
  const lobRes = await mcpServer.handleMessage({
    jsonrpc: "2.0",
    id: "test-1",
    method: "tools/call",
    params: {
      name: "simulate_l3_order_book_impact",
      arguments: { symbol: "AAPL", side: "BUY", requestedQuantity: 50 }
    }
  });
  assert.equal(lobRes.result.isError, false);
  const lobData = JSON.parse(lobRes.result.content[0].text);
  assert.equal(lobData.executedQuantity, 50);

  // Execute Tool 21: compute_almgren_chriss_trajectory
  const trajRes = await mcpServer.handleMessage({
    jsonrpc: "2.0",
    id: "test-2",
    method: "tools/call",
    params: {
      name: "compute_almgren_chriss_trajectory",
      arguments: { totalShares: 1000, numberOfTranches: 5 }
    }
  });
  assert.equal(trajRes.result.isError, false);
  const trajData = JSON.parse(trajRes.result.content[0].text);
  assert.equal(trajData.trajectory.length, 5);

  // Execute Tool 23: allocate_capital_thompson_sampling
  const bandRes = await mcpServer.handleMessage({
    jsonrpc: "2.0",
    id: "test-3",
    method: "tools/call",
    params: {
      name: "allocate_capital_thompson_sampling",
      arguments: { totalCapital: 50000, method: "THOMPSON" }
    }
  });
  assert.equal(bandRes.result.isError, false);
  const bandData = JSON.parse(bandRes.result.content[0].text);
  assert.equal(bandData.totalCapital, 50000);
});
