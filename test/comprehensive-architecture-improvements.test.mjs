// test/comprehensive-architecture-improvements.test.mjs
// Comprehensive Institutional Test Suite: 12 Architecture, Intelligence, Risk, Data, Execution & Security Pillars
// Pure Native Node.js ESM built-ins only

import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

// Pillar Singletons
import { agentReasoningLoop } from "../src/agent/agent-reasoning-reflection-loop.mjs";
import { institutionalRiskFortress } from "../src/risk/institutional-risk-fortress.mjs";
import { marketDataReconciliationEngine } from "../src/data/market-data-reconciliation-engine.mjs";
import { institutionalBacktestValidator } from "../src/backtest/institutional-backtest-validator.mjs";
import { algorithmicExecutionSlicer } from "../src/execution/algorithmic-execution-slicer.mjs";
import { systemReliabilityWatchdog } from "../src/reliability/system-reliability-watchdog.mjs";
import { institutionalMetricsExporter } from "../src/observability/institutional-metrics-exporter.mjs";
import { securityAuthorizationGate, SecurityAuthorizationGate } from "../src/security/security-authorization-gate.mjs";
import { unifiedTradingEnginePipeline } from "../src/core/unified-trading-engine-pipeline.mjs";

test("Pillar 1 (Architecture Audit): All authoritative domain singletons instantiate with telemetry", () => {
  assert.ok(agentReasoningLoop.getTelemetry());
  assert.ok(institutionalRiskFortress.getTelemetry());
  assert.ok(algorithmicExecutionSlicer.getTelemetry());
  assert.ok(systemReliabilityWatchdog.evaluateSystemHealth());
});

test("Pillar 2 (Agent Intelligence): Pre-flight validation, outcome reflection, and self-correction loop", () => {
  // 1. Pre-flight sanity validation
  const validCheck = agentReasoningLoop.validateToolPreFlight("run_monte_carlo_sim", { paths: 1000 }, {
    required: ["paths"],
    properties: { paths: { type: "number" } }
  });
  assert.equal(validCheck.approved, true);

  const invalidCheck = agentReasoningLoop.validateToolPreFlight("run_monte_carlo_sim", {}, {
    required: ["paths"]
  });
  assert.equal(invalidCheck.approved, false);
  assert.ok(invalidCheck.reason.includes("MISSING_REQUIRED_ARGUMENT"));

  // 2. Reflective Outcome Evaluation & Self-Correction Plan
  const errorOutcome = { success: false, error: "EXCHANGE_TIMEOUT_ETIMEDOUT" };
  const reflection = agentReasoningLoop.evaluateToolOutcome("run_monte_carlo_sim", errorOutcome);
  assert.equal(reflection.verified, false);
  assert.equal(reflection.requiresCorrection, true);
  assert.ok(reflection.reflection.correctionPlan);
  assert.equal(reflection.reflection.correctionPlan.fallbackTool, "execute_macro_scenario_stress_test");

  // 3. Epistemic working memory
  agentReasoningLoop.setWorkingMemory("CURRENT_REGIME", "HIGH_VOL_CHOP", { confidence: 0.92 });
  const memory = agentReasoningLoop.getWorkingMemory("CURRENT_REGIME");
  assert.equal(memory.value, "HIGH_VOL_CHOP");
  assert.equal(memory.confidence, 0.92);
});

test("Pillar 3 & 4 (Risk Fortress & Trading Engine): Hard limits, drawdown stops, and stale data rejection", async () => {
  const now = Date.now();

  // Test Stale Data Rejection (> 5000 ms old)
  const staleCheck = institutionalRiskFortress.evaluatePreTradeRisk({
    order: { symbol: "AAPL", quantity: 10, price: 150 },
    account: { cash: 100000, equity: 100000 },
    positions: {},
    marketQuote: { price: 150, timestamp: now - 8000 }, // 8 seconds old
    now
  });
  assert.equal(staleCheck.approved, false);
  assert.equal(staleCheck.reason, "STALE_DATA_REJECTION");

  // Test Hard Order Notional Limit ($20,000 max)
  const hugeOrderCheck = institutionalRiskFortress.evaluatePreTradeRisk({
    order: { symbol: "AAPL", quantity: 200, price: 150 }, // $30,000 notional
    account: { cash: 100000, equity: 100000 },
    positions: {},
    marketQuote: { price: 150, timestamp: now - 500 },
    now
  });
  assert.equal(hugeOrderCheck.approved, false);
  assert.equal(hugeOrderCheck.reason, "HARD_ORDER_NOTIONAL_EXCEEDED");

  // Test Clean Approval
  const validCheck = institutionalRiskFortress.evaluatePreTradeRisk({
    order: { symbol: "AAPL", quantity: 20, price: 150 }, // $3,000 notional
    account: { cash: 100000, equity: 100000 },
    positions: {},
    marketQuote: { price: 150, timestamp: now - 200 },
    now
  });
  assert.equal(validCheck.approved, true);

  // Test End-to-End Unified Pipeline
  const pipelineRes = await unifiedTradingEnginePipeline.executeTradingCycle({
    symbol: "AAPL",
    side: "buy",
    rawSignal: { confidence: 88 },
    account: { cash: 100000, equity: 100000 },
    marketQuote: { price: 150, timestamp: now },
    executionAlgorithm: "TWAP"
  });
  assert.equal(pipelineRes.status, "EXECUTING_ALGORITHMIC_SLICER");
  assert.ok(pipelineRes.schedule.scheduleId);
  assert.ok(pipelineRes.schedule.firstTranche);
});

