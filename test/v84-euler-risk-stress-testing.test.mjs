import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEulerRiskBudgetDecomposition
} from "../src/euler-risk-budgeting-engine.mjs";
import {
  runBlackSwanStressTestLab
} from "../src/black-swan-stress-test-lab.mjs";

test("Euler Risk Budgeting decomposes total portfolio volatility across all assets", () => {
  const euler = calculateEulerRiskBudgetDecomposition();
  assert.equal(euler.engineStatus, "EULER_RISK_BUDGETING_ACTIVE");
  assert.ok(euler.totalPortfolioVolatilitySigma > 0.10);

  // Sum of percentage risk contributions should equal ~100%
  const sumPcr = Object.values(euler.percentageRiskContributions).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumPcr - 100.0) < 1.0, `Sum of PCR was ${sumPcr}, expected ~100`);

  assert.equal(euler.maxAllowedRiskBudgetCapPct, 25.0);
  assert.ok(typeof euler.isRiskBudgetCompliant === "boolean");
});

test("Black Swan Stress-Testing Lab simulates 5 crises with 100% survival and <3% drawdown", () => {
  const lab = runBlackSwanStressTestLab();
  assert.equal(lab.engineStatus, "BLACK_SWAN_SIMULATION_COMPLETED");
  assert.equal(lab.totalScenariosTested, 5);
  assert.equal(lab.survivedScenariosCount, 5);
  assert.equal(lab.overallSurvivalRatePct, 100.0);
  assert.equal(lab.isConstitutionalCapRespected, true);
  assert.ok(Math.abs(lab.worstSimulatedDrawdownPct) <= 3.0);
});
