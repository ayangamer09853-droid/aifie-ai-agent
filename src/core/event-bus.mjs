// @ts-check
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

/**
 * Event-Driven Central Nervous System for Aifie
 * High-performance, zero-dependency in-memory event bus with ring-buffer history.
 */
export class AifieEventBus extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxHistory=1000]
   */
  constructor({ maxHistory = 1000 } = {}) {
    super();
    this.maxHistory = maxHistory;
    /** @type {Array<any>} */
    this.history = [];
    this.sequence = 0;
    this.activeSubscriptionsCount = 0;
    this.setMaxListeners(100);
  }

  /**
   * Publish an event onto the central bus
   * @param {string} eventType - e.g. "MARKET_TICK", "SIGNAL_GENERATED", "RISK_APPROVED"
   * @param {Record<string, any>} [payload={}]
   * @param {Object} [metadata={}]
   * @param {string} [metadata.source="system"]
   * @param {string} [metadata.correlationId]
   * @returns {Object} published event envelope
   */
  publish(eventType, payload = {}, { source = "system", correlationId = null } = {}) {
    const sequence = ++this.sequence;
    const timestamp = Date.now();
    const eventId = `evt-${randomUUID().slice(0, 8)}`;

    const eventEnvelope = Object.freeze({
      eventId,
      eventType: String(eventType).toUpperCase(),
      sequence,
      timestamp,
      isoTimestamp: new Date(timestamp).toISOString(),
      source,
      correlationId: correlationId || `corr-${randomUUID().slice(0, 8)}`,
      payload: Object.freeze({ ...payload })
    });

    // Append to ring buffer
    this.history.push(eventEnvelope);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit typed event and wildcard channel
    this.emit(eventEnvelope.eventType, eventEnvelope);
    this.emit("*", eventEnvelope);

    return eventEnvelope;
  }

  /**
   * Subscribe to a specific event type or all events ("*")
   * @param {string} eventType
   * @param {(event: Object) => void | Promise<void>} handler
   * @returns {() => void} unsubscribe function
   */
  subscribe(eventType, handler) {
    const channel = String(eventType).toUpperCase();
    const wrappedHandler = async (evt) => {
      try {
        await handler(evt);
      } catch (err) {
        this.emit("SYSTEM_ERROR", {
          source: "EventBusHandler",
          targetEvent: channel,
          error: err?.message || String(err),
          timestamp: Date.now()
        });
      }
    };

    this.on(channel, wrappedHandler);
    this.activeSubscriptionsCount++;

    return () => {
      this.off(channel, wrappedHandler);
      this.activeSubscriptionsCount--;
    };
  }

  /**
   * Query recorded event history
   * @param {Object} [filter]
   * @param {string} [filter.eventType]
   * @param {string} [filter.correlationId]
   * @param {number} [filter.sinceTimestamp]
   * @param {number} [filter.limit=50]
   */
  queryHistory({ eventType, correlationId, sinceTimestamp, limit = 50 } = {}) {
    let results = this.history;

    if (eventType) {
      const targetType = String(eventType).toUpperCase();
      results = results.filter(e => e.eventType === targetType);
    }

    if (correlationId) {
      results = results.filter(e => e.correlationId === correlationId);
    }

    if (sinceTimestamp) {
      results = results.filter(e => e.timestamp >= sinceTimestamp);
    }

    return results.slice(-limit);
  }

  /**
   * Get nervous system status telemetry
   */
  getStatus() {
    return {
      service: "AifieEventBus",
      sequence: this.sequence,
      totalEventsRecorded: this.history.length,
      maxHistory: this.maxHistory,
      activeSubscriptionsCount: this.activeSubscriptionsCount,
      recentEvents: this.history.slice(-5)
    };
  }

  /**
   * Replay recorded events to a callback
   * @param {Object} [options]
   * @param {number} [options.sinceTimestamp]
   * @param {string} [options.eventType]
   * @param {(event: Object) => void | Promise<void>} onEvent
   * @returns {Promise<number>} count of replayed events
   */
  async replay({ sinceTimestamp, eventType } = {}, onEvent) {
    const events = this.queryHistory({ sinceTimestamp, eventType, limit: this.maxHistory });
    for (const evt of events) {
      if (typeof onEvent === "function") {
        await onEvent(evt);
      }
    }
    return events.length;
  }

  /**
   * Convenience: publish order submitted event
   */
  publishOrderSubmitted(order, metadata = {}) {
    return this.publish("ORDER_SUBMITTED", order, { source: "OrderRouter", ...metadata });
  }

  /**
   * Convenience: publish order filled event
   */
  publishOrderFilled(order, metadata = {}) {
    return this.publish("ORDER_FILLED", order, { source: "ExecutionEngine", ...metadata });
  }

  /**
   * Convenience: publish order rejected event
   */
  publishOrderRejected(order, reason, metadata = {}) {
    return this.publish("ORDER_REJECTED", { order, reason }, { source: "RiskGate", ...metadata });
  }

  /**
   * Convenience: publish risk breach event
   */
  publishRiskBreach(breach, metadata = {}) {
    return this.publish("RISK_BREACH", breach, { source: "RiskFortress", ...metadata });
  }

  /**
   * Convenience: publish market quote/tick event
   */
  publishMarketTick(quote, metadata = {}) {
    return this.publish("MARKET_TICK", quote, { source: "MarketData", ...metadata });
  }

  /**
   * Reset history (useful for testing)
   */
  clear() {
    this.history = [];
    this.sequence = 0;
  }
}

// Global Singleton
export const globalEventBus = new AifieEventBus();
