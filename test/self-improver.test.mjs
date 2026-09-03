import test from "node:test";
import assert from "node:assert/strict";
import { calculateTradePerformance, evaluateStrategyRankings } from "../src/performance-evaluator.mjs";
import { getSelfImprovementStatus, runSelfOptimization } from "../src/self-improver.mjs";
import { createStrategyState } from "../src/strategy-lab.mjs";

test("calculateTradePerformance accurately computes win rate and profit factor", () => {
  const mockOrders = [
    { side: "sell", fillPrice: 110, quotedPrice: 100, quantity: 1, commission: 0.5 }, // Win +9.5
    { side: "sell", fillPrice: 120, quotedPrice: 100, quantity: 1, commission: 0.5 }, // Win +19.5
    { side: "sell", fillPrice: 90, quotedPrice: 100, quantity: 1, commission: 0.5 }   // Loss -10.5
  ];

  const perf = calculateTradePerformance(mockOrders);
  assert.equal(perf.totalTrades, 3);
  assert.equal(perf.winningTrades, 2);
  assert.equal(perf.losingTrades, 1);
  assert.equal(perf.winRatePercent, 66.67);
  assert.ok(perf.profitFactor > 1.5);
  assert.ok(perf.netPnl > 0);
});

test("evaluateStrategyRankings sorts strategies by win rate and PnL", () => {
  const mockOrders = [
    { strategyId: "rsi_mean_reversion", side: "sell", fillPrice: 110, quotedPrice: 100, quantity: 1 },
    { strategyId: "rsi_mean_reversion", side: "sell", fillPrice: 115, quotedPrice: 100, quantity: 1 },
    { strategyId: "sma_crossover", side: "sell", fillPrice: 90, quotedPrice: 100, quantity: 1 }
  ];
  const strategies = createStrategyState().strategies;
  const rankings = evaluateStrategyRankings(mockOrders, strategies);
  
  assert.ok(rankings.length >= 2);
  assert.equal(rankings[0].id, "rsi_mean_reversion");
  assert.equal(rankings[0].winRatePercent, 100);
});

test("runSelfOptimization auto-tunes parameters and logs changes", () => {
  const mockOrders = [
    { strategyId: "rsi_mean_reversion", side: "sell", fillPrice: 110, quotedPrice: 100, quantity: 1 },
    { strategyId: "rsi_mean_reversion", side: "sell", fillPrice: 115, quotedPrice: 100, quantity: 1 },
    { strategyId: "rsi_mean_reversion", side: "sell", fillPrice: 120, quotedPrice: 100, quantity: 1 }
  ];
  const strategies = createStrategyState().strategies;
  
  const result = runSelfOptimization({ orders: mockOrders, strategies });
  assert.equal(result.status, "success");
  assert.ok(result.optimization.changes.length > 0);
  
  const status = getSelfImprovementStatus(mockOrders, strategies);
  assert.ok(status.totalOptimizationsCount >= 1);
});