test("Pillar 5 (Data Layer): Candle gap detection and cross-venue price reconciliation", () => {
  // 1. Candle sequence gap audit
  const regularCandles = [
    { timestamp: 1700000000000, open: 100, close: 101 },
    { timestamp: 1700000060000, open: 101, close: 102 },
    { timestamp: 1700000120000, open: 102, close: 103 }
  ];
  const auditRes = marketDataReconciliationEngine.auditCandleSequence(regularCandles, 60000);
  assert.equal(auditRes.valid, true);
  assert.equal(auditRes.gapsDetected, 0);
  assert.ok(auditRes.dataQualityIndex >= 90);

  // 2. Cross-venue quote reconciliation
  const multiQuotes = [
    { venue: "Binance", price: 65000 },
    { venue: "Coinbase", price: 65010 },
    { venue: "Kraken", price: 64995 },
    { venue: "OKX", price: 65005 }
  ];
  const reconciled = marketDataReconciliationEngine.reconcileCrossVenueQuotes("BTC", multiQuotes);
  assert.equal(reconciled.venuesCount, 4);
  assert.ok(Math.abs(reconciled.reconciledPrice - 65002.5) < 5);
  assert.equal(reconciled.isCoherent, true);
  assert.ok(reconciled.dataQualityIndex >= 85);
});

test("Pillar 6 (Backtesting): Bias-free simulation with point-in-time buffers and volume caps", () => {
  // Generate synthetic candles
  const candles = [];
  let price = 100.0;
  for (let i = 0; i < 30; i++) {
    price += (i % 2 === 0 ? 0.8 : -0.5);
    candles.push({
      time: i * 60000,
      open: price,
      high: price + 0.5,
      low: price - 0.5,
      close: price + 0.2,
      volume: 500
    });
  }

  const result = institutionalBacktestValidator.simulateStrategy({
    candles,
    initialCapital: 50000,
    symbol: "NVDA"
  });

  assert.equal(result.symbol, "NVDA");
  assert.equal(result.lookAheadBiasFree, true);
  assert.equal(result.liquidityVolumeCapped, true);
  assert.ok(typeof result.annualizedSharpe === "number");
  assert.ok(typeof result.totalReturnPercent === "number");
});

test("Pillar 7 (Execution): Institutional Implementation Shortfall cost decomposition", () => {
  const cost = algorithmicExecutionSlicer.decomposeExecutionCost({
    arrivalPrice: 150.0,
    fillPrice: 150.25,
    quantity: 200,
    side: "buy",
    dailyVolume: 2000000,
    dailyVolatility: 0.02
  });

  assert.equal(cost.arrivalPrice, 150.0);
  assert.equal(cost.fillPrice, 150.25);
  assert.equal(cost.totalShortfallUSD, 50.0); // (150.25 - 150.00) * 200 = 50.00
  assert.ok(cost.totalShortfallBps > 0);
  assert.ok(cost.decomposition.halfSpreadUSD > 0);
  assert.ok(cost.decomposition.temporaryImpactUSD > 0);
  assert.ok(cost.efficiencyScore > 0);
});

