import test from "node:test";
import assert from "node:assert/strict";
import { evaluateStrategyRobustnessList } from "../src/strategy-robustness-evaluator.mjs";
import { routeOptimalExecutionVenue } from "../src/institutional-smart-order-router.mjs";
import { recordLedgerTransaction } from "../src/real-pnl-accounting-ledger.mjs";

test("Strategy Robustness Evaluator scores strategies out of 100 with anti-data-mining audit", () => {
  const res = evaluateStrategyRobustnessList();
  assert.equal(res.evaluatorStatus, "STRATEGY_ROBUSTNESS_EVALUATOR_ONLINE");
  assert.ok(res.totalEvaluatedStrategiesCount >= 5);
  assert.ok(res.averageRobustnessScore > 75);
  
  const top = res.strategies[0];
  assert.equal(top.recommendation, "APPROVE");
  assert.ok(top.pboScorePct < 5.0);
  assert.ok(top.robustnessScore >= 90);
});

test("Order routing through SOR and ledger recording works seamlessly", () => {
  const route = routeOptimalExecutionVenue({ symbol: "BTC", amountUSD: 25000, maxSlippageBps: 2.5 });
  assert.equal(route.routingDecision, "VENUE_SELECTED");
  assert.ok(route.recommendedVenue);

  const tx = recordLedgerTransaction({
    symbol: "BTC",
    side: "BUY",
    quantity: 0.28,
    fillPrice: 87500.00,
    venue: route.recommendedVenue,
    realizedPnLUSD: 45.00
  });
  assert.equal(tx.status, "TRANSACTION_RECORDED");
  assert.ok(tx.cumulativeRealizedPnLUSD > 0);
});
