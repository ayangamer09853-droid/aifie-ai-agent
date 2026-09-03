import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

// Timeseries Store
import {
  recordMarketTick,
  getCandleBars,
  getTickHistory,
  computeSessionVwap,
  getTimeseriesStoreStatus
} from "../src/timeseries-market-store.mjs";

// Strategy Validation Pipeline
import {
  calculateDeflatedSharpeRatio,
  runHansenSpaTest,
  evaluateCpcvPaths,
  evaluateStrategyPromotionGate
} from "../src/strategy-validation-pipeline.mjs";

// Portfolio Risk Fortress
import {
  calculateValueAtRiskMetrics,
  calculateEulerRiskBudgeting,
  calculateHierarchicalRiskParity,
  evaluateDefensiveHedging
} from "../src/portfolio-risk-fortress.mjs";

// Multi-Broker Suite
import {
  routeOrderThroughSor,
  generateTwapOrderSlices,
  generateIcebergOrderPlan,
  verifyBrokerConnectivityStatus
} from "../src/broker-adapters-suite.mjs";

// Self-Evolving Swarm
import {
  synthesizeStrategyGenome,
  adaptPolicyParametersFromRewards,
  getEvolvedGenomeLibrary
} from "../src/self-evolving-swarm.mjs";

import { app } from "../server.mjs";

test("Timeseries Market Store records ticks, updates rolling candles, and calculates VWAP", () => {
  const sym = "TEST_ASSET";
  const t1 = recordMarketTick({ symbol: sym, price: 100.0, volume: 10, timestamp: Date.now() });
  assert.equal(t1.status, "INGESTED");
  assert.equal(t1.symbol, sym);

  const t2 = recordMarketTick({ symbol: sym, price: 105.0, volume: 20, timestamp: Date.now() });
  assert.equal(t2.status, "INGESTED");

  const vwap = computeSessionVwap(sym);
  assert.ok(vwap >= 100.0 && vwap <= 105.0);

  const ticks = getTickHistory(sym, 10);
  assert.equal(ticks.length, 2);

  const candles = getCandleBars(sym, "1s", 5);
  assert.ok(candles.length >= 1);
  assert.ok(candles[0].high >= 105.0);

  const status = getTimeseriesStoreStatus();
  assert.equal(status.status, "TIMESERIES_STORE_ONLINE");
  assert.ok(status.trackedSymbols.includes(sym));
});

test("Strategy Validation Pipeline computes DSR, Hansen SPA, and CPCV stability", () => {
  const dsr = calculateDeflatedSharpeRatio({ observedSharpe: 2.2, numberOfTrials: 20, sampleLengthDays: 252 });
  assert.ok(dsr.dsrZScore !== undefined);
  assert.ok(dsr.deflatedSharpePValue >= 0 && dsr.deflatedSharpePValue <= 1);

  const spa = runHansenSpaTest({ candidateReturns: [0.02, 0.01, -0.005, 0.03, 0.015] });
  assert.equal(spa.testName, "HANSEN_SUPERIOR_PREDICTIVE_ABILITY_SPA");
  assert.ok(spa.spaPValue >= 0);

  const cpcv = evaluateCpcvPaths({ combinationsCount: 10 });
  assert.equal(cpcv.cpcvStatus, "EVALUATION_COMPLETE");
  assert.equal(cpcv.totalPathsEvaluated, 10);
  assert.ok(cpcv.positivePathsPercent >= 0);

  const gate = evaluateStrategyPromotionGate({ strategyId: "momentum_alpha_v1" });
  assert.ok(["APPROVED_FOR_SANDBOX_EXECUTION", "QUARANTINED_IN_RESEARCH_LAB"].includes(gate.overallGateVerdict));
});

test("Portfolio Risk Fortress computes 99% VaR, Euler risk budgeting, and HRP weights", () => {
  const varRes = calculateValueAtRiskMetrics({ portfolioValue: 100000, confidenceLevel: 0.99 });
  assert.equal(varRes.portfolioValue, 100000);
  assert.ok(varRes.parametricVaR.notional > 0);
  assert.ok(varRes.expectedShortfallCVaR.notional > 0);

  const euler = calculateEulerRiskBudgeting();
  assert.equal(euler.engineName, "EULER_MARGINAL_RISK_BUDGETING");
  assert.ok(euler.totalPortfolioVolatility > 0);
  assert.equal(euler.riskDecomposition.length, 5);

  const hrp = calculateHierarchicalRiskParity();
  assert.equal(hrp.allocationMethod, "HIERARCHICAL_RISK_PARITY_HRP");
  assert.equal(hrp.sumOfWeights, 1.0);

  const hedge = evaluateDefensiveHedging({ currentVix: 28.0, dailyDrawdownPercent: 2.0 });
  assert.equal(hedge.hedgeRecommended, true);
  assert.ok(hedge.recommendedHedgeNotional > 0);
});

