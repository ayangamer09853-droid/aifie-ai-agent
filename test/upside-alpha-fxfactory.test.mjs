import test from "node:test";
import assert from "node:assert/strict";
import {
  getUpsideOnlyStatus,
  submitUpsidePrediction,
  evaluateUpsideProfitShares,
  withdrawUpsideProfit
} from "../src/upside-only-real-money-engine.mjs";
import { calculateAlphaConsensus } from "../src/alpha-consensus-matrix-engine.mjs";
import {
  getFxFactoryCalendar,
  checkFxFactoryVolatilityShield,
  syncFxFactoryLiveEvents
} from "../src/fxfactory-macro-calendar-engine.mjs";
import {
  runTrinityProfitCycle,
  getTrinityOverview
} from "../src/upside-alpha-fxfactory-trinity.mjs";

test("UpsideOnly status provides real money profit balance and BayesShield tier", () => {
  const status = getUpsideOnlyStatus();
  assert.equal(status.success, true);
  assert.ok(status.account.realMoneyProfitBalance > 0);
  assert.equal(status.concept, "ZERO_CAPITAL_DOWNSIDE_REAL_MONEY_PROFIT_SHARING");
  assert.ok(status.account.accuracyMetrics.winRate);
});

test("submitUpsidePrediction deploys proprietary capital on high-conviction signals", () => {
  const res = submitUpsidePrediction({
    symbol: "BTC/USDT",
    direction: "BULLISH",
    convictionScore: 90.0
  });
  assert.equal(res.success, true);
  assert.equal(res.prediction.bayesShieldApproval, "EXECUTED_WITH_PROP_CAPITAL");
  assert.ok(res.prediction.propCapitalAllocated > 0);
  assert.ok(res.prediction.estimatedProfitShare > 0);
});

test("evaluateUpsideProfitShares credits real money payouts without personal downside risk", () => {
  const initialBalance = getUpsideOnlyStatus().account.realMoneyProfitBalance;
  const settlement = evaluateUpsideProfitShares({ winRateBoost: 1.5 });
  assert.equal(settlement.success, true);
  assert.ok(settlement.currentRealMoneyBalance >= initialBalance);
});

test("withdrawUpsideProfit validates balance and records payout transaction", () => {
  const balanceBefore = getUpsideOnlyStatus().account.realMoneyProfitBalance;
  const withdrawRes = withdrawUpsideProfit({ amount: 100.00, destination: "BANK_UPI (trader@okaxis)" });
  assert.equal(withdrawRes.success, true);
  assert.equal(withdrawRes.payoutRecord.amount, 100.00);
  assert.equal(withdrawRes.remainingBalance, balanceBefore - 100.00);
});

test("withdrawUpsideProfit rejects withdrawals exceeding available balance", () => {
  const errRes = withdrawUpsideProfit({ amount: 9999999.00 });
  assert.equal(errRes.success, false);
  assert.match(errRes.error, /Insufficient/);
});

test("calculateAlphaConsensus evaluates 6 independent alpha vectors and requires >= 80% consensus", () => {
  const res = calculateAlphaConsensus({ symbol: "BTC/USDT" });
  assert.equal(res.success, true);
  assert.equal(res.alphaVectors.length, 6);
  assert.equal(res.consensusThresholdRequired, 80.0);
  assert.ok(res.consensusPercentage >= 80.0);
  assert.equal(res.isConsensusApproved, true);
  assert.equal(res.recommendedDirection, "BUY");
  assert.match(res.riskExecutionGuidance, /Execute/);
});

test("getFxFactoryCalendar returns scheduled high-impact Red-Folder releases", () => {
  const cal = getFxFactoryCalendar();
  assert.equal(cal.success, true);
  assert.ok(cal.events.length >= 3);
  assert.ok(cal.events.some(e => e.event.includes("CPI")));
  assert.ok(cal.events.some(e => e.event.includes("FOMC")));
});

test("checkFxFactoryVolatilityShield verifies safe calendar window and spread multiplier", () => {
  const shield = checkFxFactoryVolatilityShield();
  assert.equal(shield.isShieldActive, false);
  assert.equal(shield.shieldVerdict, "SAFE_CALENDAR_WINDOW_CLEARED");
  assert.equal(shield.recommendedSpreadMultiplier, 1.0);
});

test("syncFxFactoryLiveEvents refreshes economic calendar feed", () => {
  const sync = syncFxFactoryLiveEvents();
  assert.equal(sync.success, true);
  assert.ok(sync.syncedEventsCount > 0);
});

test("runTrinityProfitCycle coordinates FxFactory, Alpha Consensus, and UpsideOnly", () => {
  const trinity = runTrinityProfitCycle({ symbol: "BTC/USDT", currentPrice: 87500.00 });
  assert.equal(trinity.success, true);
  assert.equal(trinity.cycleStage, "STAGE_3_TRINITY_CYCLE_COMPLETED");
  assert.equal(trinity.verdict, "REAL_MONEY_UPSIDE_PROFIT_HARVESTED");
  assert.ok(trinity.alphaConsensusScore.includes("6-Vector Confluence Approved"));
  assert.equal(trinity.guarantee, "100% Zero Personal Capital Risk (BayesShield Proprietary Capital Deployed)");
});

test("getTrinityOverview provides complete architecture state", () => {
  const overview = getTrinityOverview();
  assert.equal(overview.success, true);
  assert.ok(overview.components.upsideOnly);
  assert.ok(overview.components.fxfactoryCalendar);
});
