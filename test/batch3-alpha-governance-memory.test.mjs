import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  evaluateWalkForwardAlpha,
  generateCpcvSplits
} from "../src/walkforward-alpha-evaluator.mjs";
import {
  tradeAttributionMemory,
  recordTradePostMortem,
  queryTradingLessons,
  getTradeMemoryStatus
} from "../src/trade-attribution-memory.mjs";
import {
  modelGovernanceRegistry,
  getModelRegistryStatus,
  registerNewModel,
  promoteModelStage,
  deprecateModel,
  DEPLOYMENT_STAGES
} from "../src/model-governance-registry.mjs";
import {
  sourceQualityEvaluator,
  evaluateSourceQuality,
  getSourceQualityStatus,
  isSourceEligibleForConsensus
} from "../src/source-quality-evaluator.mjs";
import { app } from "../server.mjs";

test("Batch 3: Walk-Forward Out-of-Sample Alpha Attribution & CPCV Splits", () => {
  // 1. Generate CPCV purged splits
  const splits = generateCpcvSplits(1000, 5, 0.20, 10);
  assert.equal(splits.length, 5);
  assert.ok(splits[0].trainRanges.length > 0);
  assert.equal(splits[0].testRange[1] - splits[0].testRange[0], 40);

  // 2. Realistic out-of-sample alpha simulation
  const prices = [];
  let cur = 100;
  for (let i = 0; i < 200; i++) {
    cur += (Math.sin(i / 5) * 0.8) + 0.15; // Upward trending sinusoidal series
    prices.push(Number(cur.toFixed(2)));
  }

  const signals = [
    { index: 5, signal: "BUY", confidence: 0.85 },
    { index: 25, signal: "SELL", confidence: 0.80 },
    { index: 40, signal: "BUY", confidence: 0.90 },
    { index: 65, signal: "SELL", confidence: 0.75 },
    { index: 90, signal: "BUY", confidence: 0.88 },
    { index: 130, signal: "SELL", confidence: 0.82 }
  ];

  const evalRes = evaluateWalkForwardAlpha({
    prices,
    signals,
    initialCapitalUsd: 100000,
    feeRateBps: 4.0,
    slippageRateBps: 3.0
  });

  assert.equal(evalRes.status, "EVALUATION_COMPLETED");
  assert.ok(evalRes.summary.totalTradesCount >= 2);
  assert.ok(evalRes.summary.winRatePct >= 50.0);
  assert.ok(evalRes.summary.profitFactor > 1.0);
  assert.ok(evalRes.riskAdjusted.sharpeRatio !== undefined);
  assert.ok(evalRes.riskAdjusted.sortinoRatio !== undefined);
  assert.ok(evalRes.executionDrag.totalFeesPaidUsd > 0);
  assert.ok(evalRes.executionDrag.totalSlippageCostUsd > 0);
});

test("Batch 3: Trade Attribution & Post-Mortem Memory Vault", () => {
  tradeAttributionMemory.reset();

  // 1. Record winning trade
  const win = recordTradePostMortem({
    symbol: "BTCUSDT",
    prediction: "BUY",
    confidence: 0.88,
    expected_return: 0.035,
    actual_return: 0.028,
    regime: "TRENDING",
    entryPrice: 88000,
    exitPrice: 90464,
    slippageCostUsd: 4.20,
    feePaidUsd: 3.10
  });
  assert.equal(win.isSuccess, true);
  assert.ok(win.lesson.includes("TRENDING"));

  // 2. Record losing trade with auto-diagnosed mistake and lesson
  const loss = recordTradePostMortem({
    symbol: "ETHUSDT",
    prediction: "BUY",
    confidence: 0.82,
    expected_return: 0.030,
    actual_return: -0.015,
    regime: "HIGH_VOLATILITY",
    entryPrice: 3450,
    exitPrice: 3398
  });
  assert.equal(loss.isSuccess, false);
  assert.ok(loss.mistake.includes("volatility"));
  assert.ok(loss.lesson.includes("Kelly"));

  // 3. Query lessons learned
  const lessons = queryTradingLessons({ regime: "HIGH_VOLATILITY" });
  assert.equal(lessons.totalFound, 1);
  assert.equal(lessons.lessons[0].symbol, "ETHUSDT");

  const status = getTradeMemoryStatus();
  assert.equal(status.totalPostMortemsStored, 2);
  assert.equal(status.successfulTradesCount, 1);
  assert.equal(status.failedTradesCount, 1);
  assert.equal(status.winRatePct, 50.0);
});