test("Broker Adapters Suite generates SOR routing, TWAP slices, and Iceberg orders", () => {
  const sor = routeOrderThroughSor({ symbol: "AAPL", side: "buy", quantity: 150, price: 180 });
  assert.equal(sor.symbol, "AAPL");
  assert.equal(sor.selectedVenue, "ALPACA");
  assert.ok(["TWAP_TIME_SLICED", "VWAP_VOLUME_MATCHED"].includes(sor.executionStrategy));

  const twap = generateTwapOrderSlices({ symbol: "TSLA", totalQuantity: 100, durationMinutes: 10, sliceIntervalSeconds: 60 });
  assert.equal(twap.algorithm, "TWAP_ORDER_SLICER");
  assert.equal(twap.slicesCount, 10);
  const totalSliced = twap.slices.reduce((acc, s) => acc + s.quantity, 0);
  assert.equal(totalSliced, 100);

  const iceberg = generateIcebergOrderPlan({ symbol: "NVDA", totalQuantity: 500, displayedPeakQuantity: 50 });
  assert.equal(iceberg.algorithm, "ICEBERG_DISCLOSED_RESERVE_ORDER");
  assert.equal(iceberg.displayedPeakQuantity, 50);
  assert.equal(iceberg.totalClipsCount, 10);

  const connectivity = verifyBrokerConnectivityStatus();
  assert.ok(connectivity.liveExecutionState);
  assert.ok(Array.isArray(connectivity.supportedExecutionStrategies));
});

test("Self-Evolving AI Swarm synthesizes strategy genomes and adapts policy from trade rewards", () => {
  const genome = synthesizeStrategyGenome({ targetRegime: "TRENDING_BULLISH" });
  assert.ok(genome.genomeId.startsWith("GENOME_AI_"));
  assert.equal(genome.targetRegime, "TRENDING_BULLISH");
  assert.ok(genome.rules.entry.length > 0);

  const adapted = adaptPolicyParametersFromRewards({
    currentStopLoss: 3.0,
    currentTakeProfit: 6.0,
    tradeOutcomes: [
      { win: true, pnlPercent: 5.0 },
      { win: true, pnlPercent: 4.2 },
      { win: true, pnlPercent: 6.1 }
    ]
  });
  assert.equal(adapted.adaptationStatus, "POLICY_OPTIMIZATION_APPLIED");
  assert.ok(adapted.optimizedParameters.takeProfitPercent >= 6.0);

  const library = getEvolvedGenomeLibrary();
  assert.ok(library.totalGenomesAvailable >= 3);
});

test("Future Requirements REST API endpoints respond with 200 OK", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const tsRes = await fetch(`http://127.0.0.1:${port}/api/v100/timeseries/status`);
    assert.equal(tsRes.status, 200);
    const tsData = await tsRes.json();
    assert.equal(tsData.status, "TIMESERIES_STORE_ONLINE");

    const dsrRes = await fetch(`http://127.0.0.1:${port}/api/v100/validation/dsr?sharpe=2.0&trials=25`);
    assert.equal(dsrRes.status, 200);
    const dsrData = await dsrRes.json();
    assert.ok(dsrData.deflatedSharpePValue !== undefined);

    const varRes = await fetch(`http://127.0.0.1:${port}/api/v100/risk/var?value=50000`);
    assert.equal(varRes.status, 200);
    const varData = await varRes.json();
    assert.equal(varData.portfolioValue, 50000);

    const brokerRes = await fetch(`http://127.0.0.1:${port}/api/v100/brokers/status`);
    assert.equal(brokerRes.status, 200);

    const swarmRes = await fetch(`http://127.0.0.1:${port}/api/v100/swarm/genomes`);
    assert.equal(swarmRes.status, 200);
    const swarmData = await swarmRes.json();
    assert.ok(swarmData.totalGenomesAvailable >= 3);
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
});
