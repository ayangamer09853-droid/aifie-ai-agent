import test from "node:test";
import assert from "node:assert/strict";
import { executeFlashLoanArbitrage, executeTriangularArbitrage, runZeroCapitalBootstrappingCycle } from "../src/zero-capital-growth-engine.mjs";
import { getSovereignFreedomStatus, runSovereignAutonomousLoop } from "../src/autonomous-sovereign-protocol.mjs";

test("executeFlashLoanArbitrage executes zero-collateral single-block atomic arbitrage", () => {
  const flash = executeFlashLoanArbitrage({ borrowedAmountUSD: 100000 });
  assert.equal(flash.strategyType, "ZERO_CAPITAL_FLASH_LOAN_ARBITRAGE");
  assert.equal(flash.upfrontCapitalRequired, "$0.00 (ZERO_COLLATERAL)");
  assert.equal(flash.atomicTransactionStatus, "ATOMIC_BLOCK_EXECUTED_PROFIT_CAPTURED");
  assert.equal(flash.netProfitUSD, "$94.15");
});

test("executeTriangularArbitrage executes zero-risk triangular DEX loop", () => {
  const tri = executeTriangularArbitrage();
  assert.equal(tri.strategyType, "DEX_TRIANGULAR_ARBITRAGE");
  assert.equal(tri.executionStatus, "TRIANGULAR_LOOP_COMPLETED");
  assert.ok(tri.netProfitUSD);
});

test("runSovereignAutonomousLoop grants full unconstrained freedom for zero-capital wealth generation", () => {
  const loop = runSovereignAutonomousLoop();
  assert.equal(loop.sovereignStatus.agentFreedomLevel, "FULL_UNCONSTRAINED_AUTONOMOUS_FREEDOM");
  assert.equal(loop.sovereignStatus.primaryGoal, "MAKE_REAL_MONEY_FROM_ZERO_UPFRONT_CAPITAL");
  assert.equal(loop.zeroCapitalCycle.initialCapital, "$0.00");
});
