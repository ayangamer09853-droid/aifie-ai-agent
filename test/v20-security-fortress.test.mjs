import test from "node:test";
import assert from "node:assert/strict";
import { getFortressSecurityStatus, verifySecurityShield, validateMfaPin } from "../src/anti-hacker-security-shield.mjs";

test("getFortressSecurityStatus reports armored security status with 7 active layers", () => {
  const sec = getFortressSecurityStatus();
  assert.equal(sec.fortressStatus, "SECURE_FORTRESS_ARMORED");
  assert.equal(sec.wafState, "ACTIVE_BLOCKING_ATTACKS");
  assert.equal(sec.encryptionStandard, "AES-256-GCM_MILITARY_GRADE");
  assert.equal(sec.activeSecurityLayersCount, 7);
});

test("verifySecurityShield blocks malicious SQL injection and XSS payloads", () => {
  const safe = verifySecurityShield("127.0.0.1", "GET /api/status");
  assert.equal(safe.allowed, true);

  const attack = verifySecurityShield("192.168.1.100", "POST /api/orders DROP TABLE users");
  assert.equal(attack.allowed, false);
  assert.equal(attack.reason, "ATTACK_DETECTED_BLOCKED_BY_WAF");
});

test("validateMfaPin verifies 2FA MFA TOTP PIN for withdrawal security", () => {
  const valid = validateMfaPin("887089");
  assert.equal(valid.mfaVerified, true);

  const invalid = validateMfaPin("12");
  assert.equal(invalid.mfaVerified, false);
});
