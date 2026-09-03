import test from "node:test";
import assert from "node:assert/strict";
import {
  getQuantBacktestOptimizerStatus,
  runWalkForwardQuantOptimization,
  generateMonteCarloPortfolioTrajectories,
  calculateMarketImpactSlippage
} from "../src/quant-strategy-backtest-optimizer-engine.mjs";

test("getQuantBacktestOptimizerStatus reports active quant backtest optimizer status", () => {
  const status = getQuantBacktestOptimizerStatus();
  assert.equal(status.backtestStatus, "QUANT_STRATEGY_BACKTEST_OPTIMIZER_ONLINE");
  assert.equal(status.protocolVersion, "QUANT_WALKFORWARD_OPTIMIZER_V65");
  assert.equal(status.deflatedSharpeRatio, 3.42);
});

test("runWalkForwardQuantOptimization executes walk-forward out-of-sample optimization", () => {
  const opt = runWalkForwardQuantOptimization({ symbol: "AAPL", inSampleDays: 180, outOfSampleDays: 60 });
  assert.equal(opt.optimizationStatus, "WALK_FORWARD_OPTIMIZATION_COMPLETED_PASSED");
  assert.equal(opt.symbol, "AAPL");
  assert.equal(opt.outOfSampleSharpe, 3.42);
  assert.ok(opt.optimizationTxHash.startsWith("0xWALK_FORWARD_"));
});

test("generateMonteCarloPortfolioTrajectories generates 10,000 Monte Carlo equity curves", () => {
  const sim = generateMonteCarloPortfolioTrajectories({ portfolioEquityUSD: 100000, simulatedPathsCount: 10000 });
  assert.equal(sim.simulationStatus, "MONTE_CARLO_TRAJECTORIES_GENERATED_SUCCESS");
  assert.equal(sim.simulatedPathsCount, 10000);
  assert.equal(sim.meanExpectedEquityUSD, "$148000.00");
  assert.ok(sim.monteCarloHash.startsWith("0xMONTE_CARLO_"));
});

test("calculateMarketImpactSlippage calculates Almgren-Chriss market impact drag", () => {
  const impact = calculateMarketImpactSlippage({ orderSizeShares: 500, averageDailyVolume: 5000000, volatility: 0.02 });
  assert.equal(impact.calculationStatus, "ALMGREN_CHRISS_MARKET_IMPACT_CALCULATED");
  assert.equal(impact.orderSizeShares, 500);
  assert.ok(parseFloat(impact.totalSlippageBps) >= 0.01);
});
