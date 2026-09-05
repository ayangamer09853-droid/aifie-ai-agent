import test from "node:test";
import assert from "node:assert/strict";
import { algorithmicExecutionSlicer } from "../src/execution/algorithmic-execution-slicer.mjs";
import { factorDecaySentry } from "../src/quant/factor-decay-sentry.mjs";
import { institutionalPortfolioOptimizer } from "../src/portfolio/institutional-portfolio-optimizer.mjs";
import { eventSourcingWalJournal } from "../src/storage/event-sourcing-wal.mjs";
import { handleTradingSuiteCommand } from "../src/telegram-trading-suite.mjs";

test("Algorithmic Execution Slicer creates TWAP schedule with stealth interval jitter", () => {
  const schedule = algorithmicExecutionSlicer.createTwapSchedule({
    symbol: "BTC/USDT",
    side: "buy",
    totalQuantity: 20,
    durationMinutes: 15,
    tranchesCount: 5,
    jitterPercent: 15,
    arrivalPrice: 65000.00
  });

  assert.equal(schedule.algorithm, "TWAP");
  assert.equal(schedule.symbol, "BTC/USDT");
  assert.equal(schedule.totalQuantity, 20);
  assert.equal(schedule.tranchesCount, 5);
  assert.equal(schedule.tranches.length, 5);

  const sumQty = schedule.tranches.reduce((sum, t) => sum + t.quantity, 0);
  assert.equal(sumQty, 20);
  assert.equal(schedule.status, "ACTIVE");

  // Verify intervals have delay timestamps
  assert.ok(schedule.tranches[1].scheduledDelayMs > 0);
});

test("Algorithmic Execution Slicer creates VWAP schedule matching U-shaped volume curve", () => {
  const vwap = algorithmicExecutionSlicer.createVwapSchedule({
    symbol: "NVDA",
    side: "buy",
    totalQuantity: 100,
    durationMinutes: 30,
    tranchesCount: 6
  });

  assert.equal(vwap.algorithm, "VWAP");
  assert.equal(vwap.totalQuantity, 100);
  assert.equal(vwap.tranches.length, 6);

  const sumQty = vwap.tranches.reduce((sum, t) => sum + t.quantity, 0);
  assert.equal(sumQty, 100);

  // U-shaped: first and last tranches should have higher weight than middle tranches
  assert.ok(vwap.tranches[0].volumeWeightPercent > vwap.tranches[2].volumeWeightPercent);
  assert.ok(vwap.tranches[5].volumeWeightPercent > vwap.tranches[2].volumeWeightPercent);
});

test("Algorithmic Execution Slicer creates POV and Iceberg orders", () => {
  const pov = algorithmicExecutionSlicer.createPovSchedule({
    symbol: "SOL/USDT",
    side: "buy",
    totalQuantity: 50,
    participationRate: 0.05
  });
  assert.equal(pov.symbol, "SOL/USDT");
  assert.equal(pov.totalQuantity, 50);

  const iceberg = algorithmicExecutionSlicer.createIcebergOrder({
    symbol: "AAPL",
    side: "buy",
    totalQuantity: 100,
    displayQuantity: 20,
    limitPrice: 225.0
  });
  assert.equal(iceberg.algorithm, "ICEBERG");
  assert.equal(iceberg.displayQuantity, 20);
  assert.equal(iceberg.hiddenReserveQuantity, 80);
});

test("Algorithmic Execution Slicer simulates slice fill with Implementation Shortfall", () => {
  const schedule = algorithmicExecutionSlicer.createTwapSchedule({
    symbol: "BTC/USDT",
    side: "buy",
    totalQuantity: 10,
    tranchesCount: 2,
    arrivalPrice: 65000.0
  });

  const res = algorithmicExecutionSlicer.simulateExecuteSlice(schedule.scheduleId, 1, 65020.0);
  assert.equal(res.tranche.status, "FILLED");
  assert.ok(res.tranche.executedPrice > 0);
  assert.ok(res.tranche.slippageBps !== null);
  assert.ok(res.tranche.implementationShortfallBps !== null);
  assert.equal(res.schedule.executedQuantity, res.tranche.quantity);
});

test("Factor Decay Sentry calculates Information Coefficient (IC) and audits decay matrix", () => {
  const preds = [0.02, -0.01, 0.04, 0.01, -0.03, 0.05, -0.02, 0.03];
  const returns = [0.018, -0.009, 0.035, 0.012, -0.025, 0.048, -0.015, 0.028];

  const icResult = factorDecaySentry.calculateInformationCoefficient(preds, returns);
  assert.ok(icResult.ic > 0.85); // High positive correlation
  assert.ok(icResult.statisticallySignificant);

  const audit = factorDecaySentry.auditFactorDecayMatrix("BTC/USDT");
  assert.ok(audit.pillarsAudit.MOMENTUM_TREND);
  assert.ok(audit.pillarsAudit.MICROSTRUCTURE_FLOW);
  assert.ok(audit.pillarsAudit.FUNDAMENTAL_VALUATION);
  assert.ok(typeof audit.pillarsAudit.MOMENTUM_TREND.rolling30DayIc === "number");
  assert.ok(typeof audit.pillarsAudit.MOMENTUM_TREND.informationRatio === "number");
});

