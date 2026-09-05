// test/institutional-risk-and-debate-architecture.test.mjs
// Exhaustive Institutional Test Suite for Independent Risk Engine, AI Debate System,
// Confidence Calibration, Regime Engine, Reality Score, Lifecycle, Attribution, and Chaos Testing.

import test from "node:test";
import assert from "node:assert/strict";

import { RiskEngine } from "../src/risk/risk-engine.mjs";
import { KillSwitch } from "../src/risk/kill-switch.mjs";
import { PreTradeGate } from "../src/risk/pre-trade-gate.mjs";
import { PositionLimitsManager } from "../src/risk/position-limits.mjs";
import { ExposureManager } from "../src/risk/exposure-manager.mjs";
import { CorrelationRiskManager } from "../src/risk/correlation-risk.mjs";
import { DrawdownController } from "../src/risk/drawdown-controller.mjs";
import { CircuitBreaker } from "../src/risk/circuit-breaker.mjs";
import { PostTradeMonitor } from "../src/risk/post-trade-monitor.mjs";

import { AIRiskOfficer } from "../src/intelligence/ai-risk-officer.mjs";
import { AIDebateSystem } from "../src/intelligence/ai-debate-system.mjs";
import { ConfidenceCalibrationEngine } from "../src/intelligence/confidence-calibration-engine.mjs";

import { RegimeEngine } from "../src/regime/regime-engine.mjs";
import { RealisticBacktestSimulator } from "../src/backtest/realistic-backtest-simulator.mjs";
import { RealityScoreEvaluator } from "../src/backtest/reality-score-evaluator.mjs";
import { StrategyLifecycleManager, LIFECYCLE_STATES } from "../src/strategies/strategy-lifecycle-manager.mjs";
import { EventIntelligenceEngine } from "../src/events/event-intelligence-engine.mjs";
import { StructuredMemoryStore } from "../src/memory/structured-memory-store.mjs";
import { PostTradeAttributionEngine } from "../src/attribution/post-trade-attribution-engine.mjs";
import { ControlCenterEngine } from "../src/observability/control-center-engine.mjs";
import { FailureIncidentBus, FAILURE_TYPES } from "../src/observability/failure-incident-bus.mjs";
import { ChaosTestingHarness } from "../src/chaos/chaos-testing-harness.mjs";
import { UnifiedTradingEnginePipeline } from "../src/core/unified-trading-engine-pipeline.mjs";

test("PILLAR 1: KillSwitch fail-closed, trip, and authorized reset", () => {
  const ks = new KillSwitch();
  assert.equal(ks.isSafe(), true);

  const tripRes = ks.trip("Adverse market volatility", "operator-1");
  assert.equal(tripRes.status, "tripped");
  assert.equal(ks.isSafe(), false);

  // Unauthorized reset must fail
  assert.throws(() => {
    ks.reset("WRONG_TOKEN");
  }, /UNAUTHORIZED_RESET/);

  // Authorized reset succeeds
  const resetRes = ks.reset("AUTHORIZE_RESET_PROD", "head-risk-officer");
  assert.equal(resetRes.status, "disarmed");
  assert.equal(ks.isSafe(), true);
});

test("PILLAR 1: PreTradeGate rejects fat-finger, invalid side, and stale quotes", () => {
  const gate = new PreTradeGate({ maxOrderNotional: 10000, maxOrderQuantity: 100, maxQuoteAgeMs: 2000 });

  // Valid order
  const valid = gate.validateOrder({ symbol: "AAPL", side: "BUY", quantity: 50, price: 150 });
  assert.equal(valid.approved, true);

  // Invalid side
  const badSide = gate.validateOrder({ symbol: "AAPL", side: "HOLD", quantity: 50, price: 150 });
  assert.equal(badSide.approved, false);
  assert.match(badSide.reason, /INVALID_SIDE/);

  // Fat-finger quantity
  const fatQty = gate.validateOrder({ symbol: "AAPL", side: "BUY", quantity: 500, price: 150 });
  assert.equal(fatQty.approved, false);
  assert.match(fatQty.reason, /FAT_FINGER_QUANTITY/);

  // Fat-finger notional
  const fatNotional = gate.validateOrder({ symbol: "AAPL", side: "BUY", quantity: 80, price: 200 }); // $16,000 > $10,000
  assert.equal(fatNotional.approved, false);
  assert.match(fatNotional.reason, /FAT_FINGER_NOTIONAL/);

  // Stale quote
  const stale = gate.validateOrder({ symbol: "AAPL", side: "BUY", quantity: 10, price: 150, quoteTimestamp: Date.now() - 5000 });
  assert.equal(stale.approved, false);
  assert.match(stale.reason, /STALE_MARKET_DATA/);
});

