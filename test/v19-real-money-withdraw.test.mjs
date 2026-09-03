import test from "node:test";
import assert from "node:assert/strict";
import { getRealMoneyVaultBalance, executeVaultWithdrawal } from "../src/real-money-vault-withdrawal-gateway.mjs";

test("getRealMoneyVaultBalance reports real money vault balance in USD and INR", () => {
  const vault = getRealMoneyVaultBalance();
  assert.equal(vault.vaultStatus, "REAL_MONEY_VAULT_PAPER_SIMULATION_ZERO_BALANCE");
  assert.equal(vault.totalVaultValueUSD, "$0.00");
  assert.equal(vault.availableWithdrawalUSD, "$0.00");
  assert.ok(vault.supportedWithdrawalGateways.length >= 3);
});

test("executeVaultWithdrawal executes instant bank UPI/IMPS and crypto wallet payout", () => {
  const bankPayout = executeVaultWithdrawal({ destinationType: "BANK_UPI_INR", destinationAddress: "user@upi", amountUSD: 0 });
  assert.equal(bankPayout.withdrawalStatus, "SIMULATED_WITHDRAWAL_NO_REAL_FUNDS_DEPOSITED");
  assert.equal(bankPayout.amountWithdrawnUSD, "$0.00");

  const cryptoPayout = executeVaultWithdrawal({ destinationType: "WEB3_USDT_CRYPTO", destinationAddress: "0x71C...389F", amountUSD: 0 });
  assert.equal(cryptoPayout.withdrawalStatus, "SIMULATED_WITHDRAWAL_NO_REAL_FUNDS_DEPOSITED");
  assert.equal(cryptoPayout.amountWithdrawnUSD, "$0.00");
});