test("Factor Decay Sentry adapts regime-conditioned weights and computes Deflated Sharpe Ratio", () => {
  const bullWeights = factorDecaySentry.getRegimeConditionedWeights("BULL_TREND_STABLE");
  assert.equal(bullWeights.regime, "BULL_TREND_STABLE");
  assert.equal(bullWeights.weights.MOMENTUM_TREND, 0.35);

  const bearWeights = factorDecaySentry.getRegimeConditionedWeights("BEAR_TREND_DEFENSIVE");
  assert.equal(bearWeights.weights.GEOPOLITICAL_MACRO, 0.30);

  const dsr = factorDecaySentry.calculateDeflatedSharpeRatio({
    observedSharpe: 2.8,
    trackRecordLengthDays: 252,
    numberOfTrials: 20
  });
  assert.ok(typeof dsr.deflatedSharpeRatio === "number" && dsr.deflatedSharpeRatio > 0 && dsr.deflatedSharpeRatio <= 1.0);
  assert.equal(typeof dsr.passesPboGate, "boolean");
  assert.ok(dsr.verdict);
});

test("Institutional Portfolio Optimizer computes Hierarchical Risk Parity (HRP) weights", () => {
  const hrp = institutionalPortfolioOptimizer.optimizeHierarchicalRiskParity(["BTC", "ETH", "SOL", "NVDA", "AAPL", "SPY"]);

  assert.equal(hrp.method, "HIERARCHICAL_RISK_PARITY");
  assert.equal(hrp.assetsCount, 6);

  const sumWeights = Object.values(hrp.optimalWeights).reduce((sum, w) => sum + w, 0);
  assert.ok(Math.abs(sumWeights - 1.0) < 0.005); // Sums to 100%

  // Lower volatility assets (SPY, AAPL) should receive higher risk parity weight than high-vol crypto (SOL)
  assert.ok(hrp.optimalWeights.SPY > hrp.optimalWeights.SOL);
});

test("Institutional Portfolio Optimizer computes Black-Litterman allocation and drift checks", () => {
  const bl = institutionalPortfolioOptimizer.optimizeBlackLitterman({
    assets: ["BTC", "ETH", "NVDA", "SPY"],
    views: [{ asset: "BTC", expectedExcessReturn: 0.30, confidence: 0.90 }]
  });

  assert.equal(bl.method, "BLACK_LITTERMAN_BAYESIAN");
  assert.ok(bl.optimalWeights.BTC > 0);

  const sumWeights = Object.values(bl.optimalWeights).reduce((sum, w) => sum + w, 0);
  assert.ok(Math.abs(sumWeights - 1.0) < 0.005);

  // Drift check: simulate 35% BTC vs 25% target (10% drift > 2.5% threshold)
  const drift = institutionalPortfolioOptimizer.evaluateRebalancingDrift({
    currentHoldingsUsd: { BTC: 35000, ETH: 15000, NVDA: 25000, SPY: 25000 },
    targetWeights: { BTC: 0.25, ETH: 0.20, NVDA: 0.30, SPY: 0.25 }
  });

  assert.equal(drift.rebalanceRecommended, true);
  assert.ok(drift.rebalanceOrders.length > 0);
  const btcOrder = drift.rebalanceOrders.find(o => o.asset === "BTC");
  assert.equal(btcOrder.action, "SELL"); // Needs to trim over-allocated BTC
});

test("Event Sourcing WAL Journal appends events, replays log, and reconstructs historical state", async () => {
  const now = Date.now();
  await eventSourcingWalJournal.appendEvent("ORDER_FILLED", {
    fill: { symbol: "BTC/USDT", side: "buy", quantity: 1, fillPrice: 65000, commission: 5 }
  });
  await eventSourcingWalJournal.appendEvent("ORDER_FILLED", {
    fill: { symbol: "BTC/USDT", side: "sell", quantity: 1, fillPrice: 66000, commission: 5 }
  });

  const events = eventSourcingWalJournal.replayEvents({ fromTimestamp: now - 5000 });
  assert.ok(events.length >= 2);

  const state = eventSourcingWalJournal.reconstructStateAt(Date.now(), 100000);
  assert.ok(state.eventsProcessedCount >= 2);
  assert.ok(state.realizedPnl >= 990); // 66,000 - 65,000 - 10 commissions = $990 profit
  assert.equal(state.totalOrdersFilled >= 2, true);

  const tel = eventSourcingWalJournal.getTelemetry();
  assert.ok(tel.totalEventsLogged >= 2);
});

test("Telegram Trading Suite handles /app and /terminal commands for Telegram Mini-App (TMA)", () => {
  const appRes = handleTradingSuiteCommand("/app", {}, {});
  assert.equal(appRes.handled, true);
  assert.ok(appRes.response.text.includes("AIFIE TELEGRAM MINI-APP"));
  assert.ok(appRes.response.replyMarkup.inline_keyboard[0][0].web_app);

  const termRes = handleTradingSuiteCommand("/terminal", {}, {});
  assert.equal(termRes.handled, true);
  assert.ok(termRes.response.replyMarkup.inline_keyboard[0][0].web_app.url);
});
