import test from "node:test";
import assert from "node:assert/strict";
import { runQuantumSimulatedAnnealing, getQuantumPortfolioFrontier } from "../src/quantum-hyper-optimizer.mjs";
import { executeFlashLoanArbitrage } from "../src/zero-capital-growth-engine.mjs";
import { optimizeMiningProfits } from "../src/crypto-mining-engine.mjs";

test("runQuantumSimulatedAnnealing optimizes portfolio weights and computes simulated Sharpe ratio", () => {
  const quantum = runQuantumSimulatedAnnealing();
  assert.equal(quantum.convergenceStatus, "GLOBAL_OPTIMUM_CONVERGED");
  assert.equal(quantum.simulatedSharpeRatio, 3.85);
  assert.ok(quantum.optimizedWeights.flashLoanArbitrage);
});

test("executeFlashLoanArbitrage routes via Flashbots Private MEV bundles on L2", () => {
  const flash = executeFlashLoanArbitrage({ chain: "Arbitrum_L2" });
  assert.equal(flash.chain, "Arbitrum_L2");
  assert.equal(flash.mevProtection, "FLASHBOTS_PRIVATE_BUNDLE_PROTECTED (Zero Mempool Frontrunning)");
  assert.equal(flash.netProfitUSD, "$94.15");
});

test("optimizeMiningProfits activates Futures Margin Auto-Hedging", () => {
  const opt = optimizeMiningProfits();
  assert.equal(opt.futuresHedgeStatus, "FUTURES_SHORT_HEDGE_ACTIVE (Fiat Yield Protection)");
  assert.ok(opt.thermalEfficiency);
});
