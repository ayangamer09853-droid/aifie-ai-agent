// src/api/v100-roadmap-router.mjs
// Router for /api/v100/* roadmap endpoints (Universe, Streaming, Data Quality, Risk Fortress, etc.)

import { getExtendedUniverseStatus, runExtendedUniverseScan, executeExtendedAdapter } from "../extended-sources-universe.mjs";
import { getStreamingPipelineStatus, subscribeStreamingSymbol, ingestLiveTick, triggerStreamingFailover, restoreStreamingPrimary } from "../realtime-streaming-pipeline.mjs";
import { getDataQualityStatus, auditMarketTick } from "../data-quality-sentinel.mjs";
import { getPipelineLatencyTelemetry } from "../latency-pipeline-profiler.mjs";
import { classifyMarketRegime } from "../market-regime-engine.mjs";
import { synthesizeEvidence } from "../weighted-evidence-engine.mjs";
import { getIndependentRiskStatus, auditTradeProposal, calculateKellyPositionSize, triggerRiskEmergencyHalt, resetRiskEmergencyHalt } from "../independent-risk-fortress.mjs";
import { calculatePortfolioVaRAndCVaR, evaluatePortfolioImprovement } from "../institutional-portfolio-optimizer.mjs";
import { runFlashCrashSimulation, runLiquidityCollapseSimulation, runDataCorruptionSimulation, getCrisisSimulatorStatus } from "../crisis-fault-simulator.mjs";
import { generateCpcvSplits, evaluateWalkForwardAlpha } from "../walkforward-alpha-evaluator.mjs";
import { recordTradePostMortem, getTradeMemoryStatus, queryTradingLessons } from "../trade-attribution-memory.mjs";
import { getModelRegistryStatus, promoteModelStage } from "../model-governance-registry.mjs";
import { getSourceQualityStatus, evaluateSourceQuality } from "../source-quality-evaluator.mjs";

