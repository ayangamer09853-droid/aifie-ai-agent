import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";

import {
  normalQuantile,
  computeSampleMoments,
  calculateParametricVaR,
  calculateHistoricalVaR,
  calculateCornishFisherVaR,
  calculateExpectedShortfallCVaR,
  calculateDrawdownSeries,
  calculateDownsideSemiVariance,
  calculatePortfolioRiskMetrics,
  getRiskMetricsStatus
} from "../src/portfolio-risk-metrics.mjs";

import {
  computeCovarianceMatrix,
  computePortfolioVolatility,
  calculateMarginalContributionToRisk,
  calculatePercentageRiskContribution,
  verifyEulerIdentity,
  calculateEqualRiskContributionDisparity,
  decomposeEulerRisk,
  getEulerRiskBudgetingStatus
} from "../src/euler-risk-budgeting.mjs";

import {
  optimizeHierarchicalRiskParity,
  optimizeMinimumVariance,
  optimizeMaximumSharpe,
  computeInverseVarianceWeights,
  calculateHierarchicalRiskParityWeights,
  calculateBlackLittermanAllocation,
  calculateMarkowitzEfficientFrontier,
  getPortfolioOptimizerStatus
} from "../src/convex-portfolio-optimizer.mjs";

import {
  computePearsonCorrelation,
  computeFullCorrelationMatrix,
  computePrincipalEigenvalues,
  calculateAbsorptionRatio,
  detectCorrelationBreakdown,
  classifyCorrelationRegime,
  analyzeCorrelationRegime,
  getCorrelationRegimeStatus
} from "../src/correlation-regime-detector.mjs";

import {
  normalCDF,
  calculateBlackScholesPut,
  determineDrawdownDefenseTier,
  generateDefensiveHedgePlan,
  getDefensiveHedgerStatus
} from "../src/dynamic-defensive-hedger.mjs";

let server;
let baseUrl;

test.before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

test("Phase 4: Risk Metrics calculates Parametric, Historical, Cornish-Fisher VaR and Expected Shortfall CVaR", () => {
  const returns = [
    -0.025, 0.015, -0.018, 0.022, -0.035, 0.012, -0.008, 0.028,
    -0.042, 0.019, -0.014, 0.025, -0.011, 0.009, -0.029, 0.031
  ];

  // 1. Parametric VaR
  const parametric = calculateParametricVaR({ returns, confidenceLevel: 0.99, portfolioValue: 100000 });
  assert.equal(parametric.method, "PARAMETRIC_GAUSSIAN");
  assert.ok(parametric.varPercent > 0, "Parametric VaR must be positive");
  assert.ok(parametric.varNotional > 0, "Parametric Notional must be positive");

  // 2. Historical VaR
  const historical = calculateHistoricalVaR({ returns, confidenceLevel: 0.99, portfolioValue: 100000 });
  assert.equal(historical.method, "HISTORICAL_EMPIRICAL");
  assert.ok(historical.varPercent > 0, "Historical VaR must be positive");

  // 3. Cornish-Fisher VaR (higher moments adjustment)
  const cf = calculateCornishFisherVaR({ returns, confidenceLevel: 0.99, portfolioValue: 100000 });
  assert.equal(cf.method, "CORNISH_FISHER_EXPANSION");
  assert.ok(typeof cf.cornishFisherZScore === "number");
  assert.ok(cf.varPercent > 0);

  // 4. Expected Shortfall / CVaR (tail loss average)
  const cvar = calculateExpectedShortfallCVaR({ returns, confidenceLevel: 0.99, portfolioValue: 100000 });
  assert.equal(cvar.method, "EXPECTED_SHORTFALL_CVAR");
  assert.ok(cvar.cvarPercent >= historical.varPercent, "Expected Shortfall must be >= Historical VaR");

  // 5. Drawdown Series
  const equityCurve = [100000, 102000, 101000, 98000, 95000, 97000, 103000];
  const dd = calculateDrawdownSeries(equityCurve);
  assert.ok(dd.maxDrawdownPercent > 0, "Max drawdown should be detected");
  assert.equal(dd.peakValue, 103000);
  assert.equal(dd.currentDrawdownPercent, 0);

  // 6. Comprehensive Portfolio Risk Dossier
  const report = calculatePortfolioRiskMetrics({ portfolioValue: 100000, returns, confidenceLevel: 0.99 });
  assert.equal(report.success, true);
  assert.ok(report.moments.dailyStdPercent > 0);
  assert.ok(report.valueAtRisk.parametric.varPercent > 0);
  assert.ok(report.expectedShortfallCVaR.cvarPercent > 0);

  // 7. Status Telemetry
  const status = getRiskMetricsStatus();
  assert.equal(status.status, "ACTIVE");
});

