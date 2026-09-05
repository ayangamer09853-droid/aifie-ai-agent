import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  auditMarketTick,
  getDataQualityStatus,
  isTradingLockedForSymbol,
  resetDataQualitySentinel
} from "../src/data-quality-sentinel.mjs";
import {
  startPipelineTrace,
  recordPipelineStage,
  endPipelineTrace,
  getPipelineLatencyTelemetry,
  resetLatencyProfiler
} from "../src/latency-pipeline-profiler.mjs";
import {
  classifyMarketRegime,
  REGIMES,
  REGIME_STRATEGY_WEIGHTS
} from "../src/market-regime-engine.mjs";
import {
  createAgentProposal,
  synthesizeEvidence
} from "../src/weighted-evidence-engine.mjs";
import { app } from "../server.mjs";

test("Batch 1: Data Quality Sentinel Deterministic Tick Sanity", () => {
  resetDataQualitySentinel();
  const now = Date.now();

  // 1. Healthy tick passes with high quality score
  const validRes = auditMarketTick({
    symbol: "BTCUSDT",
    price: 88500.0,
    volume: 1.5,
    timestamp: now
  });
  assert.equal(validRes.valid, true);
  assert.ok(validRes.qualityScore >= 85);
  assert.equal(validRes.isTradingLocked, false);

  // 2. Non-positive price is penalized and rejected
  const invalidPriceRes = auditMarketTick({
    symbol: "BTCUSDT",
    price: -100,
    volume: 1.0,
    timestamp: now
  });
  assert.equal(invalidPriceRes.valid, false);
  assert.ok(invalidPriceRes.qualityScore < 85);
  assert.ok(invalidPriceRes.reasons.some(r => r.includes("INVALID_PRICE")));

  // 3. Future clock drift is penalized
  const futureRes = auditMarketTick({
    symbol: "ETHUSDT",
    price: 3400.0,
    volume: 2.0,
    timestamp: now + 5000 // 5s into the future
  });
  assert.equal(futureRes.valid, false);
  assert.ok(futureRes.reasons.some(r => r.includes("FUTURE_TIMESTAMP")));

  // 4. Duplicate tick is detected
  const tick1 = auditMarketTick({ symbol: "SOLUSDT", price: 195.0, volume: 10, timestamp: now + 10 });
  assert.equal(tick1.valid, true);
  const tickDup = auditMarketTick({ symbol: "SOLUSDT", price: 195.0, volume: 10, timestamp: now + 10 });
  assert.ok(tickDup.reasons.some(r => r.includes("DUPLICATE_TICK_DETECTED")));

  // 5. Abnormal single-tick price spike is flagged
  auditMarketTick({ symbol: "NVDA", price: 120.0, volume: 100, timestamp: now + 20 });
  const spikeRes = auditMarketTick({ symbol: "NVDA", price: 150.0, volume: 100, timestamp: now + 30 }); // 25% spike
  assert.ok(spikeRes.reasons.some(r => r.includes("ABNORMAL_PRICE_SPIKE")));
  assert.equal(spikeRes.valid, false);

  // 6. Cross-venue price divergence
  const divRes = auditMarketTick({
    symbol: "AAPL",
    price: 220.0,
    volume: 50,
    timestamp: now + 40,
    secondaryVenuePrice: 240.0 // > 9% divergence
  });
  assert.ok(divRes.reasons.some(r => r.includes("CROSS_VENUE_DIVERGENCE")));

  // 7. Check lock status
  const lockStatus = isTradingLockedForSymbol("NVDA");
  assert.equal(lockStatus.isLocked, true);
});

