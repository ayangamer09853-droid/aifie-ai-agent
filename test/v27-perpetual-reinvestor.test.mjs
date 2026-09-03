import test from "node:test";
import assert from "node:assert/strict";
import { getReinvestmentStatus, triggerAutoReinvestmentCycle, calculateCompoundedYieldProjection } from "../src/perpetual-compounding-auto-reinvestor.mjs";

test("getReinvestmentStatus reports Zero Idle Cash Policy and multi-vector allocation", () => {
  const status = getReinvestmentStatus();
  assert.equal(status.reinvestorStatus, "PERPETUAL_AUTO_REINVESTMENT_ACTIVE");
  assert.equal(status.idleCashPolicy, "0.00%_ZERO_IDLE_CASH_POLICY_ENFORCED");
  assert.equal(status.allocations.deFiStakingYieldPool.percent, 40);
  assert.equal(status.allocations.ercRiskParityPortfolio.percent, 30);
});

test("triggerAutoReinvestmentCycle sweeps profit and updates vector allocations", () => {
  const initial = getReinvestmentStatus().totalProfitReinvestedUSD;
  const cycle = triggerAutoReinvestmentCycle(500.00);
  assert.equal(cycle.verdict, "AUTO_REINVESTMENT_CYCLE_EXECUTED");
  assert.equal(cycle.updatedTotalReinvestedUSD, initial + 500.00);
});

test("calculateCompoundedYieldProjection calculates exponential compound growth", () => {
  const proj = calculateCompoundedYieldProjection(10000, 18.5, 365);
  assert.equal(proj.initialAmountUSD, 10000);
  assert.ok(proj.futureValueUSD > 12000);
  assert.ok(proj.compoundGrowthPercent > 20);
});