export function dispatchV100Route(pathname, method = "GET", searchParams = new URLSearchParams(), body = {}) {
  const path = pathname.toLowerCase();

  // --- Universe ---
  if (path === "/api/v100/universe/status") {
    return { status: 200, payload: { success: true, totalExtendedSources: 36, ...getExtendedUniverseStatus() } };
  }
  if (path === "/api/v100/universe/scan") {
    const symbol = searchParams.get("symbol") || "BTCUSDT";
    return { status: 200, payload: { success: true, symbol, totalExtendedSources: 36, ...runExtendedUniverseScan(symbol) } };
  }
  if (path === "/api/v100/universe/execute" && method === "POST") {
    const res = executeExtendedAdapter(body.repository || body.source, body.operation, body.params);
    return { status: 200, payload: { success: true, repository: body.repository, ...res } };
  }

  // --- Streaming ---
  if (path === "/api/v100/streaming/status") {
    return { status: 200, payload: getStreamingPipelineStatus() };
  }
  if (path === "/api/v100/streaming/subscribe" && method === "POST") {
    return { status: 200, payload: subscribeStreamingSymbol(body.symbol) };
  }
  if (path === "/api/v100/streaming/simulate-tick" && method === "POST") {
    return { status: 200, payload: ingestLiveTick(body) };
  }
  if (path === "/api/v100/streaming/failover" && method === "POST") {
    if (body.restorePrimary) {
      return { status: 200, payload: restoreStreamingPrimary() };
    }
    return { status: 200, payload: triggerStreamingFailover(body.fromVenue, body.reason) };
  }

  // --- Data Quality & Latency ---
  if (path === "/api/v100/data-quality/status") {
    return { status: 200, payload: getDataQualityStatus() };
  }
  if (path === "/api/v100/data-quality/audit-tick" && method === "POST") {
    return { status: 200, payload: auditMarketTick(body) };
  }
  if (path === "/api/v100/latency/metrics") {
    return { status: 200, payload: getPipelineLatencyTelemetry() };
  }
  if (path === "/api/v100/regime/status") {
    const vpin = Number(searchParams.get("vpin")) || 0.25;
    const spreadBps = Number(searchParams.get("spreadBps")) || 3.0;
    const sentiment = Number(searchParams.get("newsSentimentVelocity")) || 0;
    return { status: 200, payload: classifyMarketRegime([], { vpin, spreadBps, newsSentimentVelocity: sentiment }) };
  }
  if (path === "/api/v100/evidence/synthesize" && method === "POST") {
    return { status: 200, payload: synthesizeEvidence(body) };
  }

  // --- Risk Fortress ---
  if (path === "/api/v100/risk-fortress/status") {
    return { status: 200, payload: getIndependentRiskStatus() };
  }
  if (path === "/api/v100/risk-fortress/audit-proposal" && method === "POST") {
    return { status: 200, payload: auditTradeProposal(body) };
  }
  if (path === "/api/v100/risk-fortress/kelly-size" && method === "POST") {
    return { status: 200, payload: calculateKellyPositionSize(body) };
  }
  if (path === "/api/v100/risk-fortress/emergency-halt" && method === "POST") {
    return { status: 200, payload: triggerRiskEmergencyHalt(body.reason || "MANUAL_EMERGENCY_HALT") };
  }
  if (path === "/api/v100/risk-fortress/reset-halt" && method === "POST") {
    return { status: 200, payload: resetRiskEmergencyHalt() };
  }

  // --- Portfolio Optimizer ---
  if (path === "/api/v100/portfolio/cvar-metrics" && method === "POST") {
    return { status: 200, payload: calculatePortfolioVaRAndCVaR(body.weights, body.covMatrix, body.expectedReturns, body.confidence) };
  }
  if (path === "/api/v100/portfolio/evaluate-improvement" && method === "POST") {
    return { status: 200, payload: evaluatePortfolioImprovement(body) };
  }

  // --- Crisis Simulator ---
  if (path === "/api/v100/crisis/simulate" && method === "POST") {
    const scenario = body.scenario || "FLASH_CRASH";
    let res;
    if (scenario === "LIQUIDITY_COLLAPSE") res = runLiquidityCollapseSimulation(body);
    else if (scenario === "DATA_CORRUPTION_BURST") res = runDataCorruptionSimulation(body);
    else res = runFlashCrashSimulation(body);
    return { status: 200, payload: res };
  }
  if (path === "/api/v100/crisis/status") {
    return { status: 200, payload: getCrisisSimulatorStatus() };
  }

  // --- Walk-Forward & Memory ---
  if (path === "/api/v100/walk-forward/splits") {
    const bars = Number(searchParams.get("bars")) || 1000;
    const folds = Number(searchParams.get("folds")) || 5;
    return { status: 200, payload: generateCpcvSplits(bars, folds, 0.20, 10) };
  }
  if (path === "/api/v100/walk-forward/evaluate" && method === "POST") {
    return { status: 200, payload: evaluateWalkForwardAlpha(body) };
  }
  if (path === "/api/v100/memory/post-mortem" && method === "POST") {
    return { status: 200, payload: recordTradePostMortem(body) };
  }
  if (path === "/api/v100/memory/status") {
    return { status: 200, payload: getTradeMemoryStatus() };
  }
  if (path === "/api/v100/memory/lessons") {
    const regime = searchParams.get("regime") || null;
    const symbol = searchParams.get("symbol") || null;
    return { status: 200, payload: queryTradingLessons({ regime, symbol }) };
  }
  if (path === "/api/v100/models/status") {
    return { status: 200, payload: getModelRegistryStatus() };
  }
  if (path === "/api/v100/models/promote" && method === "POST") {
    return { status: 200, payload: promoteModelStage(body.modelId, body.targetStage, body.adminAuthorization) };
  }

  // --- Sources Quality ---
  if (path === "/api/v100/sources/quality-status") {
    return { status: 200, payload: getSourceQualityStatus() };
  }
  if (path === "/api/v100/sources/evaluate-quality" && method === "POST") {
    return { status: 200, payload: evaluateSourceQuality(body.repository, body.metrics || {}) };
  }

  return { status: 404, payload: { error: "Route not found in /api/v100" } };
}
