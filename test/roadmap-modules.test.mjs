import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { AlpacaBroker } from "../src/live-broker-alpaca.mjs";
import { Backtester } from "../src/backtester.mjs";
import { calculateHierarchicalRiskParity, calculateBlackLitterman, calculateMarkowitzFrontier } from "../src/portfolio-optimizer.mjs";
import { calculateValueAtRisk, calculateConditionalValueAtRisk, calculateSharpeRatio, calculateSortinoRatio, calculateMaxDrawdown } from "../src/risk-metrics.mjs";
import { StrategyFactory } from "../src/strategy-factory.mjs";
import { runWalkForwardTest } from "../src/walkforward-validator.mjs";
import { GeneticOptimizer } from "../src/genetic-optimizer.mjs";
import { analyzeChartVision, processVoiceCommand } from "../src/chart-vision.mjs";
import { app } from "../server.mjs";

test("Phase 2: AlpacaBroker validates buying power in live mode and routes orders via mock client", async () => {
  // Test mock client
  const mockClient = {
    async getAccount() {
      return { buying_power: 500, cash: 500 };
    },
    async createOrder(order) {
      return { id: "alpaca-ord-123", ...order, status: "accepted" };
    },
    async getPositions() {
      return [{ symbol: "AAPL", qty: "10" }];
    },
    async getOrders() {
      return [{ id: "alpaca-ord-123", status: "filled" }];
    }
  };

  const broker = new AlpacaBroker({ client: mockClient, baseUrl: "https://api.alpaca.markets" });
  assert.equal(broker.isLive, true);

  // Insufficient buying power in live mode throws
  await assert.rejects(
    () => broker.placeOrder("AAPL", 10, "buy"),
    /INSUFFICIENT_BUYING_POWER/
  );

  // Paper mode bypasses live buying power gate
  const paperBroker = new AlpacaBroker({ client: mockClient, baseUrl: "https://paper-api.alpaca.markets" });
  assert.equal(paperBroker.isLive, false);
  const order = await paperBroker.placeOrder("AAPL", 5, "buy");
  assert.equal(order.id, "alpaca-ord-123");
  assert.equal(order.symbol, "AAPL");

  const positions = await paperBroker.getPositions();
  assert.equal(positions.length, 1);
});

test("Phase 3: Discrete Candle Backtester executes buy/sell signals and calculates PnL and Sharpe", async () => {
  const candles = [
    { time: "2026-09-01T10:00:00Z", close: 100 },
    { time: "2026-09-01T10:01:00Z", close: 105 },
    { time: "2026-09-01T10:02:00Z", close: 110 },
    { time: "2026-09-01T10:03:00Z", close: 108 },
    { time: "2026-09-01T10:04:00Z", close: 115 },
    { time: "2026-09-01T10:05:00Z", close: 102 }
  ];

  let step = 0;
  const mockStrategy = {
    evaluate: () => {
      step++;
      if (step === 1) return "BUY";
      if (step === 5) return "SELL";
      return "HOLD";
    }
  };

  const backtester = new Backtester(mockStrategy, candles, 100000);
  const result = backtester.run();

  assert.equal(result.startEquity, 100000);
  assert.ok(result.endEquity > 0);
  assert.equal(result.trades.length, 2);
  assert.equal(result.trades[0].action, "BUY");
  assert.equal(result.trades[1].action, "SELL");
  assert.ok(result.trades[1].pnl > 0);
});

test("Phase 4: Portfolio Optimizer computes HRP, Black-Litterman, and Markowitz frontier", async () => {
  const returns = [0.12, 0.18, 0.10];
  const cov = [
    [0.04, 0.01, 0.01],
    [0.01, 0.06, 0.02],
    [0.01, 0.02, 0.03]
  ];

  // HRP
  const hrpWeights = calculateHierarchicalRiskParity(returns, cov);
  assert.equal(hrpWeights.length, 3);
  const hrpSum = hrpWeights.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(hrpSum - 1.0) < 0.02);

  // Black-Litterman
  const marketCap = [500000, 1000000, 250000];
  const views = [{ assetIdx: 1, confidence: 0.8, expectedReturn: 0.10 }];
  const blWeights = calculateBlackLitterman(marketCap, views);
  assert.equal(blWeights.length, 3);
  assert.ok(blWeights[1] > 0);

  // Markowitz Frontier
  const frontier = calculateMarkowitzFrontier(returns, cov, 0.02);
  assert.ok(frontier.length > 0);
  assert.ok(frontier[0].risk > 0);
  assert.ok(frontier[0].return !== undefined);
});