test("Batch 1: Latency Pipeline Profiler & Percentiles", () => {
  resetLatencyProfiler();
  const traceId = startPipelineTrace("bench-trace-1");

  recordPipelineStage(traceId, "ingestion", 0.52);
  recordPipelineStage(traceId, "featureGen", 0.85);
  recordPipelineStage(traceId, "modelInference", 1.20);
  recordPipelineStage(traceId, "agentConsensus", 0.45);
  recordPipelineStage(traceId, "riskAudit", 0.35);
  recordPipelineStage(traceId, "executionSlicing", 0.25);
  recordPipelineStage(traceId, "brokerAck", 2.10);

  const endRes = endPipelineTrace(traceId);
  assert.equal(endRes.traceId, "bench-trace-1");
  assert.ok(endRes.totalDurationMs >= 0);
  assert.equal(endRes.decisionToExecutionMs, 2.25); // 1.20 + 0.45 + 0.35 + 0.25
  assert.equal(endRes.cpuLatencyMs, 2.85); // 0.85 + 1.20 + 0.45 + 0.35
  assert.equal(endRes.networkAndBrokerLatencyMs, 2.62); // 0.52 + 2.10

  const telemetry = getPipelineLatencyTelemetry();
  assert.equal(telemetry.totalTracesCompleted, 1);
  assert.ok(telemetry.stageBreakdown.ingestion.samples > 0);
  assert.ok(telemetry.decisionToExecutionMetrics.samples > 0);
});

test("Batch 1: Market Regime Engine Dynamic Strategy Weighting", () => {
  // 1. Trending Regime (Strong upward monotonic series)
  const trendingPrices = [100, 101, 102, 103.5, 105, 106.8, 108.5, 110, 112, 114, 116.5, 119, 121.5, 124, 126.5, 129];
  const trendRes = classifyMarketRegime(trendingPrices, { vpin: 0.20, spreadBps: 2.0 });
  assert.equal(trendRes.regime, REGIMES.TRENDING);
  assert.ok(trendRes.strategyWeights.Trend_Following >= 0.30);
  assert.ok(trendRes.strategyWeights.Momentum_Alpha >= 0.20);

  // 2. Mean-Reverting Regime (Oscillating range)
  const oscillatingPrices = [100, 102, 99.5, 101.5, 99.8, 102.2, 100.1, 101.8, 99.7, 102.0, 100.2, 101.7, 99.9, 102.1, 100.0, 101.9];
  const meanRevRes = classifyMarketRegime(oscillatingPrices, { vpin: 0.20, spreadBps: 2.0 });
  assert.equal(meanRevRes.regime, REGIMES.MEAN_REVERTING);
  assert.ok(meanRevRes.strategyWeights.Mean_Reversion >= 0.35);

  // 3. Crisis Override (Flash Crash VPIN >= 0.65)
  const crisisRes = classifyMarketRegime(trendingPrices, { vpin: 0.72 });
  assert.equal(crisisRes.regime, REGIMES.CRISIS);
  assert.equal(crisisRes.strategyWeights.Defensive_Cash, 1.00);
  assert.equal(crisisRes.strategyWeights.Trend_Following, 0.00);

  // 4. Illiquid Market (Wide spreads > 25 bps)
  const illiquidRes = classifyMarketRegime(trendingPrices, { spreadBps: 35.0 });
  assert.equal(illiquidRes.regime, REGIMES.ILLIQUID);
  assert.ok(illiquidRes.strategyWeights.Fundamental_Moat >= 0.35);

  // 5. News Shock
  const newsRes = classifyMarketRegime(trendingPrices, { newsSentimentVelocity: 4.5 });
  assert.equal(newsRes.regime, REGIMES.NEWS_SHOCK);
  assert.ok(newsRes.strategyWeights.Microstructure_PMM >= 0.35);
});

