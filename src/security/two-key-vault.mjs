// src/security/two-key-vault.mjs
// Two-Key Security Vault & Paper/Live Physical Isolation Engine
// Enforces cryptographic separation between simulated paper trading and live capital execution.

import crypto from "node:crypto";

class TwoKeySecurityVault {
  /**
   * @param {Object} [options={}]
   */
  constructor(options = {}) {
    // Secret keys isolated in-memory or loaded from environment
    this.riskVaultSecret = options.riskVaultSecret || process.env.RISK_VAULT_SECRET || "aifie_sovereign_risk_secret_key_v101";
    this.operatorMasterSecret = options.operatorMasterSecret || process.env.OPERATOR_MASTER_SECRET || "aifie_operator_physical_key_v101";
    this.auditLedger = [];
  }

  /**
   * Evaluates current system execution mode.
   * Never infers LIVE; defaults strictly to PAPER unless explicitly declared.
   * @returns {"PAPER" | "LIVE"}
   */
  getExecutionMode() {
    const mode = (process.env.EXECUTION_MODE || "PAPER").trim().toUpperCase();
    return mode === "LIVE" ? "LIVE" : "PAPER";
  }

  /**
   * Generates Key 1: Signed Sovereign Risk Token.
   * Only callable by Sovereign Risk Fortress upon passing all hard limits.
   * @param {Object} tradeIntent
   * @param {Object} riskApproval
   * @returns {Object} Signed Risk Token
   */
  generateRiskToken(tradeIntent, riskApproval) {
    if (!riskApproval || riskApproval.decision !== "APPROVED") {
      throw new Error("Cannot generate Sovereign Risk Token for unapproved intent");
    }

    const payload = {
      tokenType: "SOVEREIGN_RISK_TOKEN",
      intentId: tradeIntent.id,
      correlationId: tradeIntent.correlationId,
      symbol: tradeIntent.symbol,
      side: tradeIntent.side,
      approvedSizeUsd: riskApproval.approvedSizeUsd,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 30000 // Valid for 30 seconds only
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", this.riskVaultSecret)
      .update(payloadString)
      .digest("hex");

    return Object.freeze({
      ...payload,
      signature
    });
  }

  /**
   * Generates Key 2: Operator Master HMAC Signature.
   * Represents explicit human/operator authorization.
   * @param {string} intentId
   * @param {number} approvedSizeUsd
   * @returns {string} Operator HMAC signature
   */
  generateOperatorSignature(intentId, approvedSizeUsd) {
    const message = `OPERATOR_CONFIRMED_EXECUTION:${intentId}:${approvedSizeUsd}`;
    return crypto
      .createHmac("sha256", this.operatorMasterSecret)
      .update(message)
      .digest("hex");
  }

  /**
   * Verifies Two-Key Authorization before any live broker order is dispatched.
   * Requires:
   * 1. EXECUTION_MODE === "LIVE"
   * 2. Key 1: Valid, unexpired Sovereign Risk Token with verified HMAC
   * 3. Key 2: Valid Operator Master Signature with verified HMAC
   * 4. Notional order bounds within token authorization
   *
   * @param {Object} params
   * @param {Object} params.riskToken - Key 1
   * @param {string} params.operatorSignature - Key 2
   * @param {number} params.orderNotionalUsd
   * @returns {Object} Authorization outcome
   */
  verifyTwoKeyAuthorization({ riskToken, operatorSignature, orderNotionalUsd }) {
    const currentMode = this.getExecutionMode();
    const now = Date.now();

    // Verification Gate 0: Execution Mode Check
    if (currentMode !== "LIVE") {
      const err = `Live execution blocked: EXECUTION_MODE is '${currentMode}'. Only 'LIVE' permits real broker execution.`;
      this._recordAudit("REJECTED_EXECUTION_MODE_NOT_LIVE", { currentMode, orderNotionalUsd });
      throw new Error(err);
    }

    // Verification Gate 1: Sovereign Risk Token Validation
    if (!riskToken || !riskToken.signature) {
      this._recordAudit("REJECTED_MISSING_RISK_TOKEN", { orderNotionalUsd });
      throw new Error("Two-Key Live Security: Missing Sovereign Risk Token (Key 1)");
    }

    if (now > riskToken.expiresAt) {
      this._recordAudit("REJECTED_EXPIRED_RISK_TOKEN", { riskToken });
      throw new Error(`Two-Key Live Security: Sovereign Risk Token expired at ${riskToken.expiresAt} (Current: ${now})`);
    }

    const { signature: riskSig, ...payloadOnly } = riskToken;
    const expectedRiskSig = crypto
      .createHmac("sha256", this.riskVaultSecret)
      .update(JSON.stringify(payloadOnly))
      .digest("hex");

    if (riskSig !== expectedRiskSig) {
      this._recordAudit("REJECTED_TAMPERED_RISK_TOKEN", { riskToken });
      throw new Error("Two-Key Live Security: Tampered or invalid Sovereign Risk Token signature");
    }

    // Verification Gate 2: Operator Signature Validation
    const expectedOperatorSig = this.generateOperatorSignature(payloadOnly.intentId, payloadOnly.approvedSizeUsd);
    if (!operatorSignature || operatorSignature !== expectedOperatorSig) {
      this._recordAudit("REJECTED_INVALID_OPERATOR_KEY", { intentId: payloadOnly.intentId });
      throw new Error("Two-Key Live Security: Missing or invalid Operator Master Signature (Key 2)");
    }

    // Verification Gate 3: Notional Ceiling Check
    if (orderNotionalUsd > payloadOnly.approvedSizeUsd) {
      this._recordAudit("REJECTED_NOTIONAL_EXCEEDED", { orderNotionalUsd, approvedSizeUsd: payloadOnly.approvedSizeUsd });
      throw new Error(`Two-Key Live Security: Order notional $${orderNotionalUsd} exceeds token authorized limit $${payloadOnly.approvedSizeUsd}`);
    }

    // Pass: Record authorization receipt
    const receipt = {
      status: "AUTHORIZED",
      intentId: payloadOnly.intentId,
      symbol: payloadOnly.symbol,
      authorizedNotionalUsd: orderNotionalUsd,
      timestamp: now
    };

    this._recordAudit("AUTHORIZED_LIVE_EXECUTION", receipt);
    return Object.freeze(receipt);
  }

  _recordAudit(action, details) {
    const entry = {
      id: `sec_audit_${Date.now()}_${this.auditLedger.length}`,
      action,
      timestamp: Date.now(),
      details
    };
    this.auditLedger.push(entry);
    if (this.auditLedger.length > 500) this.auditLedger.shift();
    return entry;
  }

  getAuditTrail() {
    return [...this.auditLedger];
  }
}

export const twoKeySecurityVault = new TwoKeySecurityVault();
