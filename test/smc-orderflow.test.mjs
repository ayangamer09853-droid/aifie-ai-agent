import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSmartMoneyStructure } from "../src/smc-market-structure.mjs";
import { calculateOrderFlowCvd } from "../src/order-flow-cvd.mjs";
import { calculateVolumeProfile, calculateAnchoredVwap } from "../src/volume-profile-auction.mjs";
import { evaluateInstitutionalConfluence } from "../src/smc-confluence-matrix.mjs";

test("analyzeSmartMoneyStructure detects BOS, CHoCH, OB, FVG, and Liquidity Sweeps", () => {
  const smc = analyzeSmartMoneyStructure([140, 142, 141, 145, 148, 150, 152, 155]);
  assert.ok(smc.marketStructureShift);
  assert.ok(smc.orderBlock.zoneLow > 0);
  assert.ok(smc.fairValueGap.gapHigh > 0);
  assert.ok(smc.liquidityPools.buySideLiquidityBSL > 0);
});

test("calculateOrderFlowCvd computes Cumulative Volume Delta and Footprint", () => {
  const cvd = calculateOrderFlowCvd("AAPL", [150, 151, 152, 153, 154]);
  assert.equal(cvd.symbol, "AAPL");
  assert.ok(cvd.currentCvd !== undefined);
  assert.ok(cvd.bidAskImbalance.dominantSide);
});

test("calculateVolumeProfile computes POC, VAH, VAL and Anchored VWAP", () => {
  const prices = [150, 152, 151, 153, 155];
  const vp = calculateVolumeProfile(prices);
  assert.ok(vp.pointOfControlPOC > 0);
  assert.ok(vp.valueAreaHighVAH > vp.valueAreaLowVAL);

  const avwap = calculateAnchoredVwap(prices);
  assert.ok(avwap.anchoredVwapPrice > 0);
  assert.ok(avwap.bands.upper1Sigma > avwap.anchoredVwapPrice);
});

test("evaluateInstitutionalConfluence computes AI score, 3RR/5RR targets, and Kelly Criterion", () => {
  const conf = evaluateInstitutionalConfluence("AAPL", [150, 152, 154, 156, 158]);
  assert.ok(conf.institutionalAiScore >= 10 && conf.institutionalAiScore <= 99);
  assert.ok(conf.riskRewardTargets.tp1_3RR > conf.currentPrice);
  assert.ok(conf.riskRewardTargets.tp2_5RR > conf.riskRewardTargets.tp1_3RR);
  assert.ok(conf.kellyCriterion.kellyOptimalFraction > 0);
});
