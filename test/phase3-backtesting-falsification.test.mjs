import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";

import {
  runEventDrivenSimulation,
  getBacktestCoreStatus
} from "../src/event-driven-backtest-core.mjs";

import {
  generateCombinatorialPurgedSplits,
  calculateProbabilityBacktestOverfitting,
  getCPCVEvaluatorStatus
} from "../src/cpcv-pbo-evaluator.mjs";

import {
  evaluateHansenSpaTest,
  getHansenSpaStatus
} from "../src/hansen-spa-evaluator.mjs";

import {
  calculateDeflatedSharpeRatio,
  normalCdf,
  getDsrStatus
} from "../src/deflated-sharpe-calculator.mjs";

import {
  runMonteCarloSimulation,
  getMonteCarloEngineStatus
} from "../src/monte-carlo-simulator.mjs";

import {
  evaluateStrategyPromotionGate,
  getPromotionGateStatus
} from "../src/strategy-promotion-gate.mjs";

let server;
let baseUrl;

test.before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
});

test("Phase 3: Event-driven backtester computes execution fills, Sharpe, Sortino, Calmar, and Drawdowns", () => {
  const status = getBacktestCoreStatus();
  assert.equal(status.engine, "EVENT_DRIVEN_BACKTEST_SIMULATOR");

  // Create synthetic upward price trend bars
  const bars = Array.from({ length: 60 }, (_, i) => {
    const close = 100 + i * 1.5 + (Math.sin(i) * 2);
    return {
      time: 1700000000000 + i * 60000,
      open: close - 0.5,
      high: close + 1.0,
      low: close - 1.0,
      close,
      volume: 1000
    };
  });

  const res = runEventDrivenSimulation({
    symbol: "NVDA",
    bars,
    initialCapital: 100000,
    slippageBps: 2.0,
    commissionPerTrade: 1.0
  });

  assert.equal(res.symbol, "NVDA");
  assert.ok(res.finalEquity > 0);
  assert.ok(Number.isFinite(res.cumulativeReturnPercent));
  assert.ok(Number.isFinite(res.annualizedSharpe));
  assert.ok(Number.isFinite(res.annualizedSortino));
  assert.ok(Number.isFinite(res.maxDrawdownPercent));
  assert.ok(res.maxDrawdownPercent >= 0);
  assert.ok(res.totalTrades > 0);
  assert.ok(res.tradesLog.length > 0);
  assert.ok(res.tradesLog[0].entryPrice > 0);
  assert.ok(res.tradesLog[0].exitPrice > 0);
});

test("Phase 3: CPCV generates combinatorial purged splits and calculates PBO correctly", () => {
  const status = getCPCVEvaluatorStatus();
  assert.equal(status.engine, "CPCV_PBO_EVALUATOR");

  // Combinations C(6, 2) = 15
  const splits = generateCombinatorialPurgedSplits(600, 6, 2, 5);
  assert.equal(splits.totalCombinatorialPaths, 15);
  assert.equal(splits.splits.length, 15);
  assert.equal(splits.splits[0].testIndices.length, 2);
  assert.equal(splits.splits[0].trainIndices.length, 4);

  // Test PBO evaluation
  const pbo = calculateProbabilityBacktestOverfitting({ numModels: 10, numPaths: 20 });
  assert.equal(pbo.evaluator, "BAILEY_LOPEZ_DE_PRADO_PBO");
  assert.ok(pbo.pboProbability >= 0 && pbo.pboProbability <= 1.0);
  assert.ok(pbo.pboPercent >= 0 && pbo.pboPercent <= 100.0);
  assert.equal(pbo.stabilityScore, Number((100 - pbo.pboPercent).toFixed(2)));
  assert.ok(pbo.verdict);
});

