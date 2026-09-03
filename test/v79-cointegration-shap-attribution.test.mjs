import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateKalmanHedgeRatio,
  scanAllCointegratedPairs
} from "../src/cointegration-stat-arb-engine.mjs";
import {
  calculateShapAlphaAttribution
} from "../src/explainable-shap-alpha-attribution.mjs";

test("Kalman Cointegration engine calculates time-varying beta, ADF stationarity, and Z-score", () => {
  const res = calculateKalmanHedgeRatio({ assetA: "BTC/USDT", assetB: "ETH/USDT" });
  assert.equal(res.engineStatus, "KALMAN_COINTEGRATION_ACTIVE");
  assert.equal(typeof res.kalmanBeta, "number");
  assert.ok(res.adfTestPValue < 0.01);
  assert.equal(res.isCointegrated, true);
  assert.equal(typeof res.zScore, "number");

  const scan = scanAllCointegratedPairs();
  assert.equal(scan.scanStatus, "SCAN_COMPLETE");
  assert.equal(scan.totalMonitoredPairs, 3);
});

test("Explainable SHAP Attribution engine calculates feature Shapley values and aggregate conviction", () => {
  const shap = calculateShapAlphaAttribution({ symbol: "AAPL", baseAlphaScore: 50.0 });
  assert.equal(shap.engineStatus, "SHAP_ATTRIBUTION_CALCULATED");
  assert.equal(shap.symbol, "AAPL");
  assert.equal(shap.features.length, 5);
  assert.ok(shap.totalShapContribution > 0.9);
  assert.ok(shap.aggregateConvictionScore > 85.0);
  assert.equal(shap.convictionGrade, "HIGH_CONVICTION_ALPHA");
});
