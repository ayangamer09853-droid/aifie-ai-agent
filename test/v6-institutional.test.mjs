import test from "node:test";
import assert from "node:assert/strict";
import { executeTwapOrder, executeVwapOrder } from "../src/algorithmic-execution.mjs";
import { runGeneticOptimizer } from "../src/genetic-strategy-optimizer.mjs";
import { calculateValueAtRisk, runMacroStressTest } from "../src/var-stress-testing.mjs";
import { broadcastMultiChannelAlert } from "../src/webhook-integrations.mjs";
import { getHedgeFundCommitteeStatus, runHedgeFundCycle } from "../src/hedge-fund-agents.mjs";
import { createPaperState } from "../src/paper-engine.mjs";
import { calculateRSI } from "../src/technical-indicators.mjs";
import { calculateEulerRiskBudgetDecomposition } from "../src/euler-risk-budgeting-engine.mjs";
import { analyzeSmartMoneyStructure } from "../src/smc-market-structure.mjs";
import { calculateVolumeProfile, calculateAnchoredVwap } from "../src/volume-profile-auction.mjs";
import { calculateOrderFlowCvd } from "../src/order-flow-cvd.mjs";
import { calculateEqualRiskContribution, calculateHalfKellyFraction } from "../src/portfolio-risk-parity-governor.mjs";
import { calculateImplementationShortfall } from "../src/hft-order-slicing-router.mjs";
import { calculateCompoundedYieldProjection } from "../src/perpetual-compounding-auto-reinvestor.mjs";

test("executeTwapOrder slices large quantity into child orders", () => {
  const twap = executeTwapOrder({ symbol: "AAPL", side: "BUY", totalQuantity: 100, slicesCount: 5, curPrice: 150.0 });
  assert.equal(twap.strategy, "TWAP_ALGORITHMIC_SLICING");
  assert.equal(twap.totalQuantity, 100);
  assert.equal(twap.childOrders.length, 5);
  assert.ok(twap.avgFillPrice > 0);
});

test("executeVwapOrder slices quantity according to volume weights", () => {
  const vwap = executeVwapOrder({ symbol: "AAPL", side: "BUY", totalQuantity: 100, curPrice: 150.0 });
  assert.equal(vwap.strategy, "VWAP_VOLUME_PROFILE_SLICING");
  assert.equal(vwap.childOrders.length, 4);
});

test("runGeneticOptimizer evolves candidate strategies over generations", () => {
  const opt = runGeneticOptimizer({ populationSize: 5, generations: 2 });
  assert.equal(opt.optimizerStatus, "COMPLETED");
  assert.ok(opt.topCandidate.fitnessScore > 0);
});

test("calculateValueAtRisk measures daily VaR and expected shortfall", () => {
  const varResult = calculateValueAtRisk(100000, 0.95, 1.5);
  assert.equal(varResult.portfolioValue, 100000);
  assert.ok(varResult.dailyVaRAmount > 0);
  assert.ok(varResult.expectedShortfallCVaR > varResult.dailyVaRAmount);
});

test("runMacroStressTest simulates historical market crash scenarios", () => {
  const stress = runMacroStressTest(100000);
  assert.equal(stress.scenarios.length, 3);
  assert.ok(stress.scenarios[0].projectedLoss > 0);
});

test("broadcastMultiChannelAlert broadcasts safely when unconfigured", async () => {
  const bc = await broadcastMultiChannelAlert({ title: "TEST", text: "Hello" });
  assert.ok(bc.results);
  assert.equal(bc.results.discord.sent, false);
});

test("runHedgeFundCycle integrates TWAP slicing and VaR metrics into XAI rationale", async () => {
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100000 } });
  const orders = [];

  const status = await runHedgeFundCycle({ symbol: "AAPL", paper, orders });
  assert.ok(status.specialistReports.riskManagement.valueAtRisk95);
  assert.ok(status.tradeOutputFormat);
});

test("calculateRSI returns neutral 50 for flatline prices without division errors", () => {
  const flatPrices = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
  const rsi = calculateRSI(flatPrices, 14);
  assert.equal(rsi, 50);
});

test("calculateEulerRiskBudgetDecomposition handles custom unlisted assets without producing NaN", () => {
  const res = calculateEulerRiskBudgetDecomposition({ weights: { TSLA: 0.5, UNLISTED_CRYPTO: 0.5 } });
  assert.ok(Number.isFinite(res.annualizedPortfolioVolPct));
  assert.ok(Number.isFinite(res.percentageRiskContributions.TSLA));
  assert.ok(Number.isFinite(res.percentageRiskContributions.UNLISTED_CRYPTO));
});

test("SMC, CVD, and Volume Profile handle undefined or empty prices gracefully", () => {
  const smc = analyzeSmartMoneyStructure(undefined);
  assert.ok(smc.currentPrice > 0);
  assert.ok(smc.marketStructureShift);

  const cvd = calculateOrderFlowCvd("BTC", null);
  assert.ok(cvd.symbol);
  assert.ok(cvd.cvdTrend);

  const vp = calculateVolumeProfile(undefined);
  assert.ok(vp.pointOfControlPOC > 0);

  const avwap = calculateAnchoredVwap(null);
  assert.ok(avwap.anchoredVwapPrice > 0);
});

test("Risk parity, Kelly, shortfall, and compounding handles zero and boundary conditions safely", () => {
  const erc = calculateEqualRiskContribution({ ASSET_A: 0, ASSET_B: 0.2 });
  assert.ok(Number.isFinite(erc.ercWeightsPercent.ASSET_A));

  const kelly = calculateHalfKellyFraction(0.6, 0);
  assert.ok(Number.isFinite(kelly.halfKellyFraction));

  const shortfall = calculateImplementationShortfall(0, 10, 100);
  assert.ok(Number.isFinite(shortfall.shortfallBps));

  const yieldProj = calculateCompoundedYieldProjection(0, 15, 30);
  assert.ok(Number.isFinite(yieldProj.futureValueUSD));
  assert.ok(Number.isFinite(yieldProj.compoundGrowthPercent));
});
