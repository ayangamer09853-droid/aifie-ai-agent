import test from "node:test";
import assert from "node:assert/strict";
import { getFiatCryptoGatewayStatus, depositRealMoneyToCrypto, withdrawCryptoToBank } from "../src/real-money-crypto-gateway-engine.mjs";

test("getFiatCryptoGatewayStatus reports active supported gateways and single limits", () => {
  const status = getFiatCryptoGatewayStatus();
  assert.equal(status.gatewayStatus, "REAL_MONEY_CRYPTO_GATEWAY_ONLINE");
  assert.equal(status.supportedGatewaysCount, 3);
  assert.equal(status.limits.maxSingleDepositINR, 50000);
});

test("depositRealMoneyToCrypto converts real money via UPI/IMPS into Web3 USDT", () => {
  const res = depositRealMoneyToCrypto({
    amountINR: 5000,
    targetCoin: "USDT",
    paymentMethod: "UPI"
  });

  assert.equal(res.depositStatus, "REAL_MONEY_DEPOSITED_TO_CRYPTO_WALLET_SUCCESS");
  assert.equal(res.amountINR, 5000);
  assert.ok(res.creditedCrypto > 0);
  assert.ok(res.txHash.startsWith("0x"));
});

test("depositRealMoneyToCrypto enforces maximum single deposit limit safety gate", () => {
  const res = depositRealMoneyToCrypto({ amountINR: 100000 });
  assert.equal(res.depositStatus, "DEPOSIT_REJECTED_EXCEEDS_SINGLE_LIMIT");
  assert.ok(res.reason.includes("exceeds maximum single deposit limit"));
});

test("withdrawCryptoToBank converts crypto into real bank money with 2FA MFA PIN", () => {
  const res = withdrawCryptoToBank({
    cryptoAmountUSDT: 50,
    bankAccountUpiId: "user@upi",
    mfaPin: "123456"
  });

  assert.equal(res.withdrawalStatus, "CRYPTO_WITHDRAWN_TO_BANK_ACCOUNT_SUCCESS");
  assert.equal(res.cryptoAmountUSDT, 50);
  assert.ok(res.transferredBankAmountINR > 0);
  assert.ok(res.txHash.startsWith("0x"));
});

test("withdrawCryptoToBank rejects unauthorized withdrawal when MFA PIN fails", () => {
  const res = withdrawCryptoToBank({ cryptoAmountUSDT: 50, mfaPin: "999999" });
  assert.equal(res.withdrawalStatus, "WITHDRAWAL_REJECTED_INVALID_MFA_PIN");
});
