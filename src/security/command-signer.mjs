// src/security/command-signer.mjs
// Constrained Signed Command Gateway for Telegram & External Channels
// Enforces least-privilege, allowlisted command vocabulary, and HMAC signature gating.

import crypto from "node:crypto";
import { logger } from "../observability/structured-logger.mjs";

export const ALLOWED_COMMANDS = Object.freeze([
  "STATUS",
  "PAUSE",
  "RESUME",
  "EMERGENCY_HALT",
  "QUERY_POSITION",
  "RESET_HALT"
]);

export class ConstrainedCommandGateway {
  /**
   * @param {Object} [options={}]
   */
  constructor(options = {}) {
    this.hmacSecret = options.hmacSecret || process.env.COMMAND_GATEWAY_SECRET || "aifie_telegram_signed_command_secret_v101";
    this.maxCommandAgeMs = options.maxCommandAgeMs || 60000; // 60s replay protection window
    this.processedCommandNonces = new Set();
    this.auditHistory = [];
  }

  /**
   * Signs a command for safe external transmission.
   * @param {string} command
   * @param {Record<string, any>} params
   * @param {string} senderId
   * @param {number} [timestamp=Date.now()]
   * @param {string} [nonce]
   * @returns {Object} Signed command envelope
   */
  signCommand(command, params = {}, senderId = "operator_telegram", timestamp = Date.now(), nonce = null) {
    const cmdNonce = nonce || `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payloadString = JSON.stringify({
      command: command.toUpperCase(),
      params,
      senderId,
      timestamp,
      nonce: cmdNonce
    });

    const signature = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(payloadString)
      .digest("hex");

    return Object.freeze({
      command: command.toUpperCase(),
      params,
      senderId,
      timestamp,
      nonce: cmdNonce,
      signature
    });
  }

  /**
   * Verifies and executes a constrained command.
   * @param {Object} signedEnvelope
   * @returns {Object} Command execution outcome
   */
  dispatchCommand(signedEnvelope) {
    const now = Date.now();
    const { command, params, senderId, timestamp, nonce, signature } = signedEnvelope || {};

    // 1. Structure Check
    if (!command || !signature || !nonce || !timestamp) {
      throw new Error("Invalid command envelope: Missing required fields (command, signature, nonce, timestamp)");
    }

    const upperCmd = String(command).trim().toUpperCase();

    // 2. Allowlist Check (Strict Least Privilege)
    if (!ALLOWED_COMMANDS.includes(upperCmd)) {
      logger.warn("security-gateway", "UNAUTHORIZED_COMMAND_REJECTED", { command: upperCmd, senderId });
      throw new Error(`Security Violation: Command '${upperCmd}' is not permitted. Allowed: ${ALLOWED_COMMANDS.join(", ")}`);
    }

    // 3. Replay Protection Window Check
    if (Math.abs(now - timestamp) > this.maxCommandAgeMs) {
      logger.warn("security-gateway", "EXPIRED_COMMAND_REJECTED", { command: upperCmd, timestamp, now });
      throw new Error(`Security Violation: Command timestamp expired or in future (Age: ${Math.abs(now - timestamp)}ms)`);
    }

    // 4. Nonce Replay Check
    if (this.processedCommandNonces.has(nonce)) {
      logger.warn("security-gateway", "REPLAY_ATTACK_DETECTED", { command: upperCmd, nonce });
      throw new Error(`Security Violation: Command nonce '${nonce}' has already been processed (Replay Attack blocked)`);
    }

    // 5. Cryptographic HMAC Signature Verification
    const payloadString = JSON.stringify({
      command: upperCmd,
      params: params || {},
      senderId,
      timestamp,
      nonce
    });

    const expectedSignature = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(payloadString)
      .digest("hex");

    if (signature !== expectedSignature) {
      logger.warn("security-gateway", "TAMPERED_SIGNATURE_REJECTED", { command: upperCmd, senderId });
      throw new Error("Security Violation: Invalid or tampered cryptographic HMAC signature");
    }

    // Mark nonce as spent (bounded set)
    this.processedCommandNonces.add(nonce);
    if (this.processedCommandNonces.size > 10000) {
      const oldest = this.processedCommandNonces.values().next().value;
      this.processedCommandNonces.delete(oldest);
    }

    // Execution of Constrained Control Plane Action
    let result;
    switch (upperCmd) {
      case "STATUS":
        result = { system: "AIFIE_ONLINE", planesActive: 8, safeMode: true };
        break;
      case "PAUSE":
        result = { action: "SIGNAL_GENERATION_PAUSED", pausedBy: senderId };
        break;
      case "RESUME":
        result = { action: "SIGNAL_GENERATION_RESUMED", resumedBy: senderId };
        break;
      case "EMERGENCY_HALT":
        result = { action: "EMERGENCY_HALT_TRIGGERED", haltedBy: senderId, reason: params?.reason || "TELEGRAM_OPERATOR_HALT" };
        break;
      case "QUERY_POSITION":
        result = { symbol: params?.symbol || "ALL", exposure: 0, status: "READ_ONLY" };
        break;
      case "RESET_HALT":
        result = { action: "EMERGENCY_HALT_CLEARED", resetBy: senderId };
        break;
      default:
        result = { status: "EXECUTED" };
        break;
    }

    const auditEntry = {
      command: upperCmd,
      senderId,
      timestamp: now,
      status: "SUCCESS",
      result
    };
    this.auditHistory.push(auditEntry);
    logger.info("security-gateway", "COMMAND_EXECUTED", { command: upperCmd, senderId });

    return Object.freeze(auditEntry);
  }
}

export const constrainedCommandGateway = new ConstrainedCommandGateway();
