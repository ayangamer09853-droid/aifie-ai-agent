import test from "node:test";
import assert from "node:assert/strict";
import { getWalletStatus, getCustodyAlternatives, generateCryptoWallet, signTransactionWithRiskCheck } from "../src/crypto-wallet-manager.mjs";

test("getWalletStatus returns active wallets and risk limits", () => {
  const status = getWalletStatus();
  assert.equal(status.walletManagerStatus, "CRYPTO_WALLET_MANAGER_ONLINE");
  assert.ok(status.activeWalletsCount >= 1);
  assert.equal(status.riskManagementLimits.maxSingleTxNotionalUSD, 500.0);
});

test("getCustodyAlternatives returns 3 custody vectors", () => {
  const alt = getCustodyAlternatives();
  assert.equal(alt.totalAlternativesCount, 3);
  assert.ok(alt.vectors.find(v => v.vectorId === "VECTOR_1_SELF_CUSTODY_HD"));
  assert.ok(alt.vectors.find(v => v.vectorId === "VECTOR_2_MULTISIG_VAULT"));
  assert.ok(alt.vectors.find(v => v.vectorId === "VECTOR_3_HARDWARE_COLD_STORAGE"));
});

test("generateCryptoWallet creates AES-256-GCM encrypted key vault", () => {
  const wallet = generateCryptoWallet({ label: "Test Secondary Vault" });
  assert.ok(wallet.walletId.startsWith("W3-GEN-"));
  assert.ok(wallet.publicAddress.startsWith("0x"));
  assert.ok(wallet.encryptedVault.encryptedPrivateKey);
  assert.equal(wallet.encryptionStandard, "AES-256-GCM");
});

test("signTransactionWithRiskCheck enforces single transaction limit", () => {
  const passTx = signTransactionWithRiskCheck({ amountUSD: 250.0 });
  assert.equal(passTx.status, "TRANSACTION_SIGNED_SUCCESSFULLY");
  assert.equal(passTx.riskCheckPassed, true);

  const failTx = signTransactionWithRiskCheck({ amountUSD: 1000.0 });
  assert.equal(failTx.status, "TRANSACTION_REJECTED");
  assert.equal(failTx.riskCheckPassed, false);
  assert.ok(failTx.reason.includes("EXCEEDED"));
});
