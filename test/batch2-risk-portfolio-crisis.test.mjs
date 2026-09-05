import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  independentRiskFortress,
  auditTradeProposal,
  calculateKellyPositionSize,
  getIndependentRiskStatus,
  triggerRiskEmergencyHalt,
  resetRiskEmergencyHalt,
  recordTradePnl,
  IMMUTABLE_RISK_LIMITS
} from "../src/independent-risk-fortress.mjs";
import {
  computeCovarianceMatrix,
  calculatePortfolioVaRAndCVaR,
  calculateEulerRiskContributions,
  evaluatePortfolioImprovement
} from "../src/institutional-portfolio-optimizer.mjs";
import {
  runFlashCrashSimulation,
  runLiquidityCollapseSimulation,
  runDataCorruptionSimulation,
  getCrisisSimulatorStatus,
  CRISIS_SCENARIOS
} from "../src/crisis-fault-simulator.mjs";
import { app } from "../server.mjs";

test("Batch 2: Independent Risk Fortress Immutable Limits & Hard Ceilings", () => {
  independentRiskFortress.reset();
  independentRiskFortress.setDailyStartingEquity(100000);

  // 1. Immutability check
  assert.ok(Object.isFrozen(IMMUTABLE_RISK_LIMITS));
  assert.throws(() => {
    // @ts-ignore
    IMMUTABLE_RISK_LIMITS.MAX_DAILY_DRAWDOWN_PCT = 10.0;
  }, TypeError);

  // 2. Normal proposal under limits is approved
  const normalRes = auditTradeProposal({
    symbol: "BTCUSDT",
    side: "BUY",
    proposedSizeUsd: 10000,
    estimatedSlippageBps: 4.0,
    leverage: 1.0,
    existingPortfolioState: { equityUsd: 100000, symbolExposureUsd: 0, totalExposureUsd: 20000, drawdownPct: 0.2 }
  });
  assert.equal(normalRes.decision, "APPROVED");
  assert.equal(normalRes.approvedSizeUsd, 10000);

  // 3. Excess leverage (> 1.0x) is rejected
  const levRes = auditTradeProposal({
    symbol: "BTCUSDT",
    side: "BUY",
    proposedSizeUsd: 5000,
    leverage: 2.5,
    existingPortfolioState: { equityUsd: 100000 }
  });
  assert.equal(levRes.decision, "REJECTED");
  assert.ok(levRes.reasons.some(r => r.includes("LEVERAGE_2.5X_EXCEEDS")));

  // 4. Excessive slippage (> 35 bps) is rejected
  const slipRes = auditTradeProposal({
    symbol: "SOLUSDT",
    side: "BUY",
    proposedSizeUsd: 5000,
    estimatedSlippageBps: 50.0,
    existingPortfolioState: { equityUsd: 100000 }
  });
  assert.equal(slipRes.decision, "REJECTED");
  assert.ok(slipRes.reasons.some(r => r.includes("SLIPPAGE_50BPS_EXCEEDS")));

  // 5. Single order size > $25,000 is modified/sliced down
  const bigOrderRes = auditTradeProposal({
    symbol: "ETHUSDT",
    side: "BUY",
    proposedSizeUsd: 40000,
    existingPortfolioState: { equityUsd: 250000, symbolExposureUsd: 0, totalExposureUsd: 10000 }
  });
  assert.equal(bigOrderRes.decision, "MODIFIED");
  assert.equal(bigOrderRes.approvedSizeUsd, 25000);

  // 6. Max position size (15% = $15,000) is enforced
  const maxPosRes = auditTradeProposal({
    symbol: "AAPL",
    side: "BUY",
    proposedSizeUsd: 10000,
    existingPortfolioState: { equityUsd: 100000, symbolExposureUsd: 12000, totalExposureUsd: 30000 }
  });
  assert.equal(maxPosRes.decision, "MODIFIED");
  assert.equal(maxPosRes.approvedSizeUsd, 3000); // 15,000 - 12,000

  // 7. Max portfolio exposure (85%, 15% cash minimum) is enforced
  const cashRes = auditTradeProposal({
    symbol: "NVDA",
    side: "BUY",
    proposedSizeUsd: 10000,
    existingPortfolioState: { equityUsd: 100000, symbolExposureUsd: 0, totalExposureUsd: 82000 }
  });
  assert.equal(cashRes.decision, "MODIFIED");
  assert.equal(cashRes.approvedSizeUsd, 3000); // 85,000 - 82,000

  // 8. Consecutive losses trigger 2-hour cooldown
  for (let i = 0; i < 5; i++) {
    recordTradePnl(-200);
  }
  const cooldownRes = auditTradeProposal({ symbol: "BTCUSDT", proposedSizeUsd: 1000 });
  assert.equal(cooldownRes.decision, "REJECTED");
  assert.ok(cooldownRes.reasons.some(r => r.includes("CONSECUTIVE_LOSSES_COOLDOWN")));
});

