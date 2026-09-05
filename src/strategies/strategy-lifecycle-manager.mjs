// src/strategies/strategy-lifecycle-manager.mjs
// Strategy Lifecycle State Machine.
// Transitions strategies across 10 formal institutional phases:
// RESEARCH -> BACKTEST -> WALK_FORWARD -> PAPER -> SHADOW_LIVE ->
// SMALL_LIVE -> PRODUCTION -> DEGRADATION -> QUARANTINE -> RETIRED

import EventEmitter from "node:events";

export const LIFECYCLE_STATES = {
  RESEARCH: "RESEARCH",
  BACKTEST: "BACKTEST",
  WALK_FORWARD: "WALK_FORWARD",
  PAPER: "PAPER",
  SHADOW_LIVE: "SHADOW_LIVE",
  SMALL_LIVE: "SMALL_LIVE",
  PRODUCTION: "PRODUCTION",
  DEGRADATION: "DEGRADATION",
  QUARANTINE: "QUARANTINE",
  RETIRED: "RETIRED"
};

export class StrategyLifecycleManager extends EventEmitter {
  constructor() {
    super();
    this.strategies = new Map(); // id -> strategyRecord
  }

  registerStrategy(id, name, author = "AI-Research-Agent") {
    const record = {
      id,
      name,
      author,
      state: LIFECYCLE_STATES.RESEARCH,
      history: [
        { state: LIFECYCLE_STATES.RESEARCH, timestamp: Date.now(), reason: "Strategy created in research sandbox" }
      ],
      realityScore: null,
      allocationPct: 0.0,
      createdAt: Date.now()
    };
    this.strategies.set(id, record);
    this.emit("registered", record);
    return record;
  }

  /**
   * Transition strategy to a new lifecycle state with gate requirements.
   * @param {string} id
   * @param {string} targetState
   * @param {Object} context - Evidence, reality score, audit records
   */
  transition(id, targetState, context = {}) {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      throw new Error(`STRATEGY_NOT_FOUND: Strategy ${id} does not exist`);
    }

    const currentState = strategy.state;
    if (currentState === LIFECYCLE_STATES.RETIRED) {
      throw new Error(`INVALID_TRANSITION: Cannot transition retired strategy ${id}`);
    }

    // Gate Validations
    if (targetState === LIFECYCLE_STATES.PAPER) {
      if (context.realityScore && context.realityScore < 75) {
        throw new Error(`GATE_REJECTED: Reality score ${context.realityScore} < 75 minimum required for PAPER deployment`);
      }
    }

    if (targetState === LIFECYCLE_STATES.SMALL_LIVE || targetState === LIFECYCLE_STATES.PRODUCTION) {
      if (context.realityScore && context.realityScore < 90) {
        throw new Error(`GATE_REJECTED: Reality score ${context.realityScore} < 90 minimum required for LIVE deployment`);
      }
      if (!context.complianceSignoff) {
        throw new Error("GATE_REJECTED: Explicit human compliance signoff required for live execution states");
      }
    }

    strategy.state = targetState;
    if (context.realityScore !== undefined) strategy.realityScore = context.realityScore;
    if (context.allocationPct !== undefined) strategy.allocationPct = context.allocationPct;

    const transitionRecord = {
      fromState: currentState,
      toState: targetState,
      timestamp: Date.now(),
      reason: context.reason || "Formal promotion gate passed",
      context
    };

    strategy.history.push(transitionRecord);
    this.emit("transitioned", { id, ...transitionRecord });

    return strategy;
  }

  /**
   * Flag degradation and move strategy directly into quarantine.
   */
  flagDegradation(id, reason) {
    const strategy = this.strategies.get(id);
    if (!strategy) return null;

    return this.transition(id, LIFECYCLE_STATES.QUARANTINE, {
      reason: `Degradation detected: ${reason}`,
      allocationPct: 0.0
    });
  }

  getStrategy(id) {
    return this.strategies.get(id);
  }

  getAllStrategies() {
    return Array.from(this.strategies.values());
  }
}

export const strategyLifecycleManager = new StrategyLifecycleManager();
