import { validateAifieEvent, STANDARD_EVENT_TYPES } from "./types.mjs";
import { TradingClock } from "./clock.mjs";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

export class AifieEventBus {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.maxLogSize=50000] - Capacity of circular event log
   * @param {boolean} [options.enableDiskJournal=false] - Whether to stream events to disk
   * @param {string} [options.journalPath] - Path to persistent event journal file
   */
  constructor(options = {}) {
    this.maxLogSize = options.maxLogSize ?? 50000;
    this.enableDiskJournal = options.enableDiskJournal ?? false;
    this.journalPath = options.journalPath || path.join(process.cwd(), "data", "event_journal.jsonl");
    this.sequenceCounter = 0;
    this.subscribers = new Map(); // eventType -> Set<callback>
    this.eventLog = []; // In-memory event sourcing journal
    this.correlationIndex = new Map(); // correlationId -> array of event indices
    this.diskBuffer = [];
    this.flushTimer = null;
  }

  /**
   * Subscribes to an event type.
   * @param {string} eventType
   * @param {(event: any) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);
    return () => this.subscribers.get(eventType)?.delete(callback);
  }

  /**
   * Emits a standardized event. Validates envelope before publishing.
   * @param {string} eventType
   * @param {string} source
   * @param {string} correlationId
   * @param {Record<string, any>} payload
   * @returns {Object} Emitted validated event
   */
  emit(eventType, source, correlationId, payload) {
    this.sequenceCounter++;
    const event = {
      eventId: `evt_${Date.now()}_${this.sequenceCounter.toString().padStart(6, "0")}`,
      eventType,
      timestamp: TradingClock.now(),
      sequence: this.sequenceCounter,
      source,
      correlationId: correlationId || `corr_anon_${this.sequenceCounter}`,
      payload: payload || {}
    };

    const validation = validateAifieEvent(event);
    if (!validation.valid) {
      throw new Error(`[EVENT-BUS] Invalid event: ${validation.errors.join("; ")}`);
    }

    // Append to circular log
    if (this.eventLog.length >= this.maxLogSize) {
      const removed = this.eventLog.shift();
      // Adjust correlationIndex if necessary
      const oldArr = this.correlationIndex.get(removed.correlationId);
      if (oldArr) {
        oldArr.shift();
        if (oldArr.length === 0) this.correlationIndex.delete(removed.correlationId);
      }
    }

    this.eventLog.push(event);

    // Index by correlationId
    if (!this.correlationIndex.has(event.correlationId)) {
      this.correlationIndex.set(event.correlationId, []);
    }
    this.correlationIndex.get(event.correlationId).push(event);

    // Disk journaling buffer
    if (this.enableDiskJournal) {
      this.diskBuffer.push(JSON.stringify(event) + "\n");
      if (this.diskBuffer.length >= 100) {
        this.flushDiskJournalSync();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushDiskJournalSync();
          this.flushTimer = null;
        }, 100);
        if (typeof this.flushTimer.unref === "function") {
          this.flushTimer.unref();
        }
      }
    }

    // Notify subscribers
    const listeners = this.subscribers.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EVENT-BUS] Error in listener for ${eventType}:`, err);
        }
      }
    }

    return Object.freeze(event);
  }

  /**
   * Flushes in-memory disk buffer to the persistent event journal file synchronously.
   */
  flushDiskJournalSync() {
    if (this.diskBuffer.length === 0) return;
    const chunk = this.diskBuffer.join("");
    this.diskBuffer = [];
    try {
      const dir = path.dirname(this.journalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.journalPath, chunk, "utf-8");
    } catch (err) {
      console.error(`[EVENT-BUS] Failed to flush to disk journal ${this.journalPath}:`, err.message);
    }
  }

  /**
   * Helper to build forensic trade report from an array of events
   * @private
   */
  _buildForensicReport(timeline, correlationId) {
    if (!timeline || timeline.length === 0) {
      return {
        found: false,
        correlationId,
        message: `No events found for correlation ID: ${correlationId}`
      };
    }

    const sorted = [...timeline].sort((a, b) => a.sequence - b.sequence);

    // Extract key causal artifacts
    const tickEvent = sorted.find(e => e.eventType === "MARKET_TICK");
    const featureEvent = sorted.find(e => e.eventType === "FEATURE_UPDATE");
    const signalEvents = sorted.filter(e => e.eventType === "SIGNAL_CREATED");
    const tradeIntentEvent = sorted.find(e => e.eventType === "TRADE_INTENT_CREATED");
    const riskCheckEvent = sorted.find(e => e.eventType === "RISK_CHECK_STARTED");
    const riskApprovedEvent = sorted.find(e => e.eventType === "RISK_APPROVED");
    const riskRejectedEvent = sorted.find(e => e.eventType === "RISK_REJECTED");
    const orderSubmittedEvent = sorted.find(e => e.eventType === "ORDER_SUBMITTED");
    const orderFilledEvent = sorted.find(e => e.eventType === "ORDER_FILLED");

    const startTime = sorted[0].timestamp;
    const endTime = sorted[sorted.length - 1].timestamp;

    return Object.freeze({
      found: true,
      correlationId,
      totalEvents: sorted.length,
      elapsedTimeMs: Math.max(0, endTime - startTime),
      causalityReport: {
        symbol: tradeIntentEvent?.payload?.symbol ?? tickEvent?.payload?.symbol ?? "UNKNOWN",
        tickPrice: tickEvent?.payload?.price ?? null,
        features: featureEvent?.payload?.features ?? null,
        contributingSignals: signalEvents.map(s => ({
          source: s.source,
          direction: s.payload?.direction,
          confidence: s.payload?.confidence,
          rationale: s.payload?.rationale
        })),
        tradeIntent: tradeIntentEvent ? {
          id: tradeIntentEvent.payload?.id,
          side: tradeIntentEvent.payload?.side,
          confidence: tradeIntentEvent.payload?.confidence,
          expectedReturn: tradeIntentEvent.payload?.expectedReturn,
          expectedLoss: tradeIntentEvent.payload?.expectedLoss,
          entry: tradeIntentEvent.payload?.entry,
          stopLoss: tradeIntentEvent.payload?.stopLoss,
          takeProfit: tradeIntentEvent.payload?.takeProfit,
          maxPosition: tradeIntentEvent.payload?.maxPosition,
          invalidators: tradeIntentEvent.payload?.invalidators
        } : null,
        riskDecision: riskApprovedEvent ? {
          status: "APPROVED",
          timestamp: riskApprovedEvent.timestamp,
          approvedSize: riskApprovedEvent.payload?.approvedSize,
          var99: riskApprovedEvent.payload?.var99,
          cvar99: riskApprovedEvent.payload?.cvar99
        } : riskRejectedEvent ? {
          status: "REJECTED",
          timestamp: riskRejectedEvent.timestamp,
          reason: riskRejectedEvent.payload?.reason,
          breachType: riskRejectedEvent.payload?.breachType
        } : { status: "PENDING_OR_BYPASS" },
        execution: orderFilledEvent ? {
          status: "FILLED",
          orderId: orderFilledEvent.payload?.orderId,
          filledPrice: orderFilledEvent.payload?.filledPrice,
          filledQuantity: orderFilledEvent.payload?.filledQuantity,
          slippageBps: orderFilledEvent.payload?.slippageBps
        } : orderSubmittedEvent ? {
          status: "SUBMITTED",
          orderId: orderSubmittedEvent.payload?.orderId
        } : { status: "NONE" }
      },
      rawTimeline: sorted
    });
  }

  /**
   * Replays the exact decision history for a trade by its correlationId from memory.
   * @param {string} correlationId
   * @returns {Object} Forensic trade replay report
   */
  replayTradeDecision(correlationId) {
    const events = this.correlationIndex.get(correlationId) || [];
    return this._buildForensicReport(events, correlationId);
  }

  /**
   * Replays the exact decision history, falling back to scanning the persistent disk journal if missing from RAM.
   * @param {string} correlationId
   * @returns {Promise<Object>} Forensic trade replay report
   */
  async replayTradeDecisionAsync(correlationId) {
    const memoryResult = this.replayTradeDecision(correlationId);
    if (memoryResult.found) {
      return memoryResult;
    }

    // Flush any pending disk writes first
    this.flushDiskJournalSync();

    if (!fs.existsSync(this.journalPath)) {
      return memoryResult;
    }

    // Scan disk journal line by line
    const matchedEvents = [];
    const fileStream = fs.createReadStream(this.journalPath, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (!line || !line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.correlationId === correlationId) {
          matchedEvents.push(parsed);
        }
      } catch {
        // Skip corrupted line
      }
    }

    return this._buildForensicReport(matchedEvents, correlationId);
  }

  /**
   * Returns current statistics of the in-memory and disk event journal.
   */
  getJournalStats() {
    return {
      totalEventsEmitted: this.sequenceCounter,
      inMemoryEventsCount: this.eventLog.length,
      maxLogCapacity: this.maxLogSize,
      activeCorrelationIdsCount: this.correlationIndex.size,
      diskJournalEnabled: this.enableDiskJournal,
      journalPath: this.journalPath
    };
  }

  /**
   * Returns recent events from circular log.
   * @param {number} [limit=20]
   */
  getRecentEvents(limit = 20) {
    const numLimit = Math.max(1, Math.min(1000, Number(limit) || 20));
    return this.eventLog.slice(-numLimit).reverse();
  }

  /**
   * Clears the event log and index. Useful for testing isolation.
   */
  clear() {
    this.eventLog = [];
    this.correlationIndex.clear();
    this.sequenceCounter = 0;
    this.diskBuffer = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export const aifieEventBus = new AifieEventBus();