test("Batch 2: Multi-Factor Adjusted Kelly Position Sizing", () => {
  const kelly = calculateKellyPositionSize({
    winProbability: 0.65,
    winLossRatio: 2.0,
    annualizedVolatilityPct: 35.0, // Mild vol penalty
    currentPortfolioDrawdownPct: 1.0,
    correlatedGroupExposurePct: 15.0,
    bidAskSpreadBps: 6.0,
    portfolioEquityUsd: 100000
  });

  assert.ok(kelly.rawKellyPct > 20); // ~47.5%
  assert.ok(kelly.fractionalKellyPct > 5); // 0.25 of raw ~11.8%
  assert.ok(kelly.adjustments.volatilityAdjustment < 1.0);
  assert.ok(kelly.adjustments.drawdownAdjustment < 1.0);
  assert.ok(kelly.adjustments.correlationAdjustment < 1.0);
  assert.ok(kelly.finalPositionFractionPct <= IMMUTABLE_RISK_LIMITS.MAX_POSITION_SIZE_PCT);
  assert.ok(kelly.recommendedPositionUsd > 1000);
  assert.ok(kelly.recommendedPositionUsd <= IMMUTABLE_RISK_LIMITS.MAX_SINGLE_ORDER_USD);
});

test("Batch 2: Institutional Portfolio Optimizer with CVaR 99% & Marginal Risk", () => {
  const mockReturns = {
    AAPL: [0.01, -0.005, 0.02, 0.015, -0.01, 0.005, 0.008, -0.003],
    NVDA: [0.02, -0.015, 0.035, 0.025, -0.02, 0.01, 0.018, -0.008],
    BTC: [0.03, -0.025, 0.045, 0.030, -0.035, 0.015, 0.025, -0.015]
  };

  // 1. Covariance Matrix & Shrinkage
  const covRes = computeCovarianceMatrix(mockReturns);
  assert.equal(covRes.assets.length, 3);
  assert.equal(covRes.matrix.length, 3);
  assert.equal(covRes.correlations[0][0], 1.0);
  assert.ok(covRes.correlations[0][1] > 0);

  // 2. VaR 99% and CVaR 99% (Expected Shortfall)
  const weights = [0.40, 0.35, 0.25];
  const expectedReturns = [0.08, 0.14, 0.22];
  const riskMetrics = calculatePortfolioVaRAndCVaR(weights, covRes.matrix, expectedReturns, 0.99);

  assert.ok(riskMetrics.var99Pct > 0);
  assert.ok(riskMetrics.cvar99Pct > riskMetrics.var99Pct, "CVaR 99% must strictly exceed VaR 99%");
  assert.ok(riskMetrics.expectedShortfallMultiplier >= 2.5);

  // 3. Euler Marginal Risk Contributions
  const euler = calculateEulerRiskContributions(weights, covRes.matrix);
  assert.equal(euler.length, 3);
  const totalPctRC = euler.reduce((acc, c) => acc + c.percentageRiskContribution, 0);
  assert.ok(Math.abs(totalPctRC - 100) < 0.5, "Euler risk contributions must sum to 100%");

  // 4. Portfolio Improvement Evaluator
  const evalRes = evaluatePortfolioImprovement({
    candidateSymbol: "BTCUSDT",
    candidateWeight: 0.10,
    candidateExpectedReturn: 0.15,
    candidateVol: 0.40,
    correlationWithPortfolio: 0.20 // Low correlation adds diversification
  });

  assert.equal(evalRes.verdict, "ENHANCES_PORTFOLIO");
  assert.ok(evalRes.deltaSharpe > 0);
  assert.ok(evalRes.allocatedWeightPct > 0);
  assert.ok(evalRes.cashReserveWeightPct >= 15);
});

