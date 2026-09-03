import test from "node:test";
import assert from "node:assert/strict";
import {
  getSupremeAlphaPipelineStatus,
  calculateVolatilityClusteringTailRiskSize,
  getPipelineMonitorStatus,
  triggerPipelineSelfHealing,
  routePredictionToExplainableMlLab,
  getMarketSentimentTemperatureDashboard,
  generateAlphaFromNaturalLanguage,
  selectOptimalArbitragePairs,
  buildAllAutomatedConnections
} from "../src/supreme-alpha-research-pipeline-suite.mjs";

test("getSupremeAlphaPipelineStatus reports active alpha pipeline suite status", () => {
  const status = getSupremeAlphaPipelineStatus();
  assert.equal(status.suiteStatus, "SUPREME_ALPHA_RESEARCH_PIPELINE_SUITE_OPTIMAL");
  assert.equal(status.protocolVersion, "SUPREME_ALPHA_RESEARCH_PIPELINE_V64");
  assert.ok(status.sentimentTemperatureCelsius.includes("74.5°C"));
});

test("calculateVolatilityClusteringTailRiskSize simulates GARCH volatility clustering for position caps", () => {
  const tailRisk = calculateVolatilityClusteringTailRiskSize({ symbol: "AAPL", currentVolatility: 0.22, portfolioEquityUSD: 100000 });
  assert.equal(tailRisk.simulationStatus, "VOLATILITY_CLUSTERING_TAIL_RISK_CALCULATED");
  assert.equal(tailRisk.baseVolatility, "22.0%");
  assert.ok(tailRisk.recommendedTailRiskPositionQty >= 1);
});

test("getPipelineMonitorStatus and triggerPipelineSelfHealing verify real-time self-healing data pipeline", () => {
  const monitor = getPipelineMonitorStatus();
  assert.equal(monitor.monitorStatus, "REALTIME_PIPELINE_MONITOR_HEALTHY");
  assert.equal(monitor.activeStagesCount, 4);

  const healing = triggerPipelineSelfHealing({ failedStage: "FEATURE_ENGINEERING_MATRIX" });
  assert.equal(healing.healingStatus, "PIPELINE_SELF_HEALING_COMPLETED_SUCCESS");
  assert.ok(healing.healingTxHash.startsWith("0xHEAL_PIPE_"));
});

test("routePredictionToExplainableMlLab routes predictions to explainable SHAP models", () => {
  const lab = routePredictionToExplainableMlLab({ promptProblem: "Predict directional movement for AAPL" });
  assert.equal(lab.labStatus, "EXPLAINABLE_ML_MODEL_ROUTED_SUCCESS");
  assert.equal(lab.selectedModel, "XGBoost + SHAP Explainability Engine");
  assert.equal(lab.topAttributionFeatures.length, 4);
});

test("generateAlphaFromNaturalLanguage and selectOptimalArbitragePairs generate alphas & select stock pairs", () => {
  const alpha = generateAlphaFromNaturalLanguage({ prompt: "Create mean reverting spread alpha" });
  assert.equal(alpha.generationStatus, "NATURAL_LANGUAGE_ALPHA_GENERATED_SUCCESS");
  assert.ok(alpha.alphaTxHash.startsWith("0xALPHA_NL_"));
  assert.equal(alpha.coordinatePlaneSimulation.planeCoordinates.length, 3);

  const pair = selectOptimalArbitragePairs({ targetSector: "TECH_BLUECHIP" });
  assert.equal(pair.selectionStatus, "CO_INTEGRATED_ARBITRAGE_PAIRS_SELECTED");
  assert.equal(pair.bestMatchedPair.stockA, "KO");
  assert.equal(pair.bestMatchedPair.stockB, "PEP");
});

test("buildAllAutomatedConnections builds automated zero-config broker, Web3 and ML connections", () => {
  const connections = buildAllAutomatedConnections();
  assert.equal(connections.buildStatus, "ALL_AUTOMATED_CONNECTIONS_BUILT_SUCCESS");
  assert.equal(connections.connections.length, 4);
});
