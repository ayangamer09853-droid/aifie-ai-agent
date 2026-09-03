import test from "node:test";
import assert from "node:assert/strict";
import {
  runStage1Scanner,
  runStage2SignalEngine,
  runStage3TradePlanner,
  runStage4RiskEngine,
  runStage5247Monitor,
  executeHumanDecision,
  runFull5StagePipelineCycle,
  get5StagePipelineStatus,
  SIGNAL_ARCHETYPES
} from "../src/modular-5stage-ai-trading-machine.mjs";

test("1. STAGE 1 SCANNER — discovers raw market data and volume velocity", async () => {
  const scan = await runStage1Scanner();
  assert.equal(scan.stage, "STAGE_1_MARKET_SCANNER");
  assert.equal(scan.status, "SCAN_COMPLETE");
  assert.ok(scan.totalScanned >= 8);
  assert.ok(scan.opportunities.every(o => o.currentPrice > 0));
  assert.ok(scan.opportunities.every(o => o.symbol.length > 0));
});

test("2. STAGE 2 SIGNAL ENGINE — categorizes into 5 archetypes with confidence scores", () => {
  const archetypes = Object.keys(SIGNAL_ARCHETYPES);
  assert.equal(archetypes.length, 5);

  const sampleOpportunity = {
    symbol: "BTCUSDT",
    currentPrice: 81200,
    isVolumeSurging: true,
    priceChange24h: 3.5
  };

  const signal = runStage2SignalEngine(sampleOpportunity);
  assert.equal(signal.stage, "STAGE_2_SIGNAL_ENGINE");
  assert.equal(signal.symbol, "BTCUSDT");
  assert.ok(signal.confidenceScore >= 0 && signal.confidenceScore <= 100);
  assert.ok(typeof signal.isValidSetup === "boolean");
  assert.ok(signal.archetype.length > 0);
});

test("3. STAGE 3 TRADE PLANNER — builds complete trade blueprint with invalidation & RRR", () => {
  const signal = {
    symbol: "NVDA",
    currentPrice: 120.00,
    direction: "BUY_MOMENTUM",
    confidenceScore: 84,
    archetype: "Breakout"
  };

  const plan = runStage3TradePlanner(signal);
  assert.equal(plan.stage, "STAGE_3_TRADE_PLANNER");
  assert.equal(plan.symbol, "NVDA");
  assert.ok(plan.entryZone.from < plan.entryZone.to);
  assert.ok(plan.stopLoss.price < 120.00);
  assert.ok(plan.profitTargets.target1 > 120.00);
  assert.ok(plan.profitTargets.target2 > plan.profitTargets.target1);
  assert.ok(plan.invalidation.price < plan.stopLoss.price, "Invalidation must be beyond stop loss");
  assert.ok(plan.numericRR >= 2.0, "Minimum R:R must be >= 2.0");
});

test("4. STAGE 4 RISK ENGINE — enforces pass/fail capital protection rules", () => {
  const validPlan = {
    planId: "PLAN_TEST_001",
    symbol: "SOLUSDT",
    currentPrice: 145.00,
    stopLoss: { price: 140.00 },
    numericRR: 2.5
  };

  const riskResult = runStage4RiskEngine(validPlan, { accountEquity: 100000 });
  assert.equal(riskResult.stage, "STAGE_4_RISK_ENGINE");
  assert.equal(riskResult.passedAll, true);
  assert.equal(riskResult.status, "PASS_SETUP_APPROVED");
  assert.equal(riskResult.maxDollarLoss, 1000); // 1% of 100k
  assert.equal(riskResult.checks.length, 5);

  // Test failing bad R:R
  const badRRPlan = {
    planId: "PLAN_BAD_RR",
    symbol: "SOLUSDT",
    currentPrice: 145.00,
    stopLoss: { price: 140.00 },
    numericRR: 1.2 // Below 2.0 limit
  };

  const failedRisk = runStage4RiskEngine(badRRPlan, { accountEquity: 100000 });
  assert.equal(failedRisk.passedAll, false);
  assert.equal(failedRisk.status, "FAIL_SETUP_BLOCKED");
});

test("5. STAGE 5 MONITOR & HUMAN DECISION — executes Approve, Watchlist, and Reject", () => {
  const approvedSetup = {
    symbol: "ETHUSDT",
    signal: { confidenceScore: 88 },
    tradePlan: {
      direction: "BUY_PULLBACK",
      archetype: "Pullback",
      entryZone: { idealTrigger: 2400 },
      stopLoss: { price: 2360 },
      profitTargets: { target2: 2500 },
      invalidation: { price: 2340 },
      riskRewardRatio: "1 : 2.5"
    },
    riskAudit: {
      allocatedQuantity: 2.5,
      maxDollarLoss: 1000
    }
  };

  const decisionItem = runStage5247Monitor(approvedSetup);
  assert.ok(decisionItem.id.startsWith("DECISION_"));
  assert.equal(decisionItem.status, "PENDING_HUMAN_DECISION");

  // Test Human Decision: APPROVE
  const approveRes = executeHumanDecision(decisionItem.id, "APPROVE");
  assert.equal(approveRes.success, true);
  assert.equal(approveRes.decision, "APPROVED_AND_EXECUTED");

  // Test Human Decision on non-existent ID
  const invalidRes = executeHumanDecision("DECISION_NONEXISTENT", "REJECT");
  assert.equal(invalidRes.success, false);
});

test("6. FULL 5-STAGE PIPELINE CYCLE — end-to-end execution", async () => {
  const cycle = await runFull5StagePipelineCycle();
  assert.equal(cycle.status, "5_STAGE_PIPELINE_CYCLE_COMPLETE");
  assert.ok(cycle.totalScanned >= 8);
  assert.ok(typeof cycle.actionableSetupsPassedRisk === "number");

  const status = get5StagePipelineStatus();
  assert.equal(status.status, "5_STAGE_AI_TRADING_MACHINE_ONLINE");
  assert.equal(status.archetypes.length, 5);
});