test("Phase 3: Hansen SPA test evaluates superior predictive ability with stationary bootstrap", () => {
  const status = getHansenSpaStatus();
  assert.equal(status.engine, "HANSEN_SPA_EVALUATOR");

  const candReturns = [0.015, 0.008, 0.022, -0.003, 0.019, 0.012, -0.001, 0.025, 0.018, 0.009];
  const benchReturns = [
    [0.002, 0.001, -0.004, 0.003, 0.001, 0.002, -0.002, 0.001, 0.003, 0.001],
    Array.from({ length: 10 }, () => 0.0005)
  ];

  const spa = evaluateHansenSpaTest({
    candidateReturns: candReturns,
    benchmarkMatrix: benchReturns,
    bootstrapIterations: 200,
    strategyName: "ALPHA_LEAD"
  });

  assert.equal(spa.test, "HANSEN_SUPERIOR_PREDICTIVE_ABILITY");
  assert.ok(spa.testStatistic >= 0);
  assert.ok(spa.spaPValue >= 0 && spa.spaPValue <= 1.0);
  assert.ok(typeof spa.isSuperiorAlpha === "boolean");
  assert.ok(spa.verdict);
});

test("Phase 3: Deflated Sharpe Ratio penalizes multiple testing and accounts for non-normal skewness/kurtosis", () => {
  const status = getDsrStatus();
  assert.equal(status.engine, "DEFLATED_SHARPE_RATIO_CALCULATOR");

  // Normal CDF approximation test
  assert.equal(Number(normalCdf(0).toFixed(2)), 0.50);
  assert.ok(normalCdf(2.0) > 0.97);
  assert.ok(normalCdf(-2.0) < 0.03);

  // High trials (N=100) vs Low trials (N=2)
  const dsrLowTrials = calculateDeflatedSharpeRatio({ observedSharpe: 2.0, numberOfTrials: 2 });
  const dsrHighTrials = calculateDeflatedSharpeRatio({ observedSharpe: 2.0, numberOfTrials: 100 });

  // Expected max Sharpe under null must be strictly higher with 100 trials (data-snooping penalty)
  assert.ok(dsrHighTrials.expectedMaxSharpeUnderNull > dsrLowTrials.expectedMaxSharpeUnderNull);
  // Consequently, Z-score and p-value must be lower for 100 trials
  assert.ok(dsrHighTrials.dsrZScore < dsrLowTrials.dsrZScore);

  assert.ok(dsrLowTrials.deflatedSharpePValue > 0);
  assert.ok(dsrLowTrials.verdict);
});

test("Phase 3: 10,000-Path Monte Carlo simulator generates confidence percentile cones and ruin probability", () => {
  const status = getMonteCarloEngineStatus();
  assert.equal(status.engine, "MONTE_CARLO_10K_SIMULATOR");

  const mc = runMonteCarloSimulation({
    returns: [0.01, -0.005, 0.015, -0.002, 0.008, 0.02, -0.004, 0.011],
    initialCapital: 100000,
    numPaths: 2000,
    horizonDays: 30,
    ruinThresholdPercent: 20.0
  });

  assert.equal(mc.engine, "MONTE_CARLO_10K_STRESS_LAB");
  assert.equal(mc.simulatedPaths, 2000);
  assert.ok(mc.ruinProbability >= 0 && mc.ruinProbability <= 1.0);

  // Verify confidence cone monotonicity: P05 < P25 <= P50 <= P75 < P95
  const cone = mc.equityPercentileCone;
  assert.ok(cone.p05_worstCase <= cone.p25_conservative);
  assert.ok(cone.p25_conservative <= cone.p50_median);
  assert.ok(cone.p50_median <= cone.p75_optimistic);
  assert.ok(cone.p75_optimistic <= cone.p95_exceptional);

  assert.ok(mc.maxDrawdownDistribution.medianMaxDrawdownPercent >= 0);
  assert.ok(mc.maxDrawdownDistribution.p95WorstCaseDrawdownPercent >= mc.maxDrawdownDistribution.medianMaxDrawdownPercent);
});

