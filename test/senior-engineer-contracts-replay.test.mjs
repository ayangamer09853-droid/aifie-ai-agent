// test/senior-engineer-contracts-replay.test.mjs
// Comprehensive Senior Engineer Architectural Contracts & Replay Test Suite
// Verifies:
// 1. Strict TradeIntent contracts & schema validation.
// 2. Sovereign Risk authority & independent veto power.
// 3. Multi-Clock abstraction & stage latency attribution.
// 4. Strategy Registry schema enforcement & regime weighting.
// 5. Deterministic Event Sourcing trade replay (tick -> decision -> risk -> fill).

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { validateTradeIntent, validateAifieEvent } from "../src/core/types.mjs";
import { TradingClock } from "../src/core/clock.mjs";
import { aifieEventBus } from "../src/core/event-bus-replay.mjs";
import { strategyRegistry } from "../src/strategies/strategy-registry.mjs";
import { independentRiskFortress } from "../src/independent-risk-fortress.mjs";

describe("Senior Engineer Architectural Contracts & Deterministic Replay", () => {
  beforeEach(() => {
    aifieEventBus.clear();
    independentRiskFortress.reset();
  });

  it("1. Strict TradeIntent Contract Validation", () => {
    const validIntent = {
      id: "intent_btc_001",
      correlationId: "corr_btc_9901",
      symbol: "BTCUSDT",
      side: "BUY",
      strategy: "trend-v12",
      confidence: 0.78,
      expectedReturn: 240, // 240 bps
      expectedLoss: 80,    // 80 bps
      entry: 65000.0,
      stopLoss: 64200.0,   // strictly below entry for BUY
      takeProfit: 67000.0,  // strictly above entry for BUY
      maxPosition: 15000.0,
      timeHorizon: 3600000,
      evidence: [
        { source: "rl-trademaster", score: 0.82, rationale: "Policy gradient long signal", metric: 2.1 },
        { source: "vpin-toxicity", score: 0.75, rationale: "Low toxic flow, buyer accumulation", metric: 0.22 }
      ],
      invalidators: ["VPIN_EXCEEDS_0.75", "PRICE_DROPS_BELOW_64000"],
      modelVersions: ["rl-policy-v17.2", "microstructure-v6.3"],
      timestamp: Date.now()
    };

    const resValid = validateTradeIntent(validIntent);
    assert.equal(resValid.valid, true, `Expected valid intent, got errors: ${resValid.errors.join(", ")}`);

    // Invalidation 1: BUY with stopLoss above entry
    const invalidStop = { ...validIntent, stopLoss: 66000.0 };
    const resStop = validateTradeIntent(invalidStop);
    assert.equal(resStop.valid, false);
    assert.ok(resStop.errors.some(e => e.includes("BUY stopLoss must be strictly lower than entry")));

    // Invalidation 2: Confidence > 1.0 (uncalibrated)
    const uncalibrated = { ...validIntent, confidence: 1.45 };
    const resUncal = validateTradeIntent(uncalibrated);
    assert.equal(resUncal.valid, false);
    assert.ok(resUncal.errors.some(e => e.includes("Confidence must be a calibrated number")));

    // Invalidation 3: Missing evidence
    const noEvidence = { ...validIntent, evidence: [] };
    const resNoEv = validateTradeIntent(noEvidence);
    assert.equal(resNoEv.valid, false);
    assert.ok(resNoEv.errors.some(e => e.includes("evidence must be a non-empty array")));
  });

  it("2. Sovereign Risk Authority Overrides AI Opinion", () => {
    // Scenario: AI Models have 98% confidence BUY, but Risk Engine detects Daily Drawdown breach
    const aggressiveIntent = {
      id: "intent_eth_high_risk",
      correlationId: "corr_eth_9902",
      symbol: "ETHUSDT",
      side: "BUY",
      strategy: "rl-v17",
      confidence: 0.98,
      expectedReturn: 500,
      expectedLoss: 100,
      entry: 3500.0,
      stopLoss: 3400.0,
      takeProfit: 3800.0,
      maxPosition: 20000.0,
      timeHorizon: 7200000,
      evidence: [{ source: "super-consensus", score: 0.99, rationale: "All 10 agents unanimous", metric: 9.9 }],
      invalidators: [],
      modelVersions: ["v17"],
      timestamp: Date.now()
    };

    // Simulate portfolio with 3.5% drawdown (exceeds immutable 3.0% limit)
    const portfolioState = {
      equityUsd: 100000,
      drawdownPct: 3.5,
      totalExposureUsd: 50000,
      symbolExposureUsd: 0,
      correlatedExposureUsd: 10000
    };

    const riskAudit = independentRiskFortress.auditTradeIntent(aggressiveIntent, portfolioState);

    // AI wanted BUY with 0.98 confidence, but Sovereign Risk MUST REJECT
    assert.equal(riskAudit.decision, "REJECTED");
    assert.equal(riskAudit.approvedSizeUsd, 0);
    assert.ok(riskAudit.reasons.some(r => r.includes("DAILY_DRAWDOWN_LIMIT_BREACHED")));
  });

  it("3. Deterministic Multi-Clock Abstraction & Latency Attribution", () => {
    const clock = new TradingClock();
    const marketTime = 1788600000000;
    const receiveTime = marketTime + 12;   // 12ms network transit
    const processTime = receiveTime + 2;    // 2ms ingestion
    const decisionTime = processTime + 8;   // 8ms alpha/governor
    const submitTime = decisionTime + 3;    // 3ms risk & order router
    const ackTime = submitTime + 5;         // 5ms broker ack
    const fillTime = ackTime + 15;          // 15ms exchange matching

    clock.markIngest(marketTime, receiveTime);
    clock.processTimestamp = processTime;
    clock.markDecision(decisionTime);
    clock.markSubmit(submitTime);
    clock.markExchangeAck(ackTime);
    clock.markFill(fillTime);

    const latencies = clock.computeLatencies();

    assert.equal(latencies.networkLatencyMs, 12);
    assert.equal(latencies.ingestionLatencyMs, 2);
    assert.equal(latencies.decisionLatencyMs, 8);
    assert.equal(latencies.submitLatencyMs, 3);
    assert.equal(latencies.exchangeAckLatencyMs, 5);
    assert.equal(latencies.executionLatencyMs, 20); // fillTime - submitTime
    assert.equal(latencies.totalLatencyMs, 45);     // fillTime - marketTime

    const snap = clock.snapshot();
    assert.equal(snap.timestamps.marketTimestamp, marketTime);
    assert.equal(snap.latencies.totalLatencyMs, 45);
  });

  it("4. Strategy Registry Schema & Regime-Based Weight Adaptation", () => {
    const strategies = strategyRegistry.list();
    assert.ok(strategies.length >= 6, "Expected at least 6 standard registered strategies");

    const trend = strategyRegistry.get("trend-v12");
    assert.equal(trend.id, "trend-v12");
    assert.equal(trend.status, "PRODUCTION");
    assert.equal(trend.owner, "Quant Momentum Desk");

    // Adapt to TRENDING regime
    const trendingWeights = strategyRegistry.adaptWeightsToRegime("TRENDING");
    const trendWeight = trendingWeights.find(s => s.id === "trend-v12").currentWeight;
    const meanRevWeight = trendingWeights.find(s => s.id === "meanrev-v8").currentWeight;
    assert.ok(trendWeight > meanRevWeight, `Trend weight (${trendWeight}) should exceed MeanRev (${meanRevWeight}) in TRENDING regime`);

    // Adapt to CRISIS regime
    const crisisWeights = strategyRegistry.adaptWeightsToRegime("CRISIS");
    const trendCrisis = crisisWeights.find(s => s.id === "trend-v12").currentWeight;
    assert.equal(trendCrisis, 0, "Trend strategy allocation should be 0 in CRISIS regime");
  });

  it("5. Deterministic Event Sourcing Trade Replay", () => {
    const correlationId = "corr_trade_aifie_007";

    // 1. Ingest Market Tick
    aifieEventBus.emit("MARKET_TICK", "BinanceConnector", correlationId, {
      symbol: "BTCUSDT",
      price: 64500.0,
      volume: 1.45
    });

    // 2. Feature Update
    aifieEventBus.emit("FEATURE_UPDATE", "FeatureEngine", correlationId, {
      features: { vpin: 0.18, hurst: 0.62, obi: 0.45, atr_14: 420 }
    });

    // 3. Signals Created
    aifieEventBus.emit("SIGNAL_CREATED", "trend-v12", correlationId, {
      direction: "BUY",
      confidence: 0.81,
      rationale: "Breakout above 20 EMA with expanding volume"
    });
    aifieEventBus.emit("SIGNAL_CREATED", "rl-v17", correlationId, {
      direction: "BUY",
      confidence: 0.79,
      rationale: "Deep RL Actor-Critic high Q-value on trend continuation"
    });

    // 4. Governor Assembles TradeIntent
    const tradeIntentPayload = {
      id: "intent_007",
      symbol: "BTCUSDT",
      side: "BUY",
      strategy: "trend-v12",
      confidence: 0.80,
      expectedReturn: 300,
      expectedLoss: 90,
      entry: 64520.0,
      stopLoss: 63800.0,
      takeProfit: 66200.0,
      maxPosition: 12000.0,
      invalidators: ["PRICE_BREAK_BELOW_63800"]
    };
    aifieEventBus.emit("TRADE_INTENT_CREATED", "Governor", correlationId, tradeIntentPayload);

    // 5. Risk Fortress Approves
    aifieEventBus.emit("RISK_APPROVED", "IndependentRiskFortress", correlationId, {
      approvedSize: 12000.0,
      var99: 180.0,
      cvar99: 250.0
    });

    // 6. Order Submission & Fill
    aifieEventBus.emit("ORDER_SUBMITTED", "SmartOrderRouter", correlationId, {
      orderId: "ORD_BINANCE_7721",
      symbol: "BTCUSDT",
      side: "BUY",
      price: 64520.0,
      quantity: 0.186
    });

    aifieEventBus.emit("ORDER_FILLED", "BinanceBrokerAdapter", correlationId, {
      orderId: "ORD_BINANCE_7721",
      filledPrice: 64521.5,
      filledQuantity: 0.186,
      slippageBps: 2.3
    });

    // Replay the trade
    const forensicReport = aifieEventBus.replayTradeDecision(correlationId);

    assert.equal(forensicReport.found, true);
    assert.equal(forensicReport.totalEvents, 8);
    assert.equal(forensicReport.causalityReport.symbol, "BTCUSDT");
    assert.equal(forensicReport.causalityReport.tickPrice, 64500.0);
    assert.equal(forensicReport.causalityReport.contributingSignals.length, 2);
    assert.equal(forensicReport.causalityReport.tradeIntent.side, "BUY");
    assert.equal(forensicReport.causalityReport.riskDecision.status, "APPROVED");
    assert.equal(forensicReport.causalityReport.execution.status, "FILLED");
    assert.equal(forensicReport.causalityReport.execution.filledPrice, 64521.5);
    assert.equal(forensicReport.causalityReport.execution.slippageBps, 2.3);
  });
});
