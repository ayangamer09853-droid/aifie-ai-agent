import test from "node:test";
import assert from "node:assert/strict";
import { calculatePairsArbitrage } from "../src/stat-arb-pairs-engine.mjs";
import { analyzeOrderBookMicrostructure } from "../src/microstructure-queue-engine.mjs";
import { evaluateMacroGlobalRisk } from "../src/macro-knowledge-nlp.mjs";
import { verifyConstitutionalRiskLimits } from "../src/constitutional-risk-contract.mjs";

test("calculatePairsArbitrage computes cointegrated spread z-scores and StatArb signals", () => {
  const statArb = calculatePairsArbitrage("BTC_ETH");
  assert.equal(statArb.pairSymbol, "BTC_ETH");
  assert.equal(statArb.assetA, "BTC");
  assert.equal(statArb.assetB, "ETH");
  assert.ok(statArb.spreadZScore !== undefined);
  assert.ok(statArb.statArbSignal);
});

test("analyzeOrderBookMicrostructure evaluates Level 2/3 depth and micro-price imbalance", () => {
  const micro = analyzeOrderBookMicrostructure("AAPL");
  assert.equal(micro.symbol, "AAPL");
  assert.ok(micro.microPriceImbalance);
  assert.ok(micro.l2Level3Depth.bids.length > 0);
});

test("evaluateMacroGlobalRisk maps FOMC probabilities and geopolitical risk indices", () => {
  const macro = evaluateMacroGlobalRisk();
  assert.ok(macro.macroRegime);
  assert.ok(macro.fomcRatePauseProbability);
  assert.equal(macro.macroEventVectors.length, 3);
});

test("verifyConstitutionalRiskLimits verifies immutable safety bounds", () => {
  const safe = verifyConstitutionalRiskLimits({ tradeRiskPercent: 0.8, dailyDrawdownPercent: 1.5 });
  assert.equal(safe.constitutionalPassed, true);
  assert.equal(safe.guarantee, "CONSTITUTIONAL_RISK_LIMITS_VERIFIED_SAFE");

  const breached = verifyConstitutionalRiskLimits({ tradeRiskPercent: 2.5, dailyDrawdownPercent: 1.5 });
  assert.equal(breached.constitutionalPassed, false);
  assert.equal(breached.guarantee, "CONSTITUTIONAL_RISK_BREACH_TRADE_BLOCKED");
});
