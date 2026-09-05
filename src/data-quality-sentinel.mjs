/**
 * Institutional Data Quality Sentinel Engine v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Before any tick reaches feature generators or models, it must pass a deterministic sanity pipeline."
 * 
 * Quality Pipeline:
 * 1. Timestamp Sanity Check (future clock drift & stale tick filter)
 * 2. Duplicate Tick Filter (sliding hash window)
 * 3. Sequence Integrity Check (monotonically increasing exchange sequence IDs)
 * 4. Price Sanity & Outlier Filter (abnormal single-tick price jumps)
 * 5. Volume Sanity Filter (non-negative, non-zero, finite volume)
 * 6. Cross-Venue Price Divergence Validation
 * 7. Composite Data Quality Score (Q in [0, 100])
 * 
 * Rule: If Q < 85, TRADING IS LOCKED for that asset until sanity recovers.
 */

const DEDUPLICATION_WINDOW_SIZE = 1000;
const DEFAULT_PRICE_JUMP_THRESHOLD_PCT = 8.0; // 8% single tick jump is flagged as anomaly
const MIN_SAFE_QUALITY_SCORE = 85;

class DataQualitySentinel {
  constructor() {
    this.symbolStates = new Map(); // symbol -> { lastTick, lastTimestamp, lastSeq, qualityScore, penalties, history }
    this.seenTickHashes = new Set();
    this.tickHashRing = new Array(DEDUPLICATION_WINDOW_SIZE);
    this.hashRingHead = 0;
    this.totalTicksAudited = 0;
    this.totalTicksRejected = 0;
    this.totalAnomaliesDetected = 0;
  }

  getSymbolState(symbol) {
    const s = String(symbol || "").trim().toUpperCase();
    if (!this.symbolStates.has(s)) {
      this.symbolStates.set(s, {
        symbol: s,
        lastTick: null,
        lastTimestamp: 0,
        lastSequenceId: 0,
        currentQualityScore: 100,
        consecutiveHealthyTicks: 0,
        consecutiveFlaggedTicks: 0,
        isTradingLocked: false,
        lockReason: null,
        totalAudited: 0,
        totalRejected: 0,
        recentIssues: []
      });
    }
    return this.symbolStates.get(s);
  }

  /**
   * Deterministic Tick Sanity Audit
   * Returns { valid: boolean, qualityScore: number, shouldLockTrading: boolean, reasons: string[], sanitizedTick: object }
   */
  auditTick({
    symbol,
    price,
    volume = 1,
    timestamp = Date.now(),
    sequenceId = null,
    venue = "PRIMARY",
    secondaryVenuePrice = null
  } = {}) {
    this.totalTicksAudited++;
    const now = Date.now();
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    const numericPrice = Number(price);
    const numericVolume = Number(volume);
    const tickTime = Number(timestamp) || now;

    const state = this.getSymbolState(cleanSymbol);
    state.totalAudited++;

    const reasons = [];
    let penalties = 0;

    // --- 1. Symbol Sanity Check ---
    if (!cleanSymbol || cleanSymbol.length < 2) {
      this.totalTicksRejected++;
      state.totalRejected++;
      return {
        valid: false,
        qualityScore: 0,
        shouldLockTrading: true,
        reasons: ["INVALID_SYMBOL"],
        sanitizedTick: null
      };
    }

    // --- 2. Price & Volume Numeric Sanity ---
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      reasons.push("INVALID_PRICE_NON_POSITIVE_OR_NON_FINITE");
      penalties += 50;
    }
    if (!Number.isFinite(numericVolume) || numericVolume <= 0) {
      reasons.push("INVALID_VOLUME_NON_POSITIVE");
      penalties += 20;
    }

    // --- 3. Timestamp Sanity (Future Clock Drift & Out-of-Order Delay) ---
    const isReplay = venue && String(venue).toUpperCase().includes("REPLAY");
    if (!isReplay) {
      const futureDriftMs = tickTime - now;
      if (futureDriftMs > 1500) { // Clock skew into the future > 1.5s
        reasons.push(`FUTURE_TIMESTAMP_CLOCK_DRIFT_${futureDriftMs}MS`);
        penalties += 35;
      }

      const lagFromNowMs = now - tickTime;
      if (lagFromNowMs > 30000) { // Older than 30s from current wall clock
        reasons.push(`STALE_TIMESTAMP_LAG_${lagFromNowMs}MS`);
        penalties += 40;
      }
    }

    if (state.lastTimestamp > 0) {
      const delayMs = state.lastTimestamp - tickTime;
      if (delayMs > 5000) { // Stale tick arriving > 5s out of order
        reasons.push(`OUT_OF_ORDER_STALE_TICK_DELAY_${delayMs}MS`);
        penalties += 40;
      }
    }

    // --- 4. Sequence Integrity Check (where exchange sequence is provided) ---
    if (sequenceId !== null && Number.isFinite(Number(sequenceId))) {
      const seq = Number(sequenceId);
      if (state.lastSequenceId > 0 && seq <= state.lastSequenceId) {
        reasons.push(`SEQUENCE_DISORDER_CURRENT_${seq}_PREVIOUS_${state.lastSequenceId}`);
        penalties += 30;
      }
      state.lastSequenceId = seq;
    }

    // --- 5. Duplicate Tick Deduplication Filter ---
    const tickHash = `${cleanSymbol}:${Math.floor(tickTime / 10)}:${numericPrice.toFixed(4)}:${numericVolume.toFixed(4)}`;
    if (this.seenTickHashes.has(tickHash)) {
      reasons.push("DUPLICATE_TICK_DETECTED");
      penalties += 25;
    } else {
      // Add to sliding hash ring
      const oldHash = this.tickHashRing[this.hashRingHead];
      if (oldHash) this.seenTickHashes.delete(oldHash);
      this.tickHashRing[this.hashRingHead] = tickHash;
      this.seenTickHashes.add(tickHash);
      this.hashRingHead = (this.hashRingHead + 1) % DEDUPLICATION_WINDOW_SIZE;
    }

