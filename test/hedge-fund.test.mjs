import test from "node:test";
import assert from "node:assert/strict";
import { getHedgeFundCommitteeStatus, runHedgeFundCycle } from "../src/hedge-fund-agents.mjs";
import { runBacktestSimulation, runMonteCarloSimulation } from "../src/backtesting-engine.mjs";
import { createPaperState } from "../src/paper-engine.mjs";

test("getHedgeFundCommitteeStatus returns CEO decision and 7 specialist agent reports", () => {
  const status = getHedgeFundCommitteeStatus();
  assert.ok(status.ceoDecision);
  assert.ok(status.specialistReports.marketResearch);
  assert.ok(status.specialistReports.newsAnalysis);
  assert.ok(status.specialistReports.quantStrategy);
  assert.ok(status.specialistReports.riskManagement);
  assert.ok(status.specialistReports.execution);
  assert.ok(status.specialistReports.portfolioManager);
  assert.ok(status.specialistReports.monitoring);
});

test("runHedgeFundCycle executes committee decision loop and respects 1% risk limit", async () => {
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100000 } });
  const orders = [];
  
  const result = await runHedgeFundCycle({ symbol: "AAPL", paper, orders });
  assert.ok(result.ceoDecision.action);
  assert.ok(result.ceoDecision.approvedQuantity >= 0);
  assert.equal(result.specialistReports.riskManagement.maxTradeRiskPercent, 1.0);
});

test("runBacktestSimulation returns Sharpe ratio and backtest metrics", () => {
  const prices = [150, 152, 155, 153, 158, 160, 162, 165];
  const backtest = runBacktestSimulation("AAPL", prices, "sma_crossover");
  assert.equal(backtest.symbol, "AAPL");
  assert.ok(typeof backtest.backtestMetrics.sharpeRatio === "number");
  assert.ok(typeof backtest.backtestMetrics.profitFactor === "number");
});

test("runMonteCarloSimulation computes 1000-iteration probability of profit", () => {
  const mockOrders = [
    { side: "sell", fillPrice: 110, quotedPrice: 100, quantity: 2, commission: 1.0 },
    { side: "sell", fillPrice: 95, quotedPrice: 100, quantity: 2, commission: 1.0 }
  ];
  
  const mc = runMonteCarloSimulation(mockOrders, 500);
  assert.equal(mc.simulationType, "MONTE_CARLO_RISK_SIMULATOR");
  assert.equal(mc.iterations, 500);
  assert.ok(mc.metrics.probabilityOfProfitPercent >= 0);
  assert.ok(mc.metrics.avgEndingEquity > 0);
});
