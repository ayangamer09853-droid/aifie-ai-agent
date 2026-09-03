import test from "node:test";
import assert from "node:assert/strict";
import { getRiskParityGovernorStatus, calculateEqualRiskContribution, calculateHalfKellyFraction } from "../src/portfolio-risk-parity-governor.mjs";

test("getRiskParityGovernorStatus reports ERC Risk Parity active status and 12% target vol", () => {
  const status = getRiskParityGovernorStatus();
  assert.equal(status.riskParityStatus, "ERC_RISK_PARITY_GOVERNOR_ACTIVE");
  assert.equal(status.volatilityTarget, "12.0% ANNUALIZED_TARGET_VOL");
});

test("calculateEqualRiskContribution balances asset weights inversely to asset volatility", () => {
  const erc = calculateEqualRiskContribution({ EQUITIES: 0.15, CRYPTO: 0.45, FOREX: 0.08, COMMODITIES: 0.18 });
  assert.equal(erc.allocationModel, "EQUAL_RISK_CONTRIBUTION_ERC");
  assert.ok(erc.ercWeightsPercent.FOREX > erc.ercWeightsPercent.CRYPTO);
});

test("calculateHalfKellyFraction computes fractional safe Kelly capital sizing", () => {
  const kelly = calculateHalfKellyFraction(0.65, 2.0, 0.5);
  assert.equal(kelly.safetyGovernorVerdict, "HALF_KELLY_SAFE_GROWTH_ENFORCED");
  assert.equal(kelly.fullKellyFraction, 0.475);
  assert.equal(kelly.halfKellyFraction, 0.2375);
});
