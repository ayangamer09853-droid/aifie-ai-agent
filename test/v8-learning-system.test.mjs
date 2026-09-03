import test from "node:test";
import assert from "node:assert/strict";
import { runInternetLearningCycle } from "../src/internet-learning-agent.mjs";
import { runPatternLearningCycle, getPatternConfidenceMultiplier } from "../src/pattern-learning-engine.mjs";
import { calculate6FactorTradeScore } from "../src/ai-trade-scorer.mjs";
import { getFutureUpgradesStatus, evaluateSandboxPromotionGate } from "../src/future-upgrades-bridge.mjs";

test("runInternetLearningCycle runs 7-step continuous learning cycle", () => {
  const intel = runInternetLearningCycle();
  assert.equal(intel.status, "LEARNING_CYCLE_COMPLETE");
  assert.equal(intel.learningCycle.length, 7);
  assert.ok(intel.internetIntelligence.macroSentiment);
});

test("runPatternLearningCycle tunes pattern confidence weights from trade memory", () => {
  const pattern = runPatternLearningCycle();
  assert.equal(pattern.engineStatus, "PATTERN_LEARNING_ACTIVE");
  assert.ok(pattern.patternWeights["Liquidity Sweep + FVG + AVWAP"]);

  const mult = getPatternConfidenceMultiplier("Liquidity Sweep + FVG + AVWAP");
  assert.equal(mult, 1.25);
});

test("calculate6FactorTradeScore scores trades out of 100 with 6 breakdown factors", () => {
  const score = calculate6FactorTradeScore({ symbol: "AAPL", prices: [150, 152, 154, 156, 158] });
  assert.ok(score.totalScore >= 10 && score.totalScore <= 100);
  assert.ok(score.classification);
  assert.equal(Object.keys(score.breakdown).length, 6);
});

test("evaluateSandboxPromotionGate enforces walk-forward validation and out-of-sample testing", () => {
  const promo = evaluateSandboxPromotionGate({ name: "Test_Model", outOfSampleSharpe: 2.1, walkForwardWinRate: 75.0, maxDrawdown: 5.0 });
  assert.equal(promo.gateStatus, "PROMOTED_TO_LIVE_PAPER_EXECUTION");

  const future = getFutureUpgradesStatus();
  assert.ok(future.futureUpgrades.reinforcementLearning);
});