test("Pillar 8 (Reliability & Recovery): Watchdog dead-man switch and state checksum audit", () => {
  // Heartbeat verification
  const ack = systemReliabilityWatchdog.recordHeartbeat("TEST_RUNNER");
  assert.equal(ack.status, "HEARTBEAT_ACK");

  const healthNow = systemReliabilityWatchdog.evaluateSystemHealth(Date.now());
  assert.equal(healthNow.systemHealth, "OPTIMAL");
  assert.equal(healthNow.deadManTriggered, false);

  // Dead-man switch trigger simulation (simulate 40 seconds of silence)
  const deadManHealth = systemReliabilityWatchdog.evaluateSystemHealth(Date.now() + 40000);
  assert.equal(deadManHealth.deadManTriggered, true);
  assert.equal(deadManHealth.systemHealth, "DEGRADED");

  // Recovery upon heartbeat
  systemReliabilityWatchdog.recordHeartbeat("OPERATOR_RESUME");
  const recovered = systemReliabilityWatchdog.evaluateSystemHealth(Date.now());
  assert.equal(recovered.deadManTriggered, false);

  // SHA-256 state integrity verification
  const statePath = join(process.cwd(), "data", "aifie-state.json");
  const stateAudit = systemReliabilityWatchdog.verifyStateIntegrity(statePath);
  if (stateAudit.valid) {
    assert.equal(stateAudit.status, "CHECKSUM_VERIFIED");
    assert.ok(stateAudit.sha256.length === 64);
  }
});

test("Pillar 9 (Observability): Prometheus /metrics scrape and multi-factor PnL attribution", () => {
  institutionalMetricsExporter.recordExecutionLatency(2.45);
  institutionalMetricsExporter.recordExecutionLatency(4.12);
  institutionalMetricsExporter.recordRejection("HARD_ORDER_NOTIONAL_EXCEEDED");
  institutionalMetricsExporter.updatePortfolioSnapshot({ nav: 104500, realizedPnL: 4500, unrealizedPnL: 850 });

  const metrics = institutionalMetricsExporter.generatePrometheusMetrics();
  assert.ok(metrics.includes("aifie_portfolio_nav_usd 104500.00"));
  assert.ok(metrics.includes("aifie_realized_pnl_usd 4500.00"));
  assert.ok(metrics.includes("aifie_execution_latency_ms{quantile="));
  assert.ok(metrics.includes("aifie_risk_gate_rejections_total{reason="));

  const attr = institutionalMetricsExporter.attributePnL({
    grossPnL: 2000,
    benchmarkMarketReturn: 0.01,
    portfolioBeta: 1.0,
    portfolioCapital: 100000,
    totalSlippageUSD: 50,
    totalCommissionsUSD: 20
  });
  assert.equal(attr.grossPnLUSD, 2000);
  assert.equal(attr.netPnLUSD, 1930); // 2000 - 50 - 20
  assert.equal(attr.factors.marketBetaDriftUSD, 1000); // 0.01 * 1.0 * 100000 = 1000
  assert.equal(attr.factors.alphaPnLUSD, 1000); // 2000 - 1000 = 1000
});

test("Pillar 10 (Security & RBAC): Bearer token authentication and Telegram user authorization", () => {
  const gate = new SecurityAuthorizationGate({
    apiKey: "AIFIE_SUPER_SECRET_KEY_123",
    adminChatId: "987654321",
    authorizedTelegramUsers: ["11223344", "55667788"]
  });

  // 1. HTTP Bearer Auth
  const unauthReq = { headers: {} };
  const failRes = gate.authenticateHttpRequest(unauthReq);
  assert.equal(failRes.authenticated, false);
  assert.equal(failRes.status, 401);

  const invalidReq = { headers: { authorization: "Bearer WRONG_KEY" } };
  const invalidRes = gate.authenticateHttpRequest(invalidReq);
  assert.equal(invalidRes.authenticated, false);
  assert.equal(invalidRes.status, 403);

  const validReq = { headers: { authorization: "Bearer AIFIE_SUPER_SECRET_KEY_123" } };
  const validRes = gate.authenticateHttpRequest(validReq);
  assert.equal(validRes.authenticated, true);

  // 2. Telegram RBAC
  const guestStart = gate.authorizeTelegramUser("999999", "/start");
  assert.equal(guestStart.authorized, true); // Public command allowed

  const unauthorizedTrading = gate.authorizeTelegramUser("999999", "/buy");
  assert.equal(unauthorizedTrading.authorized, false);
  assert.equal(unauthorizedTrading.role, "UNAUTHORIZED");

  const authorizedTrading = gate.authorizeTelegramUser("11223344", "/buy");
  assert.equal(authorizedTrading.authorized, true);
  assert.equal(authorizedTrading.role, "AUTHORIZED_TRADER");

  const adminTrading = gate.authorizeTelegramUser("987654321", "/mitigate");
  assert.equal(adminTrading.authorized, true);
  assert.equal(adminTrading.role, "SUPER_ADMIN");

  // 3. Secret Masking
  const rawLog = "Connecting with token 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789 to execute order";
  const masked = gate.maskSecrets(rawLog);
  assert.ok(masked.includes("[REDACTED_TELEGRAM_TOKEN]"));
  assert.ok(!masked.includes("123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789"));
});
