/**
 * AIFIE GRAPH COMPLEX EVENT PROCESSING (CEP) STREAM ENGINE
 * 
 * High-performance, sub-millisecond in-memory sliding-window event stream processor.
 * Detects multi-event relational patterns across tick streams, order-book alerts,
 * and macroeconomic shocks.
 * 
 * Capabilities:
 * - Time-based and count-based sliding buffer windows
 * - Multi-condition rule evaluations with temporal sequence predicates
 * - Reactive emission of automated hedging & StateGraph triggers
 * 
 * Pure Node.js ESM - Built-in standard library only.
 */

import { EventEmitter } from "node:events";

export class GraphCEPEngine extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxWindowEvents=1000] Maximum events retained in memory
   * @param {number} [options.windowDurationMs=300000] Default sliding window (5 mins)
   */
  constructor(options = {}) {
    super();
    this.maxWindowEvents = options.maxWindowEvents || 1000;
    this.windowDurationMs = options.windowDurationMs || 300_000;
    /** @type {Array<{ id: string, timestamp: number, type: string, symbol: string, payload: Object }>} */
    this.eventBuffer = [];
    this.rules = new Map();
    this.triggeredHistory = [];

    this._registerDefaultRules();
  }

  /**
   * Ingest real-time event into sliding window and evaluate all CEP rules
   * @param {Object} event
   * @param {string} event.type Event type identifier
   * @param {string} [event.symbol] Associated symbol or factor
   * @param {Object} [event.payload] Arbitrary event metadata
   * @returns {Array<Object>} List of triggered rule matches
   */
  ingestEvent(event = {}) {
    const now = Date.now();
    const normalizedEvent = {
      id: `EVT_${now}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      type: (event.type || "TICK").toUpperCase(),
      symbol: (event.symbol || "GLOBAL").toUpperCase(),
      payload: { ...event.payload, ...event }
    };

    this.eventBuffer.push(normalizedEvent);

    // Evict old events outside sliding window
    const cutoff = now - this.windowDurationMs;
    while (this.eventBuffer.length > 0 && (this.eventBuffer[0].timestamp < cutoff || this.eventBuffer.length > this.maxWindowEvents)) {
      this.eventBuffer.shift();
    }

    // Evaluate active CEP rules
    const triggered = this.evaluateRules(normalizedEvent);
    return triggered;
  }

  /**
   * Register a new Complex Event Processing pattern rule
   * @param {Object} rule
   * @param {string} rule.id Unique rule ID
   * @param {string} rule.name Human-readable pattern name
   * @param {string} rule.severity "INFO" | "WARNING" | "CRITICAL"
   * @param {Function} rule.predicate Predicate function (eventBuffer, latestEvent) -> matchObject | null
   */
  registerRule(rule) {
    if (!rule.id || typeof rule.predicate !== "function") {
      throw new Error("Invalid CEP rule: 'id' and 'predicate' function required.");
    }
    this.rules.set(rule.id, {
      id: rule.id,
      name: rule.name || rule.id,
      severity: rule.severity || "INFO",
      predicate: rule.predicate,
      createdAt: new Date().toISOString()
    });
    return this;
  }

  /**
   * Evaluate all registered rules against current sliding window
   * @param {Object} [latestEvent]
   * @returns {Array<Object>}
   */
  evaluateRules(latestEvent = null) {
    const matches = [];
    const now = Date.now();

    for (const [ruleId, rule] of this.rules.entries()) {
      try {
        const matchResult = rule.predicate(this.eventBuffer, latestEvent);
        if (matchResult) {
          const triggerRecord = {
            triggerId: `TRG_${now}_${Math.random().toString(36).substring(2, 6)}`,
            ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            matchDetails: matchResult,
            timestamp: new Date().toISOString()
          };
          matches.push(triggerRecord);
          this.triggeredHistory.push(triggerRecord);
          if (this.triggeredHistory.length > 200) this.triggeredHistory.shift();

          this.emit("pattern_matched", triggerRecord);
          this.emit(`rule:${ruleId}`, triggerRecord);
        }
      } catch (err) {
        console.error(`[AIFIE_CEP_RULE_EVAL_ERROR] Rule ${ruleId}:`, err.message);
      }
    }

    return matches;
  }

  /**
   * Get sliding window buffer statistics
   */
  getWindowSummary() {
    const countsByType = {};
    for (const e of this.eventBuffer) {
      countsByType[e.type] = (countsByType[e.type] || 0) + 1;
    }

    return {
      activeEventsInWindow: this.eventBuffer.length,
      windowDurationSeconds: Math.round(this.windowDurationMs / 1000),
      totalRulesRegistered: this.rules.size,
      totalPatternsTriggered: this.triggeredHistory.length,
      countsByType,
      recentTriggers: this.triggeredHistory.slice(-5)
    };
  }

  _registerDefaultRules() {
    // Rule 1: MACRO_RATE_VOLATILITY_CASCADE
    this.registerRule({
      id: "MACRO_RATE_VOLATILITY_CASCADE",
      name: "Macro Rate Hike & Treasury Yield Surge Volatility Cascade",
      severity: "CRITICAL",
      predicate: (events) => {
        const hasRateHike = events.some(e => e.type.includes("RATE_HIKE") || e.symbol === "FED_RATE_HIKE");
        const hasYieldSurge = events.some(e => e.type.includes("YIELD_UP") || e.symbol === "US10Y_YIELD_UP");
        const hasVolSpike = events.some(e => e.type.includes("VOLATILITY_SPIKE") || e.symbol === "VIX_VOLATILITY_SPIKE");

        if (hasRateHike && (hasYieldSurge || hasVolSpike)) {
          return {
            condition: "Rate Hike detected alongside Treasury Yield expansion or Volatility Spike",
            recommendedAction: "TRIGGER_STATEGRAPH_RISK_OFF"
          };
        }
        return null;
      }
    });

    // Rule 2: COMMODITY_MARGIN_SQUEEZE
    this.registerRule({
      id: "COMMODITY_MARGIN_SQUEEZE",
      name: "Crude Oil Spike Transport Margin Squeeze",
      severity: "WARNING",
      predicate: (events) => {
        const oilSpike = events.some(e => e.symbol === "CRUDE_OIL_SPIKE" || e.type.includes("OIL_SPIKE"));
        const airlineTick = events.find(e => e.symbol === "DAL" || e.symbol === "AIRLINES_TRANSPORT_SECTOR");

        if (oilSpike && airlineTick) {
          return {
            condition: "Crude oil surge detected during active airline positioning",
            targetAsset: "DAL",
            recommendedAction: "REDUCE_TRANSPORT_EXPOSURE"
          };
        }
        return null;
      }
    });

    // Rule 3: CROSS_VENUE_DISPERSION_BREAKOUT
    this.registerRule({
      id: "CROSS_VENUE_DISPERSION_BREAKOUT",
      name: "Cross-Venue Spatial Arbitrage Spread Dislocation",
      severity: "INFO",
      predicate: (events) => {
        const arbEvents = events.filter(e => e.type === "ARBITRAGE_OPPORTUNITY" || e.type === "PRICE_DISPERSION");
        if (arbEvents.length >= 2) {
          const maxSpread = Math.max(...arbEvents.map(e => e.payload?.netProfitPercent || e.payload?.spreadBps || 0));
          if (maxSpread >= 0.25) {
            return {
              condition: `Spatial price dislocation observed across venues (${maxSpread}%)`,
              recommendedAction: "DISPATCH_SYNTHETIC_ARBITRAGE"
            };
          }
        }
        return null;
      }
    });
  }
}

export const graphCEPEngine = new GraphCEPEngine();
