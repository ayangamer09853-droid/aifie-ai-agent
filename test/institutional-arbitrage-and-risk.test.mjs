import test from "node:test";
import assert from "node:assert/strict";
import { realtimeEventStream } from "../src/realtime-event-stream.mjs";
import { institutionalArbitrageEngine } from "../src/institutional-arbitrage-engine.mjs";
import { institutionalRiskEngine } from "../src/institutional-risk-engine.mjs";
import { telegramAlphaDispatcher } from "../src/telegram-alpha-dispatcher.mjs";

test("RealtimeEventStream registers clients, stores replay buffer, and broadcasts events", () => {
  const written = [];
  const mockRes = {
    writeHead: () => {},
    write: (chunk) => written.push(chunk),
    on: () => {},
    writableEnded: false,
    destroyed: false
  };

  const clientId = realtimeEventStream.registerClient(mockRes);
  assert.ok(clientId.startsWith("client_"));
  assert.ok(written.some(w => w.includes("event: connected")));

  // Broadcast test event
  const evt = realtimeEventStream.broadcast("test_alpha_signal", { symbol: "BTC/USDT", score: 88 });
  assert.equal(evt.type, "test_alpha_signal");
  assert.equal(evt.data.symbol, "BTC/USDT");

  const telemetry = realtimeEventStream.getTelemetry();
  assert.ok(telemetry.totalEventsBroadcast >= 1);
  assert.ok(telemetry.replayBufferLength >= 1);

  const recent = realtimeEventStream.getRecentEvents(5);
  assert.ok(recent.some(r => r.type === "test_alpha_signal"));
});

test("Institutional Arbitrage Engine scans spatial multi-venue spreads with fee schedules", () => {
  const scan = institutionalArbitrageEngine.scanSpatialArbitrage(["BTC/USDT", "ETH/USDT", "SOL/USDT"]);

  assert.ok(Array.isArray(scan.activeVenues));
  assert.equal(scan.activeVenues.length, 5); // Binance, Coinbase Pro, Kraken, OKX, Bybit
  assert.ok(scan.matrix["BTC/USDT"]);
  assert.ok(scan.matrix["BTC/USDT"].binance);
  assert.ok(scan.matrix["BTC/USDT"].coinbase);

  assert.ok(Array.isArray(scan.opportunities));
  assert.ok(scan.opportunities.length > 0);

  const top = scan.opportunities[0];
  assert.ok(top.buyVenue);
  assert.ok(top.sellVenue);
  assert.notEqual(top.buyVenue, top.sellVenue);
  assert.ok(top.grossSpreadPercent !== undefined);
  assert.ok(top.feesPercent > 0);
  assert.ok(typeof top.netProfitPercent === "number");
  assert.ok(typeof top.annualizedApr === "number");
});

test("Institutional Arbitrage Engine scans triangular cyclic currency loops", () => {
  const tri = institutionalArbitrageEngine.scanTriangularArbitrage("binance");

  assert.equal(tri.type, "TRIANGULAR_CYCLE");
  assert.equal(tri.venue, "Binance");
  assert.deepEqual(tri.cycle, ["USDT", "BTC", "ETH", "USDT"]);
  assert.equal(tri.legs.length, 3);
  assert.ok(tri.grossYieldPercent !== undefined);
  assert.ok(tri.feesDeductedPercent > 0);
  assert.ok(tri.netYieldPercent !== undefined);
});

test("Institutional Arbitrage Engine executes synthetic 2-leg atomic paper fills with PnL and fee accounting", () => {
  const exec = institutionalArbitrageEngine.executeSyntheticArbitrage({
    symbol: "BTC/USDT",
    notional: 5000,
    buyVenue: "bybit",
    sellVenue: "coinbase"
  });

  assert.ok(exec.executionId.startsWith("EXEC_ARB_"));
  assert.equal(exec.status, "FILLED_SYNTHETIC_PAPER");
  assert.equal(exec.mode, "SIMULATED_PAPER_EXECUTION");
  assert.equal(exec.symbol, "BTC/USDT");
  assert.equal(exec.notional, 5000);
  assert.ok(exec.quantity > 0);

  assert.equal(exec.leg1.action, "BUY");
  assert.equal(exec.leg2.action, "SELL");
  assert.ok(exec.leg1.feeUsd > 0);
  assert.ok(exec.leg2.feeUsd > 0);

  assert.ok(exec.pnl.grossProfitUsd !== undefined);
  assert.ok(exec.pnl.netProfitUsd !== undefined);
  assert.ok(exec.executionLatencyMs > 0);

  const history = institutionalArbitrageEngine.getExecutionHistory();
  assert.ok(history.some(h => h.executionId === exec.executionId));
});

test("Institutional Risk Engine calculates Parametric VaR (95%, 99%) and Expected Shortfall CVaR", () => {
  const risk = institutionalRiskEngine.calculateValueAtRisk(100000, 2.0);

  assert.equal(risk.portfolioValue, 100000);
  assert.equal(risk.dailyVolatilityPercent, 2.0);
  assert.ok(risk.annualizedVolatilityPercent > 30.0);

  // 1-day 95% VaR for $100,000 at 2% daily vol: 100,000 * 0.02 * 1.645 = $3,290
  assert.ok(risk.var95.usd > 3200 && risk.var95.usd < 3400);
  assert.equal(risk.var95.confidence, "95%");

  // 1-day 99% VaR: 100,000 * 0.02 * 2.326 = $4,652
  assert.ok(risk.var99.usd > 4500 && risk.var99.usd < 4800);
  assert.equal(risk.var99.confidence, "99%");

  // Expected Shortfall (CVaR) should exceed VaR 99%
  assert.ok(risk.expectedShortfallCVaR99.usd > risk.var99.usd);
  assert.ok(risk.regulatoryBasel10DayVaR99.usd > risk.var99.usd);
  assert.ok(risk.riskZone);
});

