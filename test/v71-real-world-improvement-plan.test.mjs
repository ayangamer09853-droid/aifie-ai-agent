import test from "node:test";
import assert from "node:assert/strict";
import { getKeyVaultStatus, storeEncryptedBrokerCredential, getDecryptedBrokerCredential } from "../src/real-world-key-vault.mjs";
import { getWebsocketsStreamerStatus, subscribeMarketStream, getLiveOrderBookDepth } from "../src/realtime-websockets-market-streamer.mjs";
import { getRiskCircuitBreakerStatus, auditLivePortfolioRisk, verifyMfaSecurityOtp } from "../src/institutional-risk-circuit-breaker.mjs";

test("getKeyVaultStatus reports active AES-256-GCM encrypted key vault status", () => {
  const status = getKeyVaultStatus();
  assert.equal(status.vaultStatus, "ENCRYPTED_KEY_VAULT_ACTIVE");
  assert.equal(status.encryptionStandard, "AES-256-GCM_AUTHENTICATED_ENCRYPTION");
  assert.equal(typeof status.storedCredentialsCount, "number");
});

test("storeEncryptedBrokerCredential and getDecryptedBrokerCredential encrypts and decrypts credentials securely", () => {
  const storeRes = storeEncryptedBrokerCredential({ brokerId: "ALPACA", apiKey: "TEST_API_KEY", secretKey: "TEST_SECRET_KEY" });
  assert.equal(storeRes.status, "BROKER_CREDENTIAL_ENCRYPTED_AND_STORED");

  const decryptRes = getDecryptedBrokerCredential({ brokerId: "ALPACA" });
  assert.equal(decryptRes.status, "CREDENTIAL_DECRYPTED_SUCCESSFULLY");
  assert.equal(decryptRes.apiKey, "TEST_API_KEY");
  assert.equal(decryptRes.secretKey, "TEST_SECRET_KEY");
});

test("getWebsocketsStreamerStatus and getLiveOrderBookDepth tracks low-latency WebSockets ticker & L2 depth", () => {
  const status = getWebsocketsStreamerStatus();
  assert.equal(status.streamerStatus, "REALTIME_WEBSOCKETS_STREAMER_ONLINE");

  const book = getLiveOrderBookDepth({ symbol: "AAPL", depthLevels: 10 });
  assert.equal(book.symbol, "AAPL");
  assert.equal(book.bids.length, 10);
  assert.equal(book.asks.length, 10);
  assert.equal(typeof book.orderBookImbalance, "number");
});

test("getRiskCircuitBreakerStatus and auditLivePortfolioRisk enforces 3% daily drawdown hard stop", () => {
  const status = getRiskCircuitBreakerStatus();
  assert.equal(status.circuitBreakerStatus, "RISK_CIRCUIT_BREAKER_ACTIVE_PROTECTED");

  const safeAudit = auditLivePortfolioRisk({ startingEquityUSD: 100000, currentEquityUSD: 99000 });
  assert.equal(safeAudit.auditStatus, "RISK_AUDIT_PASSED_SAFE");
  assert.equal(safeAudit.hardStopTriggered, false);

  const breachAudit = auditLivePortfolioRisk({ startingEquityUSD: 100000, currentEquityUSD: 95000 }); // 5% loss > 3% cap
  assert.equal(breachAudit.auditStatus, "CIRCUIT_BREAKER_TRIGGERED_EMERGENCY_STOP");
  assert.equal(breachAudit.hardStopTriggered, true);
});

test("verifyMfaSecurityOtp verifies Telegram 2FA OTP security gate", () => {
  const verified = verifyMfaSecurityOtp({ userProvidedOtp: "123456" });
  assert.equal(verified.verificationStatus, "TELEGRAM_MFA_OTP_VERIFIED_SUCCESS");
  assert.equal(verified.isVerified, true);
});