test("PILLAR 1: PositionLimitsManager and ExposureManager enforce portfolio boundaries", () => {
  const posLimits = new PositionLimitsManager({ maxSingleAssetWeight: 0.20, maxNotionalPerPosition: 20000, maxSharesPerPosition: 200 });
  const portfolio = { totalNav: 50000, cash: 50000, positions: {} };

  // Exceed single asset weight (>20% of 50k = $10,000)
  const overWeight = posLimits.validatePositionLimit({
    symbol: "NVDA",
    side: "BUY",
    quantity: 100,
    price: 150, // $15,000 = 30% NAV
    portfolio
  });
  assert.equal(overWeight.approved, false);
  assert.match(overWeight.reason, /CONCENTRATION_EXCEEDED/);

  // Exposure manager gross leverage test
  const expManager = new ExposureManager({ maxGrossLeverage: 1.2, maxSectorExposure: 0.35 });
  const levBreach = expManager.validateExposure({
    symbol: "TSLA",
    side: "BUY",
    quantity: 400,
    price: 200, // $80,000 / 50k = 1.6x leverage > 1.2x
    portfolio
  });
  assert.equal(levBreach.approved, false);
  assert.match(levBreach.reason, /MAX_GROSS_LEVERAGE_EXCEEDED/);
});

test("PILLAR 1: CorrelationRiskManager prevents clustered portfolio concentrations", () => {
  const corrManager = new CorrelationRiskManager({ highCorrelationThreshold: 0.75, maxCorrelatedClusterExposure: 0.30 });
  const portfolio = {
    totalNav: 100000,
    positions: {
      AAPL: { quantity: 100, currentPrice: 150 } // $15,000 in AAPL
    }
  };

  // MSFT is highly correlated to AAPL (ρ=0.82)
  // Adding $20,000 MSFT -> $35,000 total cluster = 35% of NAV > 30% cap
  const res = corrManager.validateCorrelationRisk({
    symbol: "MSFT",
    side: "BUY",
    quantity: 100,
    price: 200,
    portfolio
  });
  assert.equal(res.approved, false);
  assert.match(res.reason, /CORRELATED_EXPOSURE_EXCEEDED/);
});

test("PILLAR 1: DrawdownController halts risk-increasing orders upon breach", () => {
  const dd = new DrawdownController({ initialNav: 100000, maxDailyLossPct: 0.03, maxTotalDrawdownPct: 0.05 });
  
  // Update NAV to 94,000 (6% drawdown from 100k HWM -> trips 5% limit)
  dd.updateNav(94000);
  assert.equal(dd.circuitTripped, true);

  // New BUY order must be rejected
  const buyCheck = dd.validateDrawdown({ symbol: "AAPL", side: "BUY", portfolio: { totalNav: 94000, positions: {} } });
  assert.equal(buyCheck.approved, false);
  assert.match(buyCheck.reason, /DRAWDOWN_CONTROLLER_HALT/);

  // Position-reducing SELL order must be allowed
  const sellCheck = dd.validateDrawdown({
    symbol: "AAPL",
    side: "SELL",
    portfolio: { totalNav: 94000, positions: { AAPL: { quantity: 50 } } }
  });
  assert.equal(sellCheck.approved, true);
});

