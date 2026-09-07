// @ts-check
import { globalEventBus } from "../core/event-bus.mjs";

/**
 * Data Quality Gate for Market Feeds
 * Enforces schema, latency, sequence, duplicate, and price sanity checks.
 */
export class DataQualityGate {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxStalenessMs=15000]
   * @param {number} [options.maxPriceDeviationPercent=15.0]
   */
  constructor({ maxStalenessMs = 15000, maxPriceDeviationPercent = 15.0 } = {}) {
    this.maxStalenessMs = maxStalenessMs;
    this.maxPriceDeviationPercent = maxPriceDeviationPercent;

    /** @type {Map<string, { lastPrice: number, lastSequence: number, lastTimestamp: number }>} */
    this.symbolState = new Map();
    this.totalValidated = 0;
    this.totalRejected = 0;
    this.recentAnomalies = [];
  }

  /**
   * Validate incoming market tick / quote
   * @param {Object} tick
   * @param {string} tick.symbol - e.g. "BTCUSDT"
   * @param {number} tick.price - Trade price
   * @param {number} [tick.timestamp] - Millisecond epoch of quote
   * @param {number} [tick.sequence] - Monotonic sequence number
   * @param {string} [tick.provider="unknown"]
   * @returns {{ valid: boolean, status: "SAFE"|"UNSAFE", reasons: string[], sanitizedTick: Object }}
   */
  validateTick(tick) {
    this.totalValidated++;
    const now = Date.now();
    const reasons = [];

    // 1. Schema Validation
    if (!tick || typeof tick !== "object") {
      this._recordAnomaly("INVALID_SCHEMA", "Tick payload is not an object", tick);
      return { valid: false, status: "UNSAFE", reasons: ["INVALID_SCHEMA"], sanitizedTick: null };
    }

    const symbol = String(tick.symbol || "").toUpperCase();
    const price = Number(tick.price);
    const timestamp = Number(tick.timestamp || now);
    const sequence = tick.sequence !== undefined ? Number(tick.sequence) : null;

    if (!symbol || symbol.length < 2) {
      reasons.push("MISSING_OR_INVALID_SYMBOL");
    }

    if (!Number.isFinite(price) || price <= 0) {
      reasons.push("NON_POSITIVE_OR_NAN_PRICE");
    }

    // 2. Timestamp Staleness & Future Skew
    const staleness = now - timestamp;
    if (staleness > this.maxStalenessMs) {
      reasons.push(`STALE_QUOTE_LATENCY_${staleness}MS`);
    } else if (staleness < -3000) {
      // More than 3 seconds in the future
      reasons.push(`CLOCK_SKEW_FUTURE_TIMESTAMP_${Math.abs(staleness)}MS`);
    }

    // 3. State-dependent checks (Sequence & Price Sanity)
    const priorState = this.symbolState.get(symbol);

    if (priorState) {
      // Sequence check
      if (sequence !== null && priorState.lastSequence !== null) {
        if (sequence <= priorState.lastSequence) {
          reasons.push(`OUT_OF_ORDER_OR_DUPLICATE_SEQUENCE_${sequence}_VS_${priorState.lastSequence}`);
        } else if (sequence > priorState.lastSequence + 1) {
          reasons.push(`SEQUENCE_GAP_DETECTED_${priorState.lastSequence}_TO_${sequence}`);
        }
      }

      // Price Sanity Deviation (flash spike / crash guard)
      if (Number.isFinite(price) && priorState.lastPrice > 0) {
        const deviationPct = Math.abs((price - priorState.lastPrice) / priorState.lastPrice) * 100;
        if (deviationPct > this.maxPriceDeviationPercent) {
          reasons.push(`PRICE_DEVIATION_SPIKE_${deviationPct.toFixed(1)}%`);
        }
      }
    }

    const valid = reasons.length === 0;
    const status = valid ? "SAFE" : "UNSAFE";

    if (!valid) {
      this.totalRejected++;
      this._recordAnomaly(status, reasons.join("; "), tick);
      globalEventBus.publish("DATA_QUALITY_ALERT", {
        symbol,
        status,
        reasons,
        tick
      }, { source: "DataQualityGate" });
    } else {
      // Update historical state
      this.symbolState.set(symbol, {
        lastPrice: price,
        lastSequence: sequence,
        lastTimestamp: timestamp
      });
    }

    return {
      valid,
      status,
      reasons,
      sanitizedTick: valid ? Object.freeze({
        symbol,
        price,
        timestamp,
        sequence,
        provider: tick.provider || "unspecified",
        latencyMs: Math.max(0, staleness),
        receivedAt: now
      }) : null
    };
  }

  _recordAnomaly(type, description, raw) {
    this.recentAnomalies.push({
      type,
      description,
      timestamp: new Date().toISOString(),
      rawSummary: raw ? { symbol: raw.symbol, price: raw.price } : null
    });
    if (this.recentAnomalies.length > 50) this.recentAnomalies.shift();
  }

  getStatus() {
    return {
      service: "DataQualityGate",
      totalValidated: this.totalValidated,
      totalRejected: this.totalRejected,
      passRatePercent: this.totalValidated > 0 ? Number((((this.totalValidated - this.totalRejected) / this.totalValidated) * 100).toFixed(1)) : 100,
      trackedSymbolsCount: this.symbolState.size,
      recentAnomalies: this.recentAnomalies.slice(-5)
    };
  }
}

export const globalDataQualityGate = new DataQualityGate();
