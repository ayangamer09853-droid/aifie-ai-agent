import test from "node:test";
import assert from "node:assert/strict";
import { getPortfolioInsuranceStatus, deployTailRiskPutOptionHedge, runCvarRiskBudgetAudit } from "../src/portfolio-tail-risk-insurance-engine.mjs";

test("getPortfolioInsuranceStatus reports active options insurance and portfolio Greeks", () => {
  const status = getPortfolioInsuranceStatus();
  assert.equal(status.insuranceEngineStatus, "PORTFOLIO_TAIL_RISK_INSURANCE_ONLINE");
  assert.equal(status.protocolVersion, "TAIL_RISK_CVAR_OPTIONS_V57");
  assert.equal(status.maxDrawdownCapPercent, "3.5%");
  assert.equal(status.protectionMode, "DELTA_NEUTRAL_PROTECTIVE_PUT_SPREADS");
});

test("deployTailRiskPutOptionHedge deploys protective put option spread hedge", () => {
  const hedge = deployTailRiskPutOptionHedge({
    symbol: "AAPL",
    currentPrice: 150.0,
    portfolioEquityUSD: 100000.0
  });

  assert.equal(hedge.hedgeDeploymentStatus, "TAIL_RISK_OPTION_HEDGE_DEPLOYED_SUCCESS");
  assert.equal(hedge.symbol, "AAPL");
  assert.equal(hedge.hedgeType, "OTM_PROTECTIVE_PUT_SPREAD");
  assert.equal(hedge.insurancePremiumCostUSD, "$250.00 USD");
  assert.ok(hedge.optionTxHash.startsWith("0xOPT_HEDGE_"));
});

test("runCvarRiskBudgetAudit verifies 99% CVaR risk limits against constitutional caps", () => {
  const audit = runCvarRiskBudgetAudit({ currentEquityUSD: 100000.0 });
  assert.equal(audit.auditStatus, "CVAR_RISK_BUDGET_APPROVED_SAFE");
  assert.equal(audit.cvar99EstimateUSD, "$2100.00 (2.1%)");
  assert.equal(audit.tailRiskBudgetCapUSD, "$3500.00 (3.5%)");
  assert.equal(audit.auditVerdict, "PASSED_WITHIN_CONSTITUTIONAL_RISK_LIMITS");
});
