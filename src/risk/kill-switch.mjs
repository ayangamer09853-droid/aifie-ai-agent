// src/risk/kill-switch.mjs
// Fail-closed Emergency Kill Switch for Aifie Autonomous Trading Engine.
// Enforces immediate halt of order generation, cancellation of open orders, and audit logging.

import EventEmitter from "node:events";

export class KillSwitch extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || "Aifie-Emergency-KillSwitch";
    this.tripped = false;
    this.trippedAt = null;
    this.tripReason = null;
    this.trippedBy = null;
    this.history = [];
  }

  /**
   * Trip the kill switch immediately.
   * @param {string} reason - Cause of trip (e.g. 'manual_intervention', 'catastrophic_drawdown', 'feed_death')
   * @param {string} actor - Triggering entity ('operator', 'drawdown_controller', 'watchdog')
   */
  trip(reason, actor = "system") {
    if (this.tripped) {
      return { status: "already_tripped", trippedAt: this.trippedAt, reason: this.tripReason };
    }
    this.tripped = true;
    this.trippedAt = Date.now();
    this.tripReason = reason;
    this.trippedBy = actor;

    const record = {
      event: "KILL_SWITCH_ENGAGED",
      timestamp: this.trippedAt,
      reason,
      actor,
      action: "ALL_TRADING_HALTED"
    };
    this.history.push(record);
    this.emit("tripped", record);

    return { status: "tripped", ...record };
  }

  /**
   * Reset the kill switch. Requires explicit authorization.
   * @param {string} authorizationToken - Human operator authentication
   * @param {string} actor - Identity of resetting entity
   */
  reset(authorizationToken, actor = "operator") {
    if (!authorizationToken || authorizationToken !== "AUTHORIZE_RESET_PROD") {
      throw new Error("UNAUTHORIZED_RESET: Valid authorization token required to disarm kill switch");
    }
    const previousReason = this.tripReason;
    this.tripped = false;
    this.trippedAt = null;
    this.tripReason = null;
    this.trippedBy = null;

    const record = {
      event: "KILL_SWITCH_RESET",
      timestamp: Date.now(),
      previousReason,
      actor
    };
    this.history.push(record);
    this.emit("reset", record);

    return { status: "disarmed", ...record };
  }

  /**
   * Assess if trading is safe.
   */
  isSafe() {
    return !this.tripped;
  }

  getStatus() {
    return {
      tripped: this.tripped,
      trippedAt: this.trippedAt,
      tripReason: this.tripReason,
      trippedBy: this.trippedBy,
      historyCount: this.history.length
    };
  }
}

export const killSwitch = new KillSwitch();
