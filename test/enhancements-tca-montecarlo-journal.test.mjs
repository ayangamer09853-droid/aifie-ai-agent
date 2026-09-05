// test/enhancements-tca-montecarlo-journal.test.mjs
// Test Suite: Institutional Upgrades (TCA, Monte Carlo Ruin Engine, Persistent Event Journal)

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AifieEventBus } from "../src/core/event-bus-replay.mjs";
import { MonteCarloRuinEngine } from "../src/research/monte-carlo-ruin-engine.mjs";
import { TransactionCostAnalyzer } from "../src/execution/transaction-cost-analyzer.mjs";

describe("Institutional Enhancements: Journaling, TCA & Monte Carlo", () => {
  const testJournalPath = path.join(process.cwd(), "data", "test_event_journal.jsonl");

  after(() => {
    if (fs.existsSync(testJournalPath)) {
      try {
        fs.unlinkSync(testJournalPath);
      } catch {}
    }
  });

  it("1. Persistent Disk Event Journal: writes to disk and performs cold-start replay from disk", async () => {
    const bus = new AifieEventBus({
      enableDiskJournal: true,
      journalPath: testJournalPath,
      maxLogSize: 50
    });

    const corrId = "corr_cold_disk_001";
    bus.emit("MARKET_TICK", "BINANCE_WS", corrId, { symbol: "BTCUSDT", price: 65100.0 });
    bus.emit("FEATURE_UPDATE", "FEATURE_STORE", corrId, { features: { rsi: 44.5, vpin: 0.12 } });
    bus.emit("SIGNAL_CREATED", "alpha_trend_v12", corrId, { direction: "BUY", confidence: 0.82, rationale: "EMA breakout" });
    bus.emit("TRADE_INTENT_CREATED", "DECISION_GOVERNOR", corrId, {
      id: "ti_test_1",
      symbol: "BTCUSDT",
      side: "BUY",
      confidence: 0.82,
      entry: 65100.0,
      stopLoss: 64500.0,
      takeProfit: 66500.0,
      maxPosition: 50000
    });
    bus.emit("RISK_CHECK_STARTED", "INDEPENDENT_RISK_FORTRESS", corrId, {});
    bus.emit("RISK_APPROVED", "INDEPENDENT_RISK_FORTRESS", corrId, { approvedSize: 25000, var99: 450 });
    bus.emit("ORDER_SUBMITTED", "EXECUTION_ROUTER", corrId, { orderId: "ord_101" });
    bus.emit("ORDER_FILLED", "BINANCE_ADAPTER", corrId, {
      orderId: "ord_101",
      filledPrice: 65102.5,
      filledQuantity: 0.38,
      slippageBps: 0.38
    });

    // Flush to disk
    bus.flushDiskJournalSync();
    assert.ok(fs.existsSync(testJournalPath), "Journal file should be created on disk");

    const content = fs.readFileSync(testJournalPath, "utf-8").trim();
    const lines = content.split("\n");
    assert.equal(lines.length, 8, "Expected 8 serialized JSON events written to disk");

    // Clear RAM cache to simulate cold-restart
    bus.clear();
    assert.equal(bus.eventLog.length, 0, "RAM log should be empty");

    // Replay from disk
    const diskReplay = await bus.replayTradeDecisionAsync(corrId);
    assert.ok(diskReplay.found, "Replay should successfully find events on disk");
    assert.equal(diskReplay.totalEvents, 8);
    assert.equal(diskReplay.causalityReport.symbol, "BTCUSDT");
    assert.equal(diskReplay.causalityReport.riskDecision.status, "APPROVED");
    assert.equal(diskReplay.causalityReport.execution.status, "FILLED");
    assert.equal(diskReplay.causalityReport.execution.filledPrice, 65102.5);
  });

  it("2. Monte Carlo Ruin Engine: computes ruin probabilities, quantile drawdowns, and safe leverage", () => {
    const profitableReturns = [
      0.015, -0.008, 0.022, 0.005, -0.012, 0.018, -0.004, 0.009, 0.025, -0.015,
      0.007, -0.006, 0.014, -0.011, 0.030, -0.020, 0.008, 0.012, -0.005, 0.019
    ];

    const report = MonteCarloRuinEngine.simulate({
      returns: profitableReturns,
      initialCapital: 100000,
      simulations: 2000,
      horizon: 100,
      ruinThreshold: 0.25,
      leverage: 1.0
    });

    assert.equal(report.simulations, 2000);
    assert.equal(report.horizon, 100);
    assert.ok(report.metrics.probabilityOfRuin < 0.05, "Profitable strategy should have low ruin probability");
    assert.ok(report.passAudit, "Should pass audit with low ruin probability");
    assert.ok(report.metrics.safeLeverageMultiplier >= 0.2, "Should calculate positive safe leverage");
    assert.ok(
      report.metrics.drawdownQuantiles.p50 <= report.metrics.drawdownQuantiles.p95 &&
      report.metrics.drawdownQuantiles.p95 <= report.metrics.drawdownQuantiles.p99,
      "Drawdown quantiles must be monotonically increasing"
    );

    // Stress test: ruinous strategy with persistent losses
    const losingReturns = [-0.05, -0.04, -0.03, -0.06, 0.01, -0.02];
    const stressReport = MonteCarloRuinEngine.simulate({
      returns: losingReturns,
      initialCapital: 100000,
      simulations: 500,
      horizon: 100,
      ruinThreshold: 0.20
    });
    assert.ok(stressReport.metrics.probabilityOfRuin > 0.50, "Losing strategy should experience high ruin probability");
    assert.equal(stressReport.passAudit, false, "Should fail audit on ruinous strategy");
    assert.ok(stressReport.recommendedAction.includes("HALT") || stressReport.recommendedAction.includes("THROTTLE"));
  });

  it("3. Transaction Cost Analyzer: decomposes half-spread, market impact, latency drag, and commissions", () => {
    // BUY order where:
    // Arrival mid-price = $100.00
    // Router submission mid-price = $100.02 (latency delay = +$0.02 = 2 bps)
    // Quoted bid = $99.98, ask = $100.06 (spread = $0.08, half-spread = $0.04)
    // Execution price = $100.08 (slippage over sub = $0.06, beyond half-spread = $0.02 market impact)
    // Fee = 2 bps (0.0002 * 100.08 * 1000 = $20.016)
    const tca = TransactionCostAnalyzer.analyzeOrder({
      side: "BUY",
      quantity: 1000,
      arrivalPrice: 100.00,
      submissionPrice: 100.02,
      bidPrice: 99.98,
      askPrice: 100.06,
      executedPrice: 100.08,
      feeBps: 2.0
    });

    assert.equal(tca.side, "BUY");
    assert.equal(tca.quantity, 1000);
    assert.equal(tca.notionalArrival, 100000.00);
    assert.equal(tca.breakdown.latencyCost, 20.00); // 1000 * $0.02
    assert.equal(tca.breakdown.latencyBps, 2.00);
    assert.equal(tca.breakdown.halfSpreadCost, 40.00); // 1000 * $0.04
    assert.equal(tca.breakdown.halfSpreadBps, 4.00);
    assert.equal(tca.breakdown.impactCost, 20.00); // 1000 * ($0.06 - $0.04)
    assert.equal(tca.breakdown.impactBps, 2.00);
    assert.ok(tca.totalShortfallCost >= 100, "Total shortfall includes latency + spread + impact + fee");
    assert.equal(tca.totalShortfallBps, 10.0, "Total shortfall bps calculated accurately");
    assert.ok(tca.dragRating.length > 0);
  });

  it("4. TCA Portfolio Aggregation: computes volume-weighted shortfall and cost attribution", () => {
    const orders = [
      TransactionCostAnalyzer.analyzeOrder({
        side: "BUY",
        quantity: 10,
        arrivalPrice: 50000,
        submissionPrice: 50000,
        bidPrice: 49995,
        askPrice: 50005,
        executedPrice: 50005,
        feeBps: 2.0
      }),
      TransactionCostAnalyzer.analyzeOrder({
        side: "SELL",
        quantity: 10,
        arrivalPrice: 50000,
        submissionPrice: 50000,
        bidPrice: 49995,
        askPrice: 50005,
        executedPrice: 49995,
        feeBps: 2.0
      })
    ];

    const agg = TransactionCostAnalyzer.aggregate(orders);
    assert.equal(agg.totalOrders, 2);
    assert.equal(agg.totalNotional, 1000000.00);
    assert.ok(agg.totalShortfallCost > 0);
    assert.ok(agg.averageShortfallBps > 0);
    assert.ok(agg.attributionPercentages.spread >= 0);
    assert.ok(agg.attributionPercentages.fees >= 0);
  });

  it("5. System Diagnostics: inspects working processes across all 8 hard boundaries and reports alerts", async () => {
    const { SystemDiagnostics } = await import("../src/observability/system-diagnostics.mjs");
    const diag = SystemDiagnostics.runDiagnostics();

    assert.ok(diag.overallStatus, "Must include overallStatus");
    assert.equal(typeof diag.totalIssues, "number");
    assert.ok(diag.workingProcesses, "Must include workingProcesses");

    const planes = [
      "DATA_PLANE",
      "FEATURE_PLANE",
      "ALPHA_PLANE",
      "DECISION_PLANE",
      "RISK_PLANE",
      "EXECUTION_PLANE",
      "AUDIT_PLANE",
      "OBSERVABILITY_PLANE"
    ];

    for (const p of planes) {
      assert.ok(diag.workingProcesses[p], `Working process must exist for ${p}`);
      assert.ok(diag.workingProcesses[p].step, `Step must exist for ${p}`);
      assert.ok(diag.workingProcesses[p].description, `Description must exist for ${p}`);
      assert.ok(diag.workingProcesses[p].status, `Status must exist for ${p}`);
    }
  });

  it("6. Consolidated V1 Gateway: dispatches /api/v1/system/diagnostics and /api/v1/system/errors", async () => {
    const { dispatchV1Route } = await import("../src/api/v1-router.mjs");

    const diagRes = dispatchV1Route("/api/v1/system/diagnostics", "GET");
    assert.equal(diagRes.status, 200);
    assert.equal(diagRes.plane, "SYSTEM_DIAGNOSTICS");
    assert.ok(diagRes.data.workingProcesses);

    const errRes = dispatchV1Route("/api/v1/system/errors", "GET");
    assert.equal(errRes.status, 200);
    assert.ok(Array.isArray(errRes.data.activeAlerts));
  });
});