test("Phase 3: Strategy Promotion Gatekeeper enforces 5-point quarantine scorecard", () => {
  const status = getPromotionGateStatus();
  assert.equal(status.gatekeeper, "STRATEGY_PROMOTION_GATEKEEPER");

  // 1. Passing strategy scorecard
  const passingScorecard = evaluateStrategyPromotionGate({
    strategyName: "ALPHA_PRIME",
    backtest: { profitFactor: 2.1, maxDrawdownPercent: 9.5 },
    pbo: { pboPercent: 12.0 },
    dsr: { deflatedSharpePValue: 0.98 },
    monteCarlo: { ruinProbabilityPercent: 0.8 }
  });

  assert.equal(passingScorecard.isPromoted, true);
  assert.equal(passingScorecard.verdict, "PROMOTED_TO_PAPER_TRADING");
  assert.equal(passingScorecard.passedGatesCount, 5);
  assert.equal(passingScorecard.complianceScorePercent, 100);

  // 2. Failing strategy scorecard (High Drawdown: 22% > 15%, High PBO: 35% > 25%)
  const failingScorecard = evaluateStrategyPromotionGate({
    strategyName: "CURVE_FIT_STRATEGY",
    backtest: { profitFactor: 1.2, maxDrawdownPercent: 22.0 },
    pbo: { pboPercent: 35.0 },
    dsr: { deflatedSharpePValue: 0.82 },
    monteCarlo: { ruinProbabilityPercent: 6.5 }
  });

  assert.equal(failingScorecard.isPromoted, false);
  assert.equal(failingScorecard.verdict, "QUARANTINED_IN_RESEARCH");
  assert.ok(failingScorecard.passedGatesCount < 5);
});

test("Phase 3: Server exposes all backtest and falsification REST endpoints", async () => {
  // 1. Backtest Run endpoint
  const runRes = await fetch(`${baseUrl}/api/backtest/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "AAPL", initialCapital: 100000 })
  });
  assert.equal(runRes.status, 200);
  const runData = await runRes.json();
  assert.equal(runData.success, true);
  assert.ok(runData.result.annualizedSharpe !== undefined);

  // 2. PBO endpoint
  const pboRes = await fetch(`${baseUrl}/api/backtest/pbo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ numModels: 5, numPaths: 10 })
  });
  assert.equal(pboRes.status, 200);
  const pboData = await pboRes.json();
  assert.equal(pboData.success, true);
  assert.ok(pboData.result.pboPercent !== undefined);

  // 3. Hansen SPA endpoint
  const spaRes = await fetch(`${baseUrl}/api/backtest/hansen-spa`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bootstrapIterations: 50 })
  });
  assert.equal(spaRes.status, 200);
  const spaData = await spaRes.json();
  assert.equal(spaData.success, true);
  assert.ok(spaData.result.spaPValue !== undefined);

  // 4. DSR endpoint
  const dsrRes = await fetch(`${baseUrl}/api/backtest/dsr`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ observedSharpe: 2.2, numberOfTrials: 20 })
  });
  assert.equal(dsrRes.status, 200);
  const dsrData = await dsrRes.json();
  assert.equal(dsrData.success, true);
  assert.ok(dsrData.result.deflatedSharpePValue !== undefined);

  // 5. Monte Carlo endpoint
  const mcRes = await fetch(`${baseUrl}/api/backtest/monte-carlo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ numPaths: 500, horizonDays: 20 })
  });
  assert.equal(mcRes.status, 200);
  const mcData = await mcRes.json();
  assert.equal(mcData.success, true);
  assert.ok(mcData.result.ruinProbabilityPercent !== undefined);

  // 6. Promotion Gate endpoint
  const gateRes = await fetch(`${baseUrl}/api/backtest/promotion-gate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      strategyName: "API_TEST_STRATEGY",
      backtest: { profitFactor: 1.8, maxDrawdownPercent: 10 },
      pbo: { pboPercent: 15 },
      dsr: { deflatedSharpePValue: 0.97 },
      monteCarlo: { ruinProbabilityPercent: 1.0 }
    })
  });
  assert.equal(gateRes.status, 200);
  const gateData = await gateRes.json();
  assert.equal(gateData.success, true);
  assert.equal(gateData.result.isPromoted, true);

  // 7. Status endpoint
  const statusRes = await fetch(`${baseUrl}/api/backtest/status`);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.success, true);
  assert.equal(statusData.phase, "PHASE_3_BACKTESTING_FALSIFICATION_ENGINE");
  assert.ok(statusData.simulator);
  assert.ok(statusData.cpcv);
  assert.ok(statusData.hansenSpa);
  assert.ok(statusData.dsr);
  assert.ok(statusData.monteCarlo);
  assert.ok(statusData.promotionGate);
});