test("Phase 4: Euler Risk Budgeting decomposes risk and proves Euler Identity sum(w_i * MCR_i) == sigma_p", () => {
  const assets = ["BTC", "ETH", "SOL", "AAPL", "MSFT"];
  const weights = [0.25, 0.25, 0.20, 0.15, 0.15];

  const returnsByAsset = {
    BTC:  [-0.03, 0.04, -0.05, 0.02, -0.02, 0.03, -0.04, 0.05],
    ETH:  [-0.035, 0.045, -0.06, 0.025, -0.025, 0.035, -0.045, 0.055],
    SOL:  [-0.04, 0.05, -0.07, 0.03, -0.03, 0.04, -0.05, 0.06],
    AAPL: [-0.01, 0.015, -0.012, 0.008, -0.005, 0.01, -0.015, 0.018],
    MSFT: [-0.009, 0.014, -0.011, 0.007, -0.004, 0.009, -0.014, 0.016]
  };

  const { matrix } = computeCovarianceMatrix(returnsByAsset, assets);
  assert.equal(matrix.length, 5);
  assert.equal(matrix[0].length, 5);

  // Portfolio Volatility
  const portVol = computePortfolioVolatility(weights, matrix);
  assert.ok(portVol > 0, "Portfolio volatility must be positive");

  // Marginal Contribution to Risk (MCR)
  const { mcr } = calculateMarginalContributionToRisk(weights, matrix);
  assert.equal(mcr.length, 5);

  // Percentage Contribution to Risk (PCR)
  const { pcr, arc } = calculatePercentageRiskContribution(weights, matrix);
  assert.equal(pcr.length, 5);

  // Prove sum of PCR is 100% (within rounding)
  const sumPcr = pcr.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumPcr - 100) < 0.1, `Sum of PCR should be 100%, got ${sumPcr}`);

  // Prove Euler Identity: sum(ARC) == portVol
  const eulerProof = verifyEulerIdentity(weights, matrix);
  assert.equal(eulerProof.isValid, true, "Euler identity verification must hold");

  // High-level orchestrator
  const result = decomposeEulerRisk({ assets, weights, returnsByAsset });
  assert.equal(result.success, true);
  assert.equal(result.eulerProof.isValid, true);
  assert.ok(result.dominantRiskContributor, "Dominant risk contributor must be identified");

  const status = getEulerRiskBudgetingStatus();
  assert.equal(status.status, "ACTIVE");
});

test("Phase 4: Convex Portfolio Optimizer computes HRP, Minimum Variance, and Tangency Sharpe weights", () => {
  const assets = ["BTC", "ETH", "SOL", "AAPL", "MSFT"];

  // 1. Hierarchical Risk Parity (HRP)
  const hrp = optimizeHierarchicalRiskParity({ assets });
  assert.equal(hrp.method, "HIERARCHICAL_RISK_PARITY_HRP");
  assert.equal(hrp.assets.length, 5);

  // Verify weights sum to 1.0
  const hrpSum = Object.values(hrp.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(hrpSum - 1.0) < 0.01, `HRP weights must sum to 1.0, got ${hrpSum}`);
  assert.ok(hrp.diversificationRatio > 1.0, "Diversification ratio should exceed 1.0");

  // 2. Markowitz Minimum Variance
  const minVar = optimizeMinimumVariance({ assets });
  assert.equal(minVar.method, "MARKOWITZ_MINIMUM_VARIANCE");
  const minVarSum = Object.values(minVar.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(minVarSum - 1.0) < 0.01, `MinVar weights must sum to 1.0, got ${minVarSum}`);

  // 3. Markowitz Maximum Sharpe
  const maxSharpe = optimizeMaximumSharpe({ assets, riskFreeRate: 0.04 });
  assert.equal(maxSharpe.method, "MARKOWITZ_MAXIMUM_SHARPE");
  const maxSharpeSum = Object.values(maxSharpe.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(maxSharpeSum - 1.0) < 0.01, `MaxSharpe weights must sum to 1.0, got ${maxSharpeSum}`);

  // 4. Inverse Variance
  const invVar = computeInverseVarianceWeights({ assets, volatilities: [0.65, 0.70, 0.80, 0.22, 0.20] });
  assert.equal(invVar.method, "INVERSE_VARIANCE_WEIGHTING");
  assert.ok(invVar.weights.MSFT > invVar.weights.BTC, "Lower volatility asset must receive higher inverse-variance weight");

  // 5. Backward compatibility
  const compatHrp = calculateHierarchicalRiskParityWeights({ assets });
  assert.ok(compatHrp.weights);
  const compatBl = calculateBlackLittermanAllocation({ assets });
  assert.equal(compatBl.method, "BLACK_LITTERMAN_BAYESIAN");
  const compatFrontier = calculateMarkowitzEfficientFrontier();
  assert.equal(compatFrontier.engineStatus, "EFFICIENT_FRONTIER_SOLVED");

  const status = getPortfolioOptimizerStatus();
  assert.equal(status.status, "ACTIVE");
});

