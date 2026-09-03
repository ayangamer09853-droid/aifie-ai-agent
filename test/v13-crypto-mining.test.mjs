import test from "node:test";
import assert from "node:assert/strict";
import { getMiningStatus, optimizeMiningProfits, executeAutoSellMinedCrypto } from "../src/crypto-mining-engine.mjs";

test("getMiningStatus reports active mining pools, coins, and hashrate", () => {
  const status = getMiningStatus();
  assert.ok(status.status.startsWith("MINING_OPTIMAL_ACTIVE"));
  assert.ok(status.activeCoin);
  assert.ok(status.hashrate);
});

test("optimizeMiningProfits auto-switches to the highest-yielding mining coin", () => {
  const opt = optimizeMiningProfits();
  assert.equal(opt.optimizationStatus, "AUTO_SWITCHED_TO_HIGHEST_PROFIT_COIN");
  assert.equal(opt.selectedCoin, "KASPA (KAS)");
  assert.equal(opt.algorithm, "kHeavyHash");
});

test("executeAutoSellMinedCrypto auto-sells mined block payout rewards into USDT / INR", () => {
  const autoSell = executeAutoSellMinedCrypto({ payoutAmountUSD: 15.00 });
  assert.equal(autoSell.autoSellStatus, "AUTO_SOLD_INTO_REAL_MONEY");
  assert.equal(autoSell.convertedCurrency, "USDT / INR");
  assert.equal(autoSell.destination, "Profit Vault (Locked Gain)");
  assert.equal(autoSell.netRealizedProfitUSDT, "$14.99");
});