test("Phase 4: Risk Metrics calculates VaR, CVaR, Sharpe, Sortino, and Max Drawdown", async () => {
  const returns = [-0.05, -0.03, -0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08];
  const var95 = calculateValueAtRisk(returns, 0.95);
  assert.ok(var95 <= 0);

  const cvar95 = calculateConditionalValueAtRisk(returns, 0.95);
  assert.ok(cvar95 <= var95);

  const sharpe = calculateSharpeRatio(returns, 0.01);
  assert.ok(typeof sharpe === "number");

  const sortino = calculateSortinoRatio(returns, 0.01);
  assert.ok(typeof sortino === "number");

  const equityCurve = [100000, 105000, 102000, 98000, 110000];
  const maxDD = calculateMaxDrawdown(equityCurve);
  assert.ok(maxDD > 0 && maxDD <= 1);
});

test("Phase 5: Strategy Factory generates SMA, Momentum, Mean Reversion and 1000+ permutations", async () => {
  const sma = StrategyFactory.createMovingAverageCrossover(5, 15);
  assert.equal(sma.name, "SMA_5_15");

  const candles = Array(20).fill(0).map((_, i) => ({ close: 100 + i }));
  assert.equal(sma.evaluate(candles), "BUY");

  const mom = StrategyFactory.createMomentum(5, 1.0);
  assert.equal(mom.evaluate(candles), "BUY");

  const mr = StrategyFactory.createMeanReversion(10, 1.5);
  assert.ok(["BUY", "SELL", "HOLD"].includes(mr.evaluate(candles)));

  const megafactory = StrategyFactory.generateMegafactoryCatalog();
  assert.ok(megafactory.length >= 1000);
});

test("Phase 6: Walk-Forward Validator and Genetic Optimizer evolve strategies across generations", async () => {
  const data = Array(60).fill(0).map((_, i) => ({ time: `t-${i}`, close: 100 + Math.sin(i / 5) * 10 }));
  const strategy = StrategyFactory.createMovingAverageCrossover(5, 15);

  const wfResults = runWalkForwardTest(strategy, data, 30, 10);
  assert.ok(wfResults.length >= 2);
  assert.ok(wfResults[0].trainSharpe !== undefined);
  assert.ok(wfResults[0].overfitting !== undefined);

  // Genetic Optimizer
  const factory = {
    build: (params) => StrategyFactory.createMovingAverageCrossover(params.period, params.period + 10)
  };
  const fitness = (strat) => strat.name.length;
  const optimizer = new GeneticOptimizer(factory, fitness);
  const res = optimizer.evolve(5, 15);
  assert.ok(res.bestIndividual);
  assert.equal(res.generations, 5);
});

test("Phase 7: Chart Vision and Voice Command parse natural inputs", async () => {
  const visionAnalysis = await analyzeChartVision("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
  assert.ok(visionAnalysis.supportLevels);
  assert.ok(visionAnalysis.resistanceLevels);
  assert.ok(["BULLISH", "BEARISH"].includes(visionAnalysis.trendDirection));

  const voiceResult = await processVoiceCommand("Buy 25 shares of AAPL stop loss at 170 take profit at 195");
  assert.equal(voiceResult.action, "BUY");
  assert.equal(voiceResult.quantity, 25);
  assert.equal(voiceResult.stop_loss, 170);
  assert.equal(voiceResult.take_profit, 195);
});

test("Server Integration: Endpoints for /api/orders guard, /api/backtest, /api/portfolio, /api/risk, /api/strategies/megafactory", async () => {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. /api/orders live mode without ENABLE_LIVE_TRADING returns 403
    const liveOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 10, mode: "live" })
    });
    assert.equal(liveOrderRes.status, 403);

    // 2. /api/orders paper mode returns 200
    const paperOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 10, mode: "paper" })
    });
    assert.equal(paperOrderRes.status, 200);
    const paperData = await paperOrderRes.json();
    assert.equal(paperData.success, true);
    assert.equal(paperData.order.status, "simulated");

    // 3. /api/backtest
    const backtestRes = await fetch(`${baseUrl}/api/backtest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          { time: "t1", close: 100 },
          { time: "t2", close: 105 },
          { time: "t3", close: 95 }
        ]
      })
    });
    assert.equal(backtestRes.status, 200);
    const backtestData = await backtestRes.json();
    assert.equal(backtestData.success, true);
    assert.ok(backtestData.startEquity === 100000);

    // 4. /api/portfolio/frontier
    const frontierRes = await fetch(`${baseUrl}/api/portfolio/frontier`);
    assert.equal(frontierRes.status, 200);
    const frontierData = await frontierRes.json();
    assert.equal(frontierData.success, true);
    assert.ok(frontierData.frontier.length > 0);

    // 5. /api/strategies/megafactory?limit=50
    const megaRes = await fetch(`${baseUrl}/api/strategies/megafactory?limit=50`);
    assert.equal(megaRes.status, 200);
    const megaData = await megaRes.json();
    assert.equal(megaData.count, 50);

    // 6. /api/voice/command
    const voiceRes = await fetch(`${baseUrl}/api/voice/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Buy 15 shares of TSLA stop loss at 200" })
    });
    assert.equal(voiceRes.status, 200);
    const voiceData = await voiceRes.json();
    assert.equal(voiceData.success, true);
    assert.equal(voiceData.parsed.action, "BUY");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
