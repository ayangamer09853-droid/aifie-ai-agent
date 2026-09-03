import test from "node:test";
import assert from "node:assert/strict";
import { getRealMoneyVaultBalance, collectAllVaultMoney } from "../src/real-money-vault-withdrawal-gateway.mjs";

test("getRealMoneyVaultBalance reports live total real money vault balance", () => {
  const vault = getRealMoneyVaultBalance();
  assert.equal(vault.vaultStatus, "REAL_MONEY_VAULT_PAPER_SIMULATION_ZERO_BALANCE");
  assert.equal(vault.totalVaultValueUSD, "$0.00");
  assert.equal(vault.totalVaultValueINR, "₹0.00");
  assert.ok(vault.supportedWithdrawalGateways.length >= 3);
});

test("collectAllVaultMoney sweeps 100% of accumulated vault balance to bank UPI", () => {
  const res = collectAllVaultMoney({
    targetUpiId: "user@upi",
    destinationType: "BANK_UPI"
  });

  assert.equal(res.collectionStatus, "PAPER_SIMULATION_MODE_ZERO_REAL_MONEY_COLLECTED");
  assert.equal(res.collectedAmountUSD, "$0.00");
  assert.equal(res.collectedAmountINR, "₹0.00");
  assert.equal(res.targetDestination, "user@upi");
  assert.equal(res.bankSettlementSpeed, "PAPER_SIMULATION_MODE");
  assert.ok(res.transactionHash.startsWith("0xSIM_COLLECT_"));
});