test("Batch 3: Model Governance Registry & Promotion Gate", () => {
  const status = getModelRegistryStatus();
  assert.ok(status.totalModelsRegistered >= 3);
  assert.ok(status.productionModels.some(m => m.modelId.includes("TradeMaster")));
  assert.ok(status.productionModels.some(m => m.modelId.includes("AFML")));

  // Register a candidate model in RESEARCH
  const candidate = registerNewModel({
    modelId: "MeanRev-Bollinger-v101",
    name: "Adaptive Bollinger Mean Reversion",
    version: "101.1",
    dataset: "Binance 5m ETH 2025-2026",
    backtestSharpe: 2.20,
    walkForwardSharpe: 1.85,
    deflatedSharpeRatio: 1.90,
    maxDrawdownPct: 8.5,
    outOfSampleTradesCount: 110,
    initialStage: DEPLOYMENT_STAGES.RESEARCH
  });
  assert.equal(candidate.currentStage, DEPLOYMENT_STAGES.RESEARCH);

  // Promote to PAPER (eligible: DSR 1.90 >= 1.2)
  const paperPromo = promoteModelStage("MeanRev-Bollinger-v101", DEPLOYMENT_STAGES.PAPER);
  assert.equal(paperPromo.success, true);
  assert.equal(paperPromo.currentStage, DEPLOYMENT_STAGES.PAPER);

  // Attempt promote to PRODUCTION without admin authorization (must be rejected)
  const rejectPromo = promoteModelStage("MeanRev-Bollinger-v101", DEPLOYMENT_STAGES.PRODUCTION, false);
  assert.equal(rejectPromo.success, false);
  assert.ok(rejectPromo.reasons.some(r => r.includes("Admin Authorization")));

  // Promote to PRODUCTION with admin authorization
  const prodPromo = promoteModelStage("MeanRev-Bollinger-v101", DEPLOYMENT_STAGES.PRODUCTION, true);
  assert.equal(prodPromo.success, true);
  assert.equal(prodPromo.currentStage, DEPLOYMENT_STAGES.PRODUCTION);

  // Deprecate model
  const depRes = deprecateModel("MeanRev-Bollinger-v101", "Out-of-sample decay observed");
  assert.equal(depRes.success, true);
  assert.equal(depRes.currentStage, DEPLOYMENT_STAGES.DEPRECATED);
});

test("Batch 3: Source Quality Scoring & Automated Quarantine", () => {
  // 1. High-performing source is healthy
  const highQuality = evaluateSourceQuality("financial-machine-learning", {
    accuracy: 95,
    freshness: 90,
    reliability: 92,
    uniqueness: 95,
    maintenance: 90
  });
  assert.ok(highQuality.totalScore >= 85);
  assert.equal(highQuality.isQuarantined, false);
  assert.equal(isSourceEligibleForConsensus("financial-machine-learning"), true);

  // 2. Poor-performing source (< 60) is quarantined
  const poorQuality = evaluateSourceQuality("low-quality-test-repo", {
    accuracy: 40,
    freshness: 30,
    reliability: 40,
    uniqueness: 30,
    maintenance: 30
  });
  assert.ok(poorQuality.totalScore < 60);
  assert.equal(poorQuality.isQuarantined, true);
  assert.equal(isSourceEligibleForConsensus("low-quality-test-repo"), false);

  const status = getSourceQualityStatus();
  assert.ok(status.quarantinedSourcesCount >= 1);
  assert.ok(status.quarantinedList.some(q => q.repository === "low-quality-test-repo"));

  // 3. Recovery restores source
  const recovered = evaluateSourceQuality("low-quality-test-repo", {
    accuracy: 85,
    freshness: 80,
    reliability: 80,
    uniqueness: 80,
    maintenance: 80
  });
  assert.ok(recovered.totalScore >= 60);
  assert.equal(recovered.isQuarantined, false);
  assert.equal(isSourceEligibleForConsensus("low-quality-test-repo"), true);
});

test("Batch 3: REST API Endpoints for Walk-Forward, Memory, Governance, and Source Quality", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    // 1. Walk-Forward Splits
    const splitsRes = await fetch(`http://127.0.0.1:${port}/api/v100/walk-forward/splits?bars=500&folds=4`);
    assert.equal(splitsRes.status, 200);
    const splitsData = await splitsRes.json();
    assert.equal(splitsData.length, 4);

    // 2. Memory Post-Mortem Endpoint
    const postMortemRes = await fetch(`http://127.0.0.1:${port}/api/v100/memory/post-mortem`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: "BTCUSDT",
        prediction: "BUY",
        confidence: 0.85,
        expected_return: 0.03,
        actual_return: 0.025,
        regime: "TRENDING"
      })
    });
    assert.equal(postMortemRes.status, 200);
    const postMortemData = await postMortemRes.json();
    assert.equal(postMortemData.isSuccess, true);

    // 3. Memory Status Endpoint
    const memStatusRes = await fetch(`http://127.0.0.1:${port}/api/v100/memory/status`);
    assert.equal(memStatusRes.status, 200);
    const memStatusData = await memStatusRes.json();
    assert.equal(memStatusData.vaultStatus, "TRADE_ATTRIBUTION_MEMORY_ONLINE");

    // 4. Model Registry Status
    const modelRes = await fetch(`http://127.0.0.1:${port}/api/v100/models/status`);
    assert.equal(modelRes.status, 200);
    const modelData = await modelRes.json();
    assert.equal(modelData.registryStatus, "MODEL_GOVERNANCE_REGISTRY_ONLINE");

    // 5. Source Quality Status
    const sourceRes = await fetch(`http://127.0.0.1:${port}/api/v100/sources/quality-status`);
    assert.equal(sourceRes.status, 200);
    const sourceData = await sourceRes.json();
    assert.equal(sourceData.evaluatorStatus, "SOURCE_QUALITY_EVALUATOR_ONLINE");
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
});