test("Phase 4: Correlation Regime Detector tracks covariance, eigenvalues, and Kritzman Absorption Ratio", () => {
  // 1. Pearson Correlation
  const seriesA = [0.01, 0.02, 0.03, 0.04, 0.05];
  const seriesB = [0.02, 0.04, 0.06, 0.08, 0.10];
  const perfectCorr = computePearsonCorrelation(seriesA, seriesB);
  assert.equal(perfectCorr, 1.0);

  const seriesC = [-0.01, -0.02, -0.03, -0.04, -0.05];
  const invCorr = computePearsonCorrelation(seriesA, seriesC);
  assert.equal(invCorr, -1.0);

  // 2. Correlation Matrix & Eigenvalues
  const assets = ["A", "B", "C"];
  const returns = {
    A: [0.01, 0.02, -0.01, 0.03],
    B: [0.012, 0.018, -0.008, 0.025],
    C: [-0.005, -0.01, 0.005, -0.015]
  };
  const { matrix, averageCorrelation } = computeFullCorrelationMatrix(returns, assets);
  assert.equal(matrix.length, 3);
  assert.equal(matrix[0][0], 1.0);

  const eigenvalues = computePrincipalEigenvalues(matrix, 2);
  assert.equal(eigenvalues.length, 2);
  assert.ok(eigenvalues[0].eigenvalue >= eigenvalues[1].eigenvalue, "First eigenvalue must be dominant");

  // 3. Kritzman Absorption Ratio
  const absorption = calculateAbsorptionRatio(eigenvalues, 3);
  assert.ok(absorption.top1AbsorptionRatioPercent > 0);

  // 4. Regime Classification
  const normalRegime = classifyCorrelationRegime({ topAbsorptionRatioPercent: 40.0, averageCorrelation: 0.35, vix: 17.0 });
  assert.equal(normalRegime.regime, "HEALTHY_DIVERSIFICATION");

  const crisisRegime = classifyCorrelationRegime({ topAbsorptionRatioPercent: 72.0, averageCorrelation: 0.80, vix: 35.0 });
  assert.equal(crisisRegime.regime, "SYSTEMIC_CONTAGION_CRISIS");
  assert.equal(crisisRegime.isContagionAlertActive, true);

  // 5. Full Orchestrator
  const analysis = analyzeCorrelationRegime();
  assert.equal(analysis.success, true);
  assert.ok(analysis.absorptionRatio);
  assert.ok(analysis.regimeAssessment);

  const status = getCorrelationRegimeStatus();
  assert.equal(status.status, "ACTIVE");
});

test("Phase 4: Dynamic Defensive Hedger computes Black-Scholes put Greeks and 4-tier drawdown deleveraging", () => {
  // 1. Black-Scholes Put Option
  const put = calculateBlackScholesPut({
    spot: 100,
    strike: 95,
    timeYears: 30 / 365,
    riskFreeRate: 0.045,
    volatility: 0.25
  });
  assert.ok(put.putPrice >= 0, "Put price must be non-negative");
  assert.ok(put.greeks.delta < 0, "Put Delta must be negative");
  assert.ok(put.greeks.gamma > 0, "Gamma must be positive");
  assert.ok(put.greeks.vega > 0, "Vega must be positive");

  // 2. Drawdown Defense Tiers
  // Tier 1: Normal (< 1.5% DD)
  const tier1 = determineDrawdownDefenseTier(0.8, 3.0);
  assert.equal(tier1.tier, 1);
  assert.equal(tier1.level, "NORMAL_OPERATION");
  assert.equal(tier1.newOrderPermitted, true);
  assert.equal(tier1.positionSizeThrottle, 1.0);

  // Tier 2: Caution (1.5% - 2.5% DD)
  const tier2 = determineDrawdownDefenseTier(1.8, 3.0);
  assert.equal(tier2.tier, 2);
  assert.equal(tier2.level, "CAUTION_DELEVERAGING");
  assert.equal(tier2.targetHedgeRatio, 0.25);
  assert.equal(tier2.positionSizeThrottle, 0.50);

  // Tier 3: High Alert (2.5% - 3.0% DD)
  const tier3 = determineDrawdownDefenseTier(2.7, 3.0);
  assert.equal(tier3.tier, 3);
  assert.equal(tier3.level, "HIGH_ALERT_FREEZE");
  assert.equal(tier3.targetHedgeRatio, 0.50);
  assert.equal(tier3.newOrderPermitted, false);

  // Tier 4: Circuit Breaker (>= 3.0% DD)
  const tier4 = determineDrawdownDefenseTier(3.2, 3.0);
  assert.equal(tier4.tier, 4);
  assert.equal(tier4.level, "CIRCUIT_BREAKER_PRESERVATION");
  assert.equal(tier4.targetHedgeRatio, 1.0);
  assert.equal(tier4.newOrderPermitted, false);

  // 3. Actionable Hedging Plan
  const plan = generateDefensiveHedgePlan({
    portfolioValue: 100000,
    currentVix: 28.0,
    dailyDrawdownPercent: 1.9,
    maxAllowedDrawdownPercent: 3.0
  });
  assert.equal(plan.success, true);
  assert.equal(plan.hedgeRecommended, true);
  assert.ok(plan.hedgeNotionalUSD > 0);
  assert.ok(plan.protectivePutSpecification.contractsRecommended >= 1);
  assert.ok(plan.alternativeHedges.length > 0);

  const status = getDefensiveHedgerStatus();
  assert.equal(status.status, "ACTIVE");
});