    // --- 6. Abnormal Single-Tick Price Jump Anomaly Filter ---
    if (state.lastTick && state.lastTick.price > 0 && Number.isFinite(numericPrice) && numericPrice > 0) {
      const pctChange = Math.abs((numericPrice - state.lastTick.price) / state.lastTick.price) * 100;
      if (pctChange >= DEFAULT_PRICE_JUMP_THRESHOLD_PCT) {
        reasons.push(`ABNORMAL_PRICE_SPIKE_${pctChange.toFixed(2)}PCT_WITHOUT_CONFIRMATION`);
        penalties += 45;
        this.totalAnomaliesDetected++;
      }
    }

    // --- 7. Cross-Venue Price Divergence Validation ---
    if (secondaryVenuePrice !== null && Number.isFinite(Number(secondaryVenuePrice)) && Number(secondaryVenuePrice) > 0) {
      const secPrice = Number(secondaryVenuePrice);
      const divergencePct = Math.abs((numericPrice - secPrice) / secPrice) * 100;
      if (divergencePct > 3.0) { // > 3% deviation between primary & secondary venue
        reasons.push(`CROSS_VENUE_DIVERGENCE_SPIKE_${divergencePct.toFixed(2)}PCT`);
        penalties += 30;
      }
    }

    // --- Compute Composite Data Quality Score ---
    const qualityScore = Math.max(0, 100 - penalties);
    state.currentQualityScore = qualityScore;

    const isHealthy = qualityScore >= MIN_SAFE_QUALITY_SCORE;

    if (isHealthy) {
      state.consecutiveHealthyTicks++;
      state.consecutiveFlaggedTicks = 0;
      if (state.consecutiveHealthyTicks >= 5 && state.isTradingLocked) {
        state.isTradingLocked = false;
        state.lockReason = null;
      }
      state.lastTick = { price: numericPrice, volume: numericVolume, timestamp: tickTime, venue };
      state.lastTimestamp = tickTime;
    } else {
      state.consecutiveFlaggedTicks++;
      state.consecutiveHealthyTicks = 0;
      state.isTradingLocked = true;
      state.lockReason = reasons.join("; ");
      this.totalTicksRejected++;
      state.totalRejected++;

      state.recentIssues.push({
        timestamp: new Date(now).toISOString(),
        qualityScore,
        reasons
      });
      if (state.recentIssues.length > 20) state.recentIssues.shift();
    }

    return {
      valid: isHealthy,
      qualityScore,
      isTradingLocked: state.isTradingLocked,
      lockReason: state.lockReason,
      penalties,
      reasons,
      sanitizedTick: isHealthy ? {
        symbol: cleanSymbol,
        price: numericPrice,
        volume: numericVolume,
        timestamp: tickTime,
        venue,
        qualityScore
      } : null
    };
  }

  /**
   * Check if a symbol is currently locked from trading due to poor data quality
   */
  isSymbolTradingLocked(symbol) {
    const state = this.getSymbolState(symbol);
    return {
      symbol: state.symbol,
      isLocked: state.isTradingLocked,
      currentQualityScore: state.currentQualityScore,
      minRequiredScore: MIN_SAFE_QUALITY_SCORE,
      lockReason: state.lockReason,
      consecutiveHealthyTicks: state.consecutiveHealthyTicks
    };
  }

  /**
   * Returns comprehensive Data Quality Sentinel telemetry status
   */
  getStatus() {
    const symbolSummaries = {};
    let totalLocked = 0;

    for (const [sym, st] of this.symbolStates.entries()) {
      if (st.isTradingLocked) totalLocked++;
      symbolSummaries[sym] = {
        qualityScore: st.currentQualityScore,
        isLocked: st.isTradingLocked,
        totalAudited: st.totalAudited,
        totalRejected: st.totalRejected,
        recentIssuesCount: st.recentIssues.length
      };
    }

    return {
      sentinelStatus: "DATA_QUALITY_SENTINEL_ONLINE",
      version: "100.0_DETERMINISTIC_GATE",
      minSafeQualityScore: MIN_SAFE_QUALITY_SCORE,
      totalTicksAudited: this.totalTicksAudited,
      totalTicksRejected: this.totalTicksRejected,
      totalAnomaliesDetected: this.totalAnomaliesDetected,
      rejectionRatePct: this.totalTicksAudited > 0
        ? Number(((this.totalTicksRejected / this.totalTicksAudited) * 100).toFixed(2))
        : 0,
      activeSymbolsCount: this.symbolStates.size,
      totalLockedSymbols: totalLocked,
      symbolSummaries,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.symbolStates.clear();
    this.seenTickHashes.clear();
    this.tickHashRing.fill(undefined);
    this.hashRingHead = 0;
    this.totalTicksAudited = 0;
    this.totalTicksRejected = 0;
    this.totalAnomaliesDetected = 0;
  }
}

// Global Singleton Instance
export const dataQualitySentinel = new DataQualitySentinel();

export function auditMarketTick(tickData) {
  return dataQualitySentinel.auditTick(tickData);
}

export function getDataQualityStatus() {
  return dataQualitySentinel.getStatus();
}

export function isTradingLockedForSymbol(symbol) {
  return dataQualitySentinel.isSymbolTradingLocked(symbol);
}

export function resetDataQualitySentinel() {
  dataQualitySentinel.reset();
}