test("Institutional Risk Engine calculates Kelly Criterion optimal position sizing with volatility scaling", () => {
  const kelly = institutionalRiskEngine.calculateKellyPositionSize({
    winRate: 0.60,
    winLossRatio: 1.80,
    assetDailyVolPercent: 2.5,
    portfolioValue: 100000
  });

  assert.equal(kelly.inputs.winRate, 0.60);
  assert.equal(kelly.inputs.winLossRatio, 1.80);
  assert.ok(kelly.allocations.fullKelly.fraction > 0);
  assert.ok(kelly.allocations.halfKellyRecommended.fraction > 0);
  assert.ok(kelly.allocations.quarterKellyConservative.fraction > 0);

  // Half-Kelly fraction should be half of scaled full-Kelly (up to the 20% max cap)
  assert.ok(kelly.allocations.halfKellyRecommended.fraction <= kelly.allocations.fullKelly.fraction);
  assert.ok(kelly.allocations.halfKellyRecommended.capitalUsd <= 20000); // 20% cap
  assert.equal(kelly.maxPositionCapPercent, 20);
});

test("Institutional Risk Engine evaluates dynamic trailing drawdown circuit breakers", () => {
  // Test healthy state
  const normal = institutionalRiskEngine.updateEquity(100000);
  assert.equal(normal.status, "NORMAL_HEALTHY");
  assert.equal(normal.circuitBreakerActive, false);

  // New High Water Mark
  const hwm = institutionalRiskEngine.updateEquity(120000);
  assert.equal(hwm.highWaterMark, 120000);

  // Drawdown breach: 120,000 -> 100,000 is a 16.67% drawdown, exceeding 12% circuit breaker
  const breach = institutionalRiskEngine.updateEquity(100000);
  assert.equal(breach.status, "CIRCUIT_BREAKER_TRIGGERED");
  assert.equal(breach.circuitBreakerActive, true);

  // Reset circuit breaker
  const reset = institutionalRiskEngine.resetCircuitBreaker("Test reset");
  assert.equal(reset.circuitBreakerActive, false);
});

test("Institutional Risk Engine simulates 4 historical macro stress tests", () => {
  const stress = institutionalRiskEngine.runMacroStressTests(100000);

  assert.equal(stress.portfolioEquityEvaluated, 100000);
  assert.equal(stress.scenariosCount, 4);
  assert.ok(stress.portfolioResilienceScore > 0);
  assert.ok(stress.worstCaseLossUsd > 0);

  const lehman = stress.scenarios.find(s => s.id === "LEHMAN_2008_LIQUIDITY_FREEZE");
  assert.ok(lehman);
  assert.equal(lehman.projectedPortfolioDropPercent, -19.5);

  const covid = stress.scenarios.find(s => s.id === "COVID_2020_FLASH_CRASH");
  assert.ok(covid);
  assert.equal(covid.projectedPortfolioDropPercent, -27.8);

  const ftx = stress.scenarios.find(s => s.id === "CRYPTO_2022_FTX_CONTAGION");
  assert.ok(ftx);

  const rateHike = stress.scenarios.find(s => s.id === "SOVEREIGN_2026_RATE_SURPRISE");
  assert.ok(rateHike);
});

test("Telegram Alpha Dispatcher processes interactive button callback queries", async () => {
  const paper = { quotes: { "BTC/USDT": { price: 65000 } }, account: { cash: 100000, positions: {} }, risk: { maxPositionNotional: 100000 } };
  const orders = [];

  // Test alpha paper buy callback
  const buyCb = {
    id: "cb_1",
    data: "alpha:buy:SOL/USDT",
    message: { chat: { id: 12345 } }
  };
  const buyRes = await telegramAlphaDispatcher.handleCallbackQuery(buyCb, { paper, orders });
  assert.equal(buyRes.handled, true);
  assert.equal(buyRes.action, "PAPER_BUY");

  // Test 60-source scan callback
  const scanCb = {
    id: "cb_2",
    data: "alpha:scan:AAPL",
    message: { chat: { id: 12345 } }
  };
  const scanRes = await telegramAlphaDispatcher.handleCallbackQuery(scanCb, { paper, orders });
  assert.equal(scanRes.handled, true);
  assert.equal(scanRes.action, "60_SOURCE_SCAN");
  assert.ok(scanRes.scanResult.compositeAlphaScore !== undefined);

  // Test risk audit callback
  const riskCb = {
    id: "cb_3",
    data: "alpha:risk:PORTFOLIO",
    message: { chat: { id: 12345 } }
  };
  const riskRes = await telegramAlphaDispatcher.handleCallbackQuery(riskCb, { paper, orders });
  assert.equal(riskRes.handled, true);
  assert.equal(riskRes.action, "RISK_AUDIT");
  assert.ok(riskRes.risk.valueAtRisk);

  // Test arbitrage execution callback
  const arbCb = {
    id: "cb_4",
    data: "arb:exec:BTC/USDT:bybit:coinbase",
    message: { chat: { id: 12345 } }
  };
  const arbRes = await telegramAlphaDispatcher.handleCallbackQuery(arbCb, { paper, orders });
  assert.equal(arbRes.handled, true);
  assert.equal(arbRes.action, "SYNTHETIC_ARB_EXECUTION");
  assert.equal(arbRes.exec.status, "FILLED_SYNTHETIC_PAPER");
});
