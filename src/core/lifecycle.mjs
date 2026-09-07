// @ts-check
import { EventEmitter } from "node:events";
import { globalEventBus } from "./event-bus.mjs";

export const LIFECYCLE_STATES = Object.freeze({
  INITIALIZING: "INITIALIZING",
  BOOTING: "BOOTING",
  ONLINE: "ONLINE",
  PAUSED: "PAUSED",
  SHADOW_ONLY: "SHADOW_ONLY",
  DRAINING: "DRAINING",
  STOPPED: "STOPPED",
  EMERGENCY_HALTED: "EMERGENCY_HALTED"
});

const VALID_TRANSITIONS = new Map([
  [LIFECYCLE_STATES.INITIALIZING, [LIFECYCLE_STATES.BOOTING, LIFECYCLE_STATES.STOPPED]],
  [LIFECYCLE_STATES.BOOTING, [LIFECYCLE_STATES.ONLINE, LIFECYCLE_STATES.SHADOW_ONLY, LIFECYCLE_STATES.EMERGENCY_HALTED, LIFECYCLE_STATES.STOPPED]],
  [LIFECYCLE_STATES.ONLINE, [LIFECYCLE_STATES.PAUSED, LIFECYCLE_STATES.SHADOW_ONLY, LIFECYCLE_STATES.DRAINING, LIFECYCLE_STATES.EMERGENCY_HALTED]],
  [LIFECYCLE_STATES.PAUSED, [LIFECYCLE_STATES.ONLINE, LIFECYCLE_STATES.SHADOW_ONLY, LIFECYCLE_STATES.DRAINING, LIFECYCLE_STATES.EMERGENCY_HALTED]],
  [LIFECYCLE_STATES.SHADOW_ONLY, [LIFECYCLE_STATES.ONLINE, LIFECYCLE_STATES.PAUSED, LIFECYCLE_STATES.DRAINING, LIFECYCLE_STATES.EMERGENCY_HALTED]],
  [LIFECYCLE_STATES.DRAINING, [LIFECYCLE_STATES.STOPPED, LIFECYCLE_STATES.EMERGENCY_HALTED]],
  [LIFECYCLE_STATES.STOPPED, [LIFECYCLE_STATES.BOOTING, LIFECYCLE_STATES.INITIALIZING]],
  [LIFECYCLE_STATES.EMERGENCY_HALTED, [LIFECYCLE_STATES.STOPPED, LIFECYCLE_STATES.INITIALIZING]]
]);

/**
 * System Lifecycle Manager
 */
export class AifieLifecycleManager extends EventEmitter {
  constructor() {
    super();
    this.currentState = LIFECYCLE_STATES.INITIALIZING;
    this.transitionHistory = [];
    this.startedAt = Date.now();
    this.lastStateChangeAt = this.startedAt;
  }

  /**
   * Get current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Transition to a new state
   * @param {string} targetState
   * @param {Object} [reason={}]
   */
  transitionTo(targetState, { reason = "routine", user = "system" } = {}) {
    const validNextStates = VALID_TRANSITIONS.get(this.currentState) || [];
    if (!validNextStates.includes(targetState)) {
      throw new Error(`Invalid lifecycle transition from ${this.currentState} to ${targetState}`);
    }

    const previousState = this.currentState;
    this.currentState = targetState;
    this.lastStateChangeAt = Date.now();

    const record = {
      from: previousState,
      to: targetState,
      timestamp: this.lastStateChangeAt,
      isoTimestamp: new Date(this.lastStateChangeAt).toISOString(),
      reason,
      user
    };

    this.transitionHistory.push(record);
    if (this.transitionHistory.length > 50) this.transitionHistory.shift();

    this.emit("state_changed", record);
    globalEventBus.publish("SYSTEM_STATE_CHANGED", record, { source: "LifecycleManager" });

    return record;
  }

  /**
   * Trigger emergency halt
   * @param {string} reason
   */
  emergencyHalt(reason = "Emergency stop triggered") {
    return this.transitionTo(LIFECYCLE_STATES.EMERGENCY_HALTED, { reason, user: "ADMIN" });
  }

  /**
   * Get lifecycle diagnostics
   */
  getStatus() {
    return {
      service: "AifieLifecycleManager",
      currentState: this.currentState,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      lastStateChangeAt: new Date(this.lastStateChangeAt).toISOString(),
      transitionHistoryCount: this.transitionHistory.length,
      recentTransitions: this.transitionHistory.slice(-5)
    };
  }
}

export const globalLifecycle = new AifieLifecycleManager();
