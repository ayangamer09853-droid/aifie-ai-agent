// src/observability/failure-incident-bus.mjs
// First-Class Failure Event Bus & Automatic Incident Remediation.
// Emits and handles standard failure events:
// DATA_STALE, DATA_CONFLICT, MODEL_TIMEOUT, MODEL_DISAGREEMENT,
// RISK_REJECTED, BROKER_ERROR, EXECUTION_PARTIAL, SLIPPAGE_HIGH,
// STRATEGY_DEGRADED, REGIME_CHANGED, KILL_SWITCH.

import EventEmitter from "node:events";

export const FAILURE_TYPES = {
  DATA_STALE: "DATA_STALE",
  DATA_CONFLICT: "DATA_CONFLICT",
  MODEL_TIMEOUT: "MODEL_TIMEOUT",
  MODEL_DISAGREEMENT: "MODEL_DISAGREEMENT",
  RISK_REJECTED: "RISK_REJECTED",
  BROKER_ERROR: "BROKER_ERROR",
  EXECUTION_PARTIAL: "EXECUTION_PARTIAL",
  SLIPPAGE_HIGH: "SLIPPAGE_HIGH",
  STRATEGY_DEGRADED: "STRATEGY_DEGRADED",
  REGIME_CHANGED: "REGIME_CHANGED",
  KILL_SWITCH: "KILL_SWITCH"
};

export class FailureIncidentBus extends EventEmitter {
  constructor() {
    super();
    this.incidentLog = [];
    this.activeFailoverProviders = new Map(); // providerType -> currentActiveProvider
    this.consecutiveFailures = new Map(); // key -> count
  }

  /**
   * Emit and handle a first-class failure incident.
   * @param {string} failureType - Member of FAILURE_TYPES
   * @param {Object} details
   */
  reportFailure(failureType, details = {}) {
    const key = `${failureType}_${details.source || "global"}`;
    const count = (this.consecutiveFailures.get(key) || 0) + 1;
    this.consecutiveFailures.set(key, count);

    let automatedAction = "LOGGED";

    // Automated Remediation Logic
    if (failureType === FAILURE_TYPES.DATA_STALE || failureType === FAILURE_TYPES.BROKER_ERROR) {
      if (count >= 3) {
        automatedAction = "SWITCHED_TO_BACKUP_FEED";
        this.activeFailoverProviders.set("market_data", "SECONDARY_BACKUP_FEED");
      }
    } else if (failureType === FAILURE_TYPES.SLIPPAGE_HIGH) {
      automatedAction = "HALVED_ORDER_TRANCHE_SIZE";
    }

    const incident = {
      id: `INCIDENT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      failureType,
      consecutiveCount: count,
      details,
      automatedAction,
      timestamp: Date.now()
    };

    this.incidentLog.push(incident);
    this.emit("incident", incident);
    return incident;
  }

  resetFailures(key) {
    this.consecutiveFailures.delete(key);
  }

  getRecentIncidents(limit = 20) {
    return this.incidentLog.slice(-limit);
  }
}

export const failureIncidentBus = new FailureIncidentBus();
