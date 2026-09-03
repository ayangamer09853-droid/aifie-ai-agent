import test from "node:test";
import assert from "node:assert/strict";
import { getPerformanceAttribution } from "../src/performance-attribution.mjs";
import { getHedgeFundCommitteeStatus, runHedgeFundCycle } from "../src/hedge-fund-agents.mjs";
import { createPaperState } from "../src/paper-engine.mjs";

test("getPerformanceAttribution calculates net PnL with slippage and broker commissions", () => {
  const mockOrders = [
    { symbol: "AAPL", side: "sell", fillPrice: 155, quotedPrice: 150, quantity: 10, commission: 2.0, audit: { activeStrategyId: "sma_crossover" } },
    { symbol: "BTCUSDT", side: "sell", fillPrice: 65000, quotedPrice: 64000, quantity: 1, commission: 5.0, audit: { activeStrategyId: "rsi_mean_reversion" } }
  ];

  const attr = getPerformanceAttribution(mockOrders);
  assert.equal(attr.totalFilledOrders, 2);
  assert.equal(attr.winningAttributedTrades, 2);
  assert.ok(attr.totalRealizedPnl > 0);
  assert.equal(attr.consensusWeights.quantStrategyWeight, "35%");
});

test("runHedgeFundCycle computes weighted confidence and dynamic market regime allocation", async () => {
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100000 } });
  const orders = [];

  const res = await runHedgeFundCycle({ symbol: "AAPL", paper, orders });
  assert.ok(res.marketRegime);
  assert.equal(res.ceoDecision.consensusThreshold, 75);
  assert.ok(typeof res.ceoDecision.weightedConfidence === "number");
  assert.ok(res.specialistReports.portfolioManager.targetAllocations);
});