test("PILLAR 1: CircuitBreaker halts on spread blowouts & volatility spikes", () => {
  const cb = new CircuitBreaker({ maxSpreadBps: 50, volatilityZScoreThreshold: 3.5 });

  // Spread blowout: Bid 95, Ask 105 -> ~1000 bps > 50 bps
  const res = cb.validateMarketConditions({
    symbol: "TSLA",
    price: 100,
    market: { bid: 95, ask: 105 }
  });
  assert.equal(res.approved, false);
  assert.match(res.reason, /SPREAD_BLOWOUT/);
  assert.equal(cb.isHalted("TSLA"), true);
});

test("PILLAR 1: Comprehensive RiskEngine orchestrator enforces 7 stages", async () => {
  const engine = new RiskEngine();
  const portfolio = { totalNav: 100000, cash: 100000, positions: {} };

  // Standard healthy order passes all 7 checks
  const approved = await engine.validate({
    symbol: "AAPL",
    side: "BUY",
    quantity: 20,
    price: 150,
    portfolio,
    market: { bid: 149.95, ask: 150.05, referencePrice: 150 },
    quoteTimestamp: Date.now()
  });
  assert.equal(approved.approved, true);

  // Fat finger order fails at pre-trade gate
  const rejected = await engine.validate({
    symbol: "AAPL",
    side: "BUY",
    quantity: 10000,
    price: 150,
    portfolio
  });
  assert.equal(rejected.approved, false);
  assert.equal(rejected.stage, "PRE_TRADE_VIOLATION");
});

test("PILLAR 2: Multi-Agent AI Debate System and Risk Officer contrarian evaluation", async () => {
  const debate = new AIDebateSystem();
  const market = {
    symbol: "AAPL",
    rsi: 58,
    sma20: 152,
    sma50: 148,
    vix: 16,
    sentimentScore: 0.70,
    orderBookImbalance: 0.25,
    spreadBps: 3.5
  };

  const outcome = await debate.conductDebate(market);
  assert.ok(outcome.debate.bullAgent);
  assert.ok(outcome.debate.bearAgent);
  assert.ok(outcome.judge);
  assert.equal(typeof outcome.judge.compositeScore, "number");
  assert.ok(outcome.judge.formulaBreakdown);

  // AI Risk Officer vetoes under severe volatility
  const officer = new AIRiskOfficer();
  const vetoCheck = officer.evaluateProposal({
    symbol: "TSLA",
    action: "BUY",
    confidence: 0.95, // Extreme overconfidence
    agentViews: []
  }, {
    regime: "HIGH_VOLATILITY",
    volatilityZScore: 3.8,
    dataQualityScore: 90
  });

  assert.equal(vetoCheck.veto, true);
  assert.ok(vetoCheck.reasons.length >= 2);
});

test("PILLAR 3: Confidence != Probability Calibration and Brier Score calculation", () => {
  const cal = new ConfidenceCalibrationEngine({ minSamplesForCalibration: 5 });

  // Record 6 predictions with outcomes
  const p1 = cal.recordPrediction({ prediction: "BUY", predicted_probability: 0.70 });
  const p2 = cal.recordPrediction({ prediction: "BUY", predicted_probability: 0.70 });
  const p3 = cal.recordPrediction({ prediction: "BUY", predicted_probability: 0.70 });
  const p4 = cal.recordPrediction({ prediction: "BUY", predicted_probability: 0.70 });
  const p5 = cal.recordPrediction({ prediction: "BUY", predicted_probability: 0.70 });
  const p6 = cal.recordPrediction({ prediction: "BUY", predicted_probability: 0.20 });

  // In reality, only 3 out of 5 of the 70% confidence predictions won (60% empirical hit rate)
  cal.resolveOutcome(p1, 1);
  cal.resolveOutcome(p2, 1);
  cal.resolveOutcome(p3, 1);
  cal.resolveOutcome(p4, 0);
  cal.resolveOutcome(p5, 0);
  cal.resolveOutcome(p6, 0);

  const metrics = cal.getMetrics();
  assert.equal(metrics.totalResolved, 6);
  assert.ok(metrics.brierScore >= 0 && metrics.brierScore <= 1);

  // Calibrated probability for 0.72 should reflect empirical ~0.60
  const calibrated = cal.getCalibratedProbability(0.72);
  assert.equal(calibrated, 0.6);
});