test("Batch 2: Crisis & Fault Injection Simulator Replay", () => {
  resetRiskEmergencyHalt();

  // 1. Flash Crash Replay (-15% drop, VPIN spike > 0.65)
  const flashCrash = runFlashCrashSimulation({ symbol: "BTCUSDT", startingPrice: 88000 });
  assert.equal(flashCrash.scenario, CRISIS_SCENARIOS.FLASH_CRASH);
  assert.equal(flashCrash.totalPriceDropPct, -15.0);
  assert.ok(flashCrash.peakVpin >= 0.65);
  assert.equal(flashCrash.emergencyHaltTriggered, true);
  assert.equal(flashCrash.regimeDetected, "CRISIS");
  assert.equal(flashCrash.simulationPassed, true);

  // 2. Liquidity Collapse Replay (spread > 300 bps)
  const liqCollapse = runLiquidityCollapseSimulation({ symbol: "ETHUSDT" });
  assert.equal(liqCollapse.scenario, CRISIS_SCENARIOS.LIQUIDITY_COLLAPSE);
  assert.equal(liqCollapse.isEmergencyHalt, true);

  // 3. Data Corruption Burst Replay
  const dataBurst = runDataCorruptionSimulation({ symbol: "SOLUSDT" });
  assert.equal(dataBurst.scenario, CRISIS_SCENARIOS.DATA_CORRUPTION_BURST);
  assert.equal(dataBurst.allRejectedCorrectly, true);
  assert.equal(dataBurst.totalRejected, 4);

  // Reset halt for subsequent tests
  resetRiskEmergencyHalt();
});

test("Batch 2: REST API Endpoints for Risk Fortress, Portfolio CVaR, and Crisis Simulator", async () => {
  resetRiskEmergencyHalt();
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    // 1. Risk Fortress Status
    const statusRes = await fetch(`http://127.0.0.1:${port}/api/v100/risk-fortress/status`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.engine, "INDEPENDENT_RISK_FORTRESS_v100");
    assert.equal(statusData.immutableLimits.MAX_DAILY_DRAWDOWN_PCT, 3.0);

    // 2. Audit Proposal Endpoint
    const auditRes = await fetch(`http://127.0.0.1:${port}/api/v100/risk-fortress/audit-proposal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: "BTCUSDT",
        proposedSizeUsd: 8000,
        estimatedSlippageBps: 3.5,
        leverage: 1.0,
        existingPortfolioState: { equityUsd: 100000 }
      })
    });
    assert.equal(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.equal(auditData.decision, "APPROVED");

    // 3. Kelly Sizing Endpoint
    const kellyRes = await fetch(`http://127.0.0.1:${port}/api/v100/risk-fortress/kelly-size`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ winProbability: 0.60, winLossRatio: 1.8, portfolioEquityUsd: 100000 })
    });
    assert.equal(kellyRes.status, 200);
    const kellyData = await kellyRes.json();
    assert.ok(kellyData.recommendedPositionUsd > 0);

    // 4. Portfolio CVaR Metrics Endpoint
    const cvarRes = await fetch(`http://127.0.0.1:${port}/api/v100/portfolio/cvar-metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        weights: [0.5, 0.5],
        covMatrix: [[0.04, 0.01], [0.01, 0.04]],
        expectedReturns: [0.10, 0.12]
      })
    });
    assert.equal(cvarRes.status, 200);
    const cvarData = await cvarRes.json();
    assert.ok(cvarData.cvar99Pct > cvarData.var99Pct);

    // 5. Portfolio Improvement Evaluator Endpoint
    const evalRes = await fetch(`http://127.0.0.1:${port}/api/v100/portfolio/evaluate-improvement`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateSymbol: "SOLUSDT", candidateWeight: 0.08, correlationWithPortfolio: 0.3 })
    });
    assert.equal(evalRes.status, 200);
    const evalData = await evalRes.json();
    assert.ok(evalData.verdict);

    // 6. Crisis Simulation Replay Endpoint
    const crisisRes = await fetch(`http://127.0.0.1:${port}/api/v100/crisis/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario: "FLASH_CRASH", symbol: "BTCUSDT" })
    });
    assert.equal(crisisRes.status, 200);
    const crisisData = await crisisRes.json();
    assert.equal(crisisData.simulationPassed, true);
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
    resetRiskEmergencyHalt();
  }
});