test("Batch 1: Auditable AI Weighted Evidence Engine & Invalidator Gate", () => {
  const p1 = createAgentProposal({
    symbol: "BTCUSDT",
    agent: "Technical_ML",
    signal: "BUY",
    confidence: 0.88,
    expected_return: 0.035,
    expected_loss: 0.012,
    time_horizon: "4h",
    evidence: ["Golden Cross EMA(20) > EMA(50)", "CVD accumulation +$2.1M"],
    invalidators: ["Price breaks below 87000"]
  });
  assert.equal(p1.signal, "BUY");
  assert.equal(p1.riskRewardRatio, 2.92);

  const p2 = createAgentProposal({
    symbol: "BTCUSDT",
    agent: "TradeMaster_RL",
    signal: "BUY",
    confidence: 0.82,
    expected_return: 0.030,
    expected_loss: 0.010,
    time_horizon: "4h",
    evidence: ["PPO policy action: ACCUMULATE with advantage +1.28"],
    invalidators: ["VPIN exceeds 0.65"]
  });

  const p3 = createAgentProposal({
    symbol: "BTCUSDT",
    agent: "Fundamental_Moat",
    signal: "BUY",
    confidence: 0.90,
    expected_return: 0.040,
    expected_loss: 0.015,
    time_horizon: "4h",
    evidence: ["Wide Moat rating + Graham DCF margin of safety 22%"],
    invalidators: []
  });

  // Valid synthesis (No invalidators triggered)
  const synth = synthesizeEvidence({
    symbol: "BTCUSDT",
    proposals: [p1, p2, p3],
    regime: "TRENDING",
    currentPrice: 88500,
    invalidatorContext: { vpin: 0.30 }
  });

  assert.equal(synth.consensusSignal, "BUY");
  assert.ok(synth.consensusConfidence >= 0.80);
  assert.ok(synth.expected_return >= 0.03);
  assert.ok(synth.riskRewardRatio >= 2.0);
  assert.equal(synth.disqualifiedProposalsCount, 0);
  assert.equal(synth.verdict, "HIGH_CONVICTION_SETUP");

  // Invalidator triggered: Price dropped below 87000, disqualifying p1
  const invalidSynth = synthesizeEvidence({
    symbol: "BTCUSDT",
    proposals: [p1, p2, p3],
    regime: "TRENDING",
    currentPrice: 86500, // Breaches p1 invalidator
    invalidatorContext: { vpin: 0.30 }
  });
  assert.equal(invalidSynth.disqualifiedProposalsCount, 1);
  assert.ok(invalidSynth.disqualifiedProposals[0].reason.includes("breached invalidation level"));
});

test("Batch 1: REST API Endpoints for Data Quality, Latency, Regime, and Evidence", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    // 1. Data quality status
    const dqRes = await fetch(`http://127.0.0.1:${port}/api/v100/data-quality/status`);
    assert.equal(dqRes.status, 200);
    const dqData = await dqRes.json();
    assert.equal(dqData.sentinelStatus, "DATA_QUALITY_SENTINEL_ONLINE");

    // 2. Data quality audit tick
    const auditRes = await fetch(`http://127.0.0.1:${port}/api/v100/data-quality/audit-tick`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "BTCUSDT", price: 88700, volume: 1.2 })
    });
    assert.equal(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.equal(auditData.valid, true);

    // 3. Latency metrics
    const latRes = await fetch(`http://127.0.0.1:${port}/api/v100/latency/metrics`);
    assert.equal(latRes.status, 200);
    const latData = await latRes.json();
    assert.equal(latData.engine, "LATENCY_PIPELINE_PROFILER_v100");

    // 4. Regime status
    const regRes = await fetch(`http://127.0.0.1:${port}/api/v100/regime/status?vpin=0.20&spreadBps=4`);
    assert.equal(regRes.status, 200);
    const regData = await regRes.json();
    assert.ok(regData.regime);
    assert.ok(regData.strategyWeights);

    // 5. Evidence synthesize
    const evRes = await fetch(`http://127.0.0.1:${port}/api/v100/evidence/synthesize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: "BTCUSDT",
        proposals: [{ agent: "Technical_ML", signal: "BUY", confidence: 0.85, expected_return: 0.03, expected_loss: 0.01 }]
      })
    });
    assert.equal(evRes.status, 200);
    const evData = await evRes.json();
    assert.equal(evData.consensusSignal, "BUY");
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
});