test("PILLAR 4: 13-Feature Regime Engine and Strategy Allocation Matrix", () => {
  const engine = new RegimeEngine();

  // High volatility stress inputs
  const highVol = engine.classifyRegime({
    vix: 34,
    realized_volatility: 0.35,
    credit_spread: 6.2,
    yield_curve_spread: -0.40
  });

  assert.equal(highVol.regime, "HIGH_VOLATILITY");
  assert.equal(highVol.strategyWeights.CASH, 0.40);
  assert.equal(highVol.strategyWeights.MOMENTUM, 0.05);

  // Bull regime inputs
  const bull = engine.classifyRegime({
    vix: 13,
    realized_volatility: 0.11,
    momentum: 0.05,
    market_breadth: 0.72
  });

  assert.equal(bull.regime, "BULL");
  assert.equal(bull.strategyWeights.MOMENTUM, 0.40);
});

test("PILLAR 5: Realistic Backtest Simulator and Aifie Reality Score™ Evaluator", () => {
  const sim = new RealisticBacktestSimulator();
  const book = { bid: 149.95, ask: 150.05, bidSize: 500, askSize: 500, dailyVolume: 1000000, volatility: 0.015 };
  const order = { symbol: "AAPL", side: "BUY", quantity: 200, limitPrice: 150.05 };

  const exec = sim.simulateMicrostructureExecution(order, book);
  assert.ok(exec.fillPrice >= exec.arrivalPrice);
  assert.ok(exec.fees > 0);
  assert.ok(exec.totalLatencyMs >= 70);

  const biasChecks = sim.evaluateBiasControls();
  assert.equal(biasChecks.biasControlsPassed, true);
  assert.ok(biasChecks.aggregateBiasScore > 80);

  // Reality Score™
  const reality = new RealityScoreEvaluator();
  const highGrade = reality.evaluateRealityScore({
    strategyName: "TSLA-Momentum-Pro",
    backtestScore: 94,
    walkForwardScore: 92,
    paperTradingScore: 91,
    regimeRobustScore: 88,
    costRobustScore: 89,
    dataQualityScore: 95
  });

  assert.ok(highGrade.realityScore >= 90);
  assert.equal(highGrade.status, "ELIGIBLE_FOR_SMALL_LIVE");

  const lowGrade = reality.evaluateRealityScore({
    strategyName: "Overfit-Junk",
    backtestScore: 95,
    walkForwardScore: 50,
    paperTradingScore: 55,
    regimeRobustScore: 40,
    costRobustScore: 45
  });

  assert.ok(lowGrade.realityScore < 70);
  assert.equal(lowGrade.status, "REJECTED");
});

test("PILLAR 6: Strategy Lifecycle 10-State Progression & Promotion Gates", () => {
  const mgr = new StrategyLifecycleManager();
  const strat = mgr.registerStrategy("strat_alpha_1", "Mean-Reversion-FX");
  assert.equal(strat.state, LIFECYCLE_STATES.RESEARCH);

  // Transition to BACKTEST
  mgr.transition("strat_alpha_1", LIFECYCLE_STATES.BACKTEST);
  assert.equal(mgr.getStrategy("strat_alpha_1").state, LIFECYCLE_STATES.BACKTEST);

  // Transition to PAPER fails if reality score < 75
  assert.throws(() => {
    mgr.transition("strat_alpha_1", LIFECYCLE_STATES.PAPER, { realityScore: 65 });
  }, /GATE_REJECTED/);

  // Transition to PAPER succeeds with score 82
  mgr.transition("strat_alpha_1", LIFECYCLE_STATES.PAPER, { realityScore: 82 });
  assert.equal(mgr.getStrategy("strat_alpha_1").state, LIFECYCLE_STATES.PAPER);

  // Degradation flag directly moves to QUARANTINE
  mgr.flagDegradation("strat_alpha_1", "Sharpe ratio fell below 0.5 over 30 days");
  assert.equal(mgr.getStrategy("strat_alpha_1").state, LIFECYCLE_STATES.QUARANTINE);
});