test("Phase 4: Server exposes all risk fortress REST endpoints with live responses", async () => {
  // 1. POST /api/risk/metrics
  const metricsRes = await fetch(`${baseUrl}/api/risk/metrics`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ portfolioValue: 150000, confidenceLevel: 0.99 })
  });
  assert.equal(metricsRes.status, 200);
  const metricsData = await metricsRes.json();
  assert.equal(metricsData.success, true);
  assert.equal(metricsData.portfolioValue, 150000);
  assert.ok(metricsData.valueAtRisk.parametric.varPercent > 0);

  // 2. POST /api/risk/euler
  const eulerRes = await fetch(`${baseUrl}/api/risk/euler`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      assets: ["BTC", "ETH", "AAPL"],
      weights: [0.4, 0.4, 0.2]
    })
  });
  assert.equal(eulerRes.status, 200);
  const eulerData = await eulerRes.json();
  assert.equal(eulerData.success, true);
  assert.equal(eulerData.eulerProof.isValid, true);

  // 3. POST /api/risk/optimize (HRP)
  const optHrpRes = await fetch(`${baseUrl}/api/risk/optimize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "HRP", assets: ["BTC", "ETH", "AAPL", "MSFT"] })
  });
  assert.equal(optHrpRes.status, 200);
  const optHrpData = await optHrpRes.json();
  assert.equal(optHrpData.success, true);
  assert.equal(optHrpData.result.method, "HIERARCHICAL_RISK_PARITY_HRP");

  // 4. POST /api/risk/optimize (MIN_VARIANCE)
  const optMinVarRes = await fetch(`${baseUrl}/api/risk/optimize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "MIN_VARIANCE", assets: ["BTC", "ETH", "AAPL", "MSFT"] })
  });
  assert.equal(optMinVarRes.status, 200);
  const optMinVarData = await optMinVarRes.json();
  assert.equal(optMinVarData.success, true);
  assert.equal(optMinVarData.result.method, "MARKOWITZ_MINIMUM_VARIANCE");

  // 5. POST /api/risk/correlation-regime
  const corrRes = await fetch(`${baseUrl}/api/risk/correlation-regime`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ vix: 21.0 })
  });
  assert.equal(corrRes.status, 200);
  const corrData = await corrRes.json();
  assert.equal(corrData.success, true);
  assert.ok(corrData.regimeAssessment);

  // 6. POST /api/risk/hedge
  const hedgeRes = await fetch(`${baseUrl}/api/risk/hedge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      portfolioValue: 120000,
      currentVix: 26.0,
      dailyDrawdownPercent: 1.7
    })
  });
  assert.equal(hedgeRes.status, 200);
  const hedgeData = await hedgeRes.json();
  assert.equal(hedgeData.success, true);
  assert.equal(hedgeData.hedgeRecommended, true);

  // 7. GET /api/risk/status
  const statusRes = await fetch(`${baseUrl}/api/risk/status`);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.success, true);
  assert.equal(statusData.phase, "PHASE_4_INSTITUTIONAL_RISK_FORTRESS");
  assert.equal(statusData.riskMetrics.status, "ACTIVE");
  assert.equal(statusData.eulerBudgeting.status, "ACTIVE");
  assert.equal(statusData.optimizer.status, "ACTIVE");
  assert.equal(statusData.correlationRegime.status, "ACTIVE");
  assert.equal(statusData.defensiveHedger.status, "ACTIVE");
});