test("PILLAR 7 & 8: Event Intelligence and Structured Domain Memory Store", () => {
  const eventEngine = new EventIntelligenceEngine();
  const eventResult = eventEngine.evaluateEventImpact("TSLA", [
    { category: "EARNINGS", sentimentScore: 0.85, confidence: 0.90, headline: "Q3 Beat and record margin expansion" },
    { category: "SUPPLY_CHAIN", sentimentScore: -0.20, confidence: 0.75, headline: "Battery component shipping delay" }
  ]);

  assert.ok(eventResult.impactScore.netImpact > 0);
  assert.equal(eventResult.eventCount, 2);

  // Structured Memory Store
  const mem = new StructuredMemoryStore();
  const tradeMem = mem.recordTradeMemory({
    trade_id: "TSLA-20260905-001",
    decision: "BUY",
    symbol: "TSLA",
    regime: { name: "BULL_LOW_VOL" },
    result: { pnl: 420 }
  });

  assert.equal(tradeMem.trade_id, "TSLA-20260905-001");
  const query = mem.queryHistoricalTrades("TSLA", "BULL_LOW_VOL");
  assert.equal(query.length, 1);
});

test("PILLAR 9: Post-Trade Attribution Engine decomposes P&L correctly", () => {
  const attr = new PostTradeAttributionEngine();
  const result = attr.attributeTrade({
    symbol: "TSLA",
    side: "BUY",
    quantity: 10,
    decisionPrice: 200,
    arrivalPrice: 201, // Slippage between decision and arrival
    fillPrice: 202,    // Fill execution impact
    exitPrice: 242,    // Final exit price
    fees: 10
  });

  // Net P&L = (242 - 202) * 10 - 10 = $390
  assert.equal(result.realizedPnL.netPnL, 390);
  assert.ok(result.attribution.signalAlpha > 0);
  assert.ok(result.verification.reconciliationDiff < 0.01);
});

test("PILLAR 10 & 11: Control Center, Failure Incident Bus, and Chaos Testing Harness", async () => {
  const bus = new FailureIncidentBus();
  const inc1 = bus.reportFailure(FAILURE_TYPES.DATA_STALE, { source: "FEED_A" });
  assert.equal(inc1.failureType, FAILURE_TYPES.DATA_STALE);

  const ctrl = new ControlCenterEngine();
  const snap = ctrl.getSnapshot({ totalNav: 100000, grossExposure: 35000 });
  assert.ok(snap.system);
  assert.ok(snap.portfolio);
  assert.ok(snap.risk);

  // Chaos Harness
  const chaos = new ChaosTestingHarness();
  const report = await chaos.runChaosSuite();
  assert.equal(report.allPassedSafely, true);
  assert.equal(report.passedCount, 12);
});

test("PILLAR 12: UnifiedTradingEnginePipeline enforces independent Risk Engine gate", async () => {
  const pipeline = new UnifiedTradingEnginePipeline();
  
  // Pipeline cycle with normal parameters executes through risk engine
  const res = await pipeline.executeTradingCycle({
    symbol: "AAPL",
    side: "buy",
    rawSignal: { confidence: 85 },
    account: { cash: 100000, equity: 100000 },
    marketQuote: { price: 150.0, timestamp: Date.now() }
  });

  if (res.status !== "EXECUTING_ALGORITHMIC_SLICER") {
    console.error("DEBUG PIPELINE REJECTION:", JSON.stringify(res, null, 2));
  }
  assert.equal(res.status, "EXECUTING_ALGORITHMIC_SLICER");
  assert.ok(res.schedule);
});
