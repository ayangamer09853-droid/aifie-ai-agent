// src/ingestion/data-feeding-engine.mjs
// Universal Institutional Data Feeding & Ingestion Engine v1.0
// Pure Native ESM, Zero External Dependencies

import { randomUUID } from "node:crypto";
import { validatePriceTick } from "../data-sanitizer.mjs";
import { recordMarketTick, RingBuffer } from "../timeseries-market-store.mjs";
import { aifieEventBus } from "../core/event-bus-replay.mjs";
import { dataQualitySentinel } from "../data-quality-sentinel.mjs";

const MAX_LEDGER_ITEMS = 200;

export class DataFeedingEngine {
  constructor({ maxLedgerSize = MAX_LEDGER_ITEMS } = {}) {
    this.feedLedger = new RingBuffer(maxLedgerSize);
    this.customQuotes = new Map(); // symbol -> { price, bid, ask, volume, updatedAt, source }
    this.customNews = [];
    this.customSignals = [];
    this.customOrderBooks = new Map();
    this.telemetry = {
      totalTicksFed: 0,
      totalCandlesFed: 0,
      totalNewsFed: 0,
      totalSignalsFed: 0,
      totalOrderBooksFed: 0,
      totalBatchesFed: 0,
      totalRecordsRejected: 0,
      firstFedAt: null,
      lastFedAt: null,
      symbolsActive: new Set()
    };
    // Optional external paper engine quote hook
    this.paperQuoteHook = null;
  }

  setPaperQuoteHook(hookFn) {
    this.paperQuoteHook = hookFn;
  }

  /**
   * 1. Feed Single Market Price Tick or Quote
   */
  feedTick({
    symbol,
    price,
    volume = 1,
    bid = null,
    ask = null,
    timestamp = Date.now(),
    venue = "MANUAL_FEED",
    source = "OPERATOR_DIRECT"
  } = {}) {
    const sym = String(symbol || "").trim().toUpperCase();
    const numPrice = Number(price);
    const numVol = Number(volume) || 1;
    const tickTime = Number(timestamp) || Date.now();

    if (!sym) {
      return { success: false, reason: "INVALID_SYMBOL", error: "Symbol is required" };
    }
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      this.telemetry.totalRecordsRejected++;
      return { success: false, reason: "INVALID_PRICE", error: `Price must be positive finite number (got ${price})` };
    }

    // Sanitize tick
    const lastTick = this.customQuotes.get(sym);
    const sanitized = validatePriceTick(
      { price: numPrice, volume: numVol, timestamp: tickTime },
      lastTick ? { price: lastTick.price } : null,
      { maxJumpPercent: 35, now: Date.now() }
    );

    if (!sanitized.valid) {
      this.telemetry.totalRecordsRejected++;
      return { success: false, reason: sanitized.reason, error: "Tick rejected by data sanitizer" };
    }

    // Bid / Ask normalization
    const effectiveBid = Number.isFinite(Number(bid)) && Number(bid) > 0 ? Number(bid) : numPrice * 0.9998;
    const effectiveAsk = Number.isFinite(Number(ask)) && Number(ask) > 0 ? Number(ask) : numPrice * 1.0002;

    if (effectiveBid > effectiveAsk) {
      this.telemetry.totalRecordsRejected++;
      return { success: false, reason: "BID_ASK_INVERSION", error: `Bid ($${effectiveBid}) cannot exceed Ask ($${effectiveAsk})` };
    }

    const tickRecord = {
      feedId: randomUUID(),
      type: "TICK",
      symbol: sym,
      price: numPrice,
      volume: numVol,
      bid: effectiveBid,
      ask: effectiveAsk,
      spreadBps: Number((((effectiveAsk - effectiveBid) / numPrice) * 10000).toFixed(2)),
      venue,
      source,
      timestamp: tickTime,
      ingestedAt: Date.now()
    };

    // 1. Record into Timeseries Store
    try {
      recordMarketTick({
        symbol: sym,
        price: numPrice,
        volume: numVol,
        timestamp: tickTime,
        venue
      });
    } catch (_) {}

    // 2. Cache latest quote & pass to paper hook if wired
    this.customQuotes.set(sym, tickRecord);
    if (typeof this.paperQuoteHook === "function") {
      try {
        this.paperQuoteHook(sym, numPrice, tickTime);
      } catch (_) {}
    }

    // 3. Emit Deterministic Event to Event Bus (AUDIT_PLANE)
    try {
      aifieEventBus.emit("MARKET_TICK", "DATA_FEEDING_ENGINE", tickRecord.feedId, {
        symbol: sym,
        price: numPrice,
        volume: numVol,
        venue,
        source
      });
    } catch (_) {}

    // 4. Update Telemetry & Ledger
    this._recordFeedSuccess("TICK", sym, tickRecord);
    this.telemetry.totalTicksFed++;

    return {
      success: true,
      correlationId: tickRecord.feedId,
      latencyMs: Date.now() - tickRecord.ingestedAt,
      message: `Successfully ingested tick for ${sym} @ $${numPrice.toLocaleString()}`,
      record: tickRecord
    };
  }

  /**
   * 2. Feed OHLCV Candle Bar
   */
  feedCandle({
    symbol,
    open,
    high,
    low,
    close,
    volume = 1,
    timeframe = "1m",
    timestamp = Date.now(),
    venue = "MANUAL_FEED"
  } = {}) {
    const sym = String(symbol || "").trim().toUpperCase();
    const o = Number(open);
    const h = Number(high);
    const l = Number(low);
    const c = Number(close);
    const v = Number(volume) || 1;

    if (!sym || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) {
      this.telemetry.totalRecordsRejected++;
      return { success: false, reason: "INVALID_OHLCV", error: "Open, High, Low, Close must all be finite numbers" };
    }
    if (h < l || h < Math.max(o, c) || l > Math.min(o, c)) {
      this.telemetry.totalRecordsRejected++;
      return { success: false, reason: "OHLCV_VIOLATION", error: "High must be >= Low and bounds must envelop Open and Close" };
    }

    const candleRecord = {
      feedId: randomUUID(),
      type: "CANDLE",
      symbol: sym,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
      timeframe,
      venue,
      timestamp: Number(timestamp) || Date.now(),
      ingestedAt: Date.now()
    };

    // Feed close as active quote as well
    this.feedTick({ symbol: sym, price: c, volume: v, timestamp, venue, source: "CANDLE_CLOSE_FEED" });

    // Emit event
    try {
      aifieEventBus.emit("MARKET_TICK", "DATA_FEEDING_ENGINE", candleRecord.feedId, {
        symbol: sym,
        timeframe,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v
      });
    } catch (_) {}

    this._recordFeedSuccess("CANDLE", sym, candleRecord);
    this.telemetry.totalCandlesFed++;

    return {
      success: true,
      correlationId: candleRecord.feedId,
      latencyMs: Date.now() - candleRecord.ingestedAt,
      message: `Successfully ingested ${timeframe} candle for ${sym} [C: $${c.toLocaleString()}]`,
      record: candleRecord
    };
  }

  /**
   * 3. Feed Array of Candles
   */
  feedCandles({ symbol, candles = [], timeframe = "1m", venue = "BATCH_FEED" } = {}) {
    const sym = String(symbol || "").trim().toUpperCase();
    if (!sym || !Array.isArray(candles) || candles.length === 0) {
      return { success: false, reason: "INVALID_CANDLES_ARRAY", error: "Must provide non-empty array of candles" };
    }

    let accepted = 0;
    let rejected = 0;
    const errors = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const res = this.feedCandle({
        symbol: sym,
        open: c.open ?? c[1],
        high: c.high ?? c[2],
        low: c.low ?? c[3],
        close: c.close ?? c[4],
        volume: c.volume ?? c[5] ?? 1,
        timeframe: c.timeframe || timeframe,
        timestamp: c.timestamp ?? c[0] ?? Date.now(),
        venue
      });
      if (res.success) accepted++;
      else {
        rejected++;
        if (errors.length < 5) errors.push(`Candle #${i}: ${res.error}`);
      }
    }

    return {
      success: accepted > 0,
      total: candles.length,
      accepted,
      rejected,
      errors
    };
  }

  /**
   * 4. Feed L2 Order Book Depth Snapshot
   */
  feedOrderBook({
    symbol,
    bids = [],
    asks = [],
    timestamp = Date.now(),
    venue = "MANUAL_FEED"
  } = {}) {
    const sym = String(symbol || "").trim().toUpperCase();
    if (!sym || !Array.isArray(bids) || !Array.isArray(asks)) {
      this.telemetry.totalRecordsRejected++;
      return { success: false, reason: "INVALID_ORDERBOOK", error: "Must provide bids and asks arrays" };
    }

    // Sort bids descending, asks ascending
    const sortedBids = [...bids].map(b => [
      Number(b[0] !== undefined ? b[0] : b.price),
      Number(b[1] !== undefined ? b[1] : (b.size || b.quantity || 1))
    ])
      .filter(b => Number.isFinite(b[0]) && b[0] > 0 && Number.isFinite(b[1]) && b[1] > 0)
      .sort((a, b) => b[0] - a[0]);

    const sortedAsks = [...asks].map(a => [
      Number(a[0] !== undefined ? a[0] : a.price),
      Number(a[1] !== undefined ? a[1] : (a.size || a.quantity || 1))
    ])
      .filter(a => Number.isFinite(a[0]) && a[0] > 0 && Number.isFinite(a[1]) && a[1] > 0)
      .sort((a, b) => a[0] - b[0]);

    if (sortedBids.length > 0 && sortedAsks.length > 0) {
      if (sortedBids[0][0] >= sortedAsks[0][0]) {
        this.telemetry.totalRecordsRejected++;
        return { success: false, reason: "ORDERBOOK_CROSSED", error: `Crossed orderbook: Best Bid ($${sortedBids[0][0]}) >= Best Ask ($${sortedAsks[0][0]})` };
      }
    }

    // Calculate OBI (Order Book Imbalance)
    const bidVol = sortedBids.slice(0, 5).reduce((acc, b) => acc + b[1], 0);
    const askVol = sortedAsks.slice(0, 5).reduce((acc, a) => acc + a[1], 0);
    const obi = (bidVol + askVol) > 0 ? Number(((bidVol - askVol) / (bidVol + askVol)).toFixed(4)) : 0;
    const bestBid = sortedBids[0] ? sortedBids[0][0] : null;
    const bestAsk = sortedAsks[0] ? sortedAsks[0][0] : null;
    const midPrice = bestBid && bestAsk ? Number(((bestBid + bestAsk) / 2).toFixed(2)) : (bestBid || bestAsk);

    const obRecord = {
      feedId: randomUUID(),
      type: "ORDERBOOK",
      symbol: sym,
      bidsCount: sortedBids.length,
      asksCount: sortedAsks.length,
      bestBid,
      bestAsk,
      midPrice,
      orderBookImbalance: obi,
      venue,
      timestamp: Number(timestamp) || Date.now(),
      ingestedAt: Date.now()
    };

    this.customOrderBooks.set(sym, {
      ...obRecord,
      bids: sortedBids.slice(0, 20),
      asks: sortedAsks.slice(0, 20)
    });

    // Feed midPrice as current quote
    if (midPrice) {
      this.feedTick({ symbol: sym, price: midPrice, bid: bestBid, ask: bestAsk, timestamp, venue, source: "ORDERBOOK_MID_FEED" });
    }

    try {
      aifieEventBus.emit("ORDERBOOK_UPDATE", "DATA_FEEDING_ENGINE", obRecord.feedId, {
        symbol: sym,
        bestBid,
        bestAsk,
        midPrice,
        obi
      });
    } catch (_) {}

    this._recordFeedSuccess("ORDERBOOK", sym, obRecord);
    this.telemetry.totalOrderBooksFed++;

    return {
      success: true,
      correlationId: obRecord.feedId,
      bestBid,
      bestAsk,
      midPrice,
      obi,
      message: `Order book snapshot ingested for ${sym} (Bids: ${sortedBids.length}, Asks: ${sortedAsks.length}, OBI: ${obi})`,
      record: obRecord
    };
  }

  /**
   * 5. Feed News, Macro Events, and Sentiment Data
   */
  feedNews({
    symbol = "GLOBAL",
    headline,
    content = "",
    sentiment = null,
    sentimentScore = null, // -1.0 to +1.0
    sentimentLabel = "NEUTRAL", // BULLISH | BEARISH | NEUTRAL
    source = "OPERATOR_FEED",
    impact = "MEDIUM", // HIGH | MEDIUM | LOW
    timestamp = Date.now()
  } = {}) {
    const sym = String(symbol || "GLOBAL").trim().toUpperCase();
    const head = String(headline || "").trim();

    if (!head) {
      return { success: false, reason: "MISSING_HEADLINE", error: "Headline text is required" };
    }

    // Auto calculate sentimentScore if not provided
    const providedScore = sentimentScore !== null ? Number(sentimentScore) : (sentiment !== null && sentiment !== undefined ? Number(sentiment) : null);
    let score = providedScore !== null && Number.isFinite(providedScore) ? providedScore : NaN;
    if (!Number.isFinite(score)) {
      const lower = head.toLowerCase() + " " + content.toLowerCase();
      const posWords = ["beat", "record", "profit", "surge", "bull", "growth", "approval", "partnership", "breakthrough", "rally", "dividend"];
      const negWords = ["miss", "loss", "crash", "plunge", "bear", "fraud", "lawsuit", "investigation", "sanction", "ban", "warning", "bankrupt"];
      
      let posCount = posWords.filter(w => lower.includes(w)).length;
      let negCount = negWords.filter(w => lower.includes(w)).length;

      if (posCount > negCount) score = Math.min(0.95, 0.25 + (posCount * 0.2));
      else if (negCount > posCount) score = Math.max(-0.95, -0.25 - (negCount * 0.2));
      else score = 0.0;
    }

    const label = score > 0.15 ? "BULLISH" : (score < -0.15 ? "BEARISH" : "NEUTRAL");

    const newsRecord = {
      feedId: randomUUID(),
      type: "NEWS",
      symbol: sym,
      headline: head,
      content,
      sentimentScore: Number(score.toFixed(2)),
      sentimentLabel: label,
      impact: String(impact).toUpperCase(),
      source,
      timestamp: Number(timestamp) || Date.now(),
      ingestedAt: Date.now()
    };

    this.customNews.unshift(newsRecord);
    if (this.customNews.length > 100) this.customNews.pop();

    try {
      aifieEventBus.emit("FEATURE_UPDATE", "DATA_FEEDING_ENGINE", newsRecord.feedId, {
        symbol: sym,
        headline: head,
        sentimentScore: score,
        sentimentLabel: label
      });
    } catch (_) {}

    this._recordFeedSuccess("NEWS", sym, newsRecord);
    this.telemetry.totalNewsFed++;

    return {
      success: true,
      correlationId: newsRecord.feedId,
      latencyMs: Date.now() - newsRecord.ingestedAt,
      message: `News event ingested for ${sym}: "${head.slice(0, 50)}..." [${label} (${score})]`,
      record: newsRecord
    };
  }

  /**
   * 6. Feed Custom Alpha Strategy Signal
   */
  feedSignal({
    symbol,
    strategy = "EXTERNAL_ALPHA_FEED",
    signal = "BUY", // BUY | SELL | FLAT
    confidence = 0.85,
    horizonMs = 3600000,
    rationale = "Operator direct signal feed"
  } = {}) {
    const sym = String(symbol || "").trim().toUpperCase();
    const sig = String(signal || "").toUpperCase();

    if (!sym || !["BUY", "SELL", "FLAT", "HOLD"].includes(sig)) {
      this.telemetry.totalRecordsRejected++;
      return { success: false, reason: "INVALID_SIGNAL", error: "Signal must be BUY, SELL, or FLAT" };
    }

    const signalRecord = {
      feedId: randomUUID(),
      type: "SIGNAL",
      symbol: sym,
      strategy,
      signal: sig,
      confidence: Math.max(0.1, Math.min(0.99, Number(confidence) || 0.85)),
      horizonMs: Number(horizonMs) || 3600000,
      rationale,
      timestamp: Date.now()
    };

    this.customSignals.unshift(signalRecord);
    if (this.customSignals.length > 50) this.customSignals.pop();

    try {
      aifieEventBus.emit("SIGNAL_CREATED", "DATA_FEEDING_ENGINE", signalRecord.feedId, signalRecord);
    } catch (_) {}

    this._recordFeedSuccess("SIGNAL", sym, signalRecord);
    this.telemetry.totalSignalsFed++;

    return {
      success: true,
      correlationId: signalRecord.feedId,
      latencyMs: Date.now() - signalRecord.timestamp,
      message: `Alpha signal registered for ${sym}: ${sig} (${(signalRecord.confidence * 100).toFixed(1)}% conf)`,
      record: signalRecord
    };
  }

  /**
   * 7. Bulk Batch Ingestion (Raw CSV or JSON array)
   */
  feedBatch({
    format = "json",
    type = "tick",
    records = null,
    rawText = "",
    data = null
  } = {}) {
    let parsedItems = [];

    const effectiveRecords = records || (Array.isArray(data) ? data : null);
    const effectiveText = rawText || (typeof data === "string" ? data : "");

    if (Array.isArray(effectiveRecords)) {
      parsedItems = effectiveRecords;
    } else if (effectiveText && typeof effectiveText === "string") {
      const trimmed = effectiveText.trim();
      if (format === "csv" || trimmed.includes(",")) {
        // Parse CSV lines
        const lines = trimmed.split(/\r?\n/).filter(Boolean);
        const header = lines[0].toLowerCase().split(",").map(h => h.trim());
        const dataLines = header.includes("price") || header.includes("close") || header.includes("symbol") ? lines.slice(1) : lines;

        for (const line of dataLines) {
          const cols = line.split(",").map(c => c.trim());
          if (cols.length >= 2) {
            // Assume format: [symbol, price, volume, timestamp] or [timestamp, symbol, price]
            if (isNaN(Number(cols[0]))) {
              parsedItems.push({ symbol: cols[0], price: Number(cols[1]), volume: Number(cols[2] || 1) });
            } else if (isNaN(Number(cols[1]))) {
              parsedItems.push({ timestamp: Number(cols[0]), symbol: cols[1], price: Number(cols[2]), volume: Number(cols[3] || 1) });
            } else {
              parsedItems.push({ price: Number(cols[0]), volume: Number(cols[1]) });
            }
          }
        }
      } else {
        // Parse JSON string
        try {
          const j = JSON.parse(trimmed);
          parsedItems = Array.isArray(j) ? j : (j.records || [j]);
        } catch (err) {
          return { success: false, reason: "JSON_PARSE_ERROR", error: `Failed to parse JSON batch: ${err.message}` };
        }
      }
    }

    if (parsedItems.length === 0) {
      return { success: false, reason: "EMPTY_BATCH", error: "No records found in batch payload" };
    }

    let accepted = 0;
    let rejected = 0;
    const errors = [];

    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];
      let res;
      if (type === "candle") res = this.feedCandle(item);
      else if (type === "news") res = this.feedNews(item);
      else if (type === "signal") res = this.feedSignal(item);
      else res = this.feedTick(item);

      if (res.success) accepted++;
      else {
        rejected++;
        if (errors.length < 5) errors.push(`Record #${i}: ${res.error || res.reason}`);
      }
    }

    this.telemetry.totalBatchesFed++;

    return {
      success: accepted > 0,
      total: parsedItems.length,
      accepted,
      rejected,
      errors
    };
  }

  /**
   * Helper to maintain audit ledger & telemetry
   */
  _recordFeedSuccess(type, symbol, record) {
    const now = Date.now();
    if (!this.telemetry.firstFedAt) this.telemetry.firstFedAt = now;
    this.telemetry.lastFedAt = now;
    this.telemetry.symbolsActive.add(symbol);

    this.feedLedger.push({
      feedId: record.feedId,
      correlationId: record.feedId,
      type,
      symbol,
      channel: record.channel || record.venue || record.source || "API",
      price: record.price,
      volume: record.volume,
      open: record.open,
      high: record.high,
      low: record.low,
      close: record.close,
      headline: record.headline,
      sentiment: record.sentiment,
      strategy: record.strategy,
      action: record.signal || record.action,
      confidence: record.confidence,
      summary: type === "TICK" ? `$${record.price} (${record.channel || record.venue || "API"})` :
               type === "CANDLE" ? `O:${record.open} H:${record.high} L:${record.low} C:${record.close}` :
               type === "NEWS" ? `"${(record.headline || '').slice(0, 30)}..."` :
               type === "SIGNAL" ? `${record.action || record.signal} (Conf: ${record.confidence})` : `${type} Data`,
      timestamp: record.timestamp || now,
      receivedAt: now
    });
  }

  /**
   * Get Feed Telemetry Dashboard
   */
  getTelemetry() {
    const activeSymbolsArr = Array.from(this.telemetry.symbolsActive);
    const totalRecordsFed = this.telemetry.totalTicksFed +
      this.telemetry.totalCandlesFed +
      this.telemetry.totalNewsFed +
      this.telemetry.totalSignalsFed +
      this.telemetry.totalOrderBooksFed;

    return {
      status: "ACTIVE_INGESTING",
      totalRecordsFed,
      ticksFed: this.telemetry.totalTicksFed,
      candlesFed: this.telemetry.totalCandlesFed,
      newsFed: this.telemetry.totalNewsFed,
      signalsFed: this.telemetry.totalSignalsFed,
      orderBooksFed: this.telemetry.totalOrderBooksFed,
      batchesFed: this.telemetry.totalBatchesFed,
      rejectedFed: this.telemetry.totalRecordsRejected,
      ledgerSize: this.feedLedger.length,
      maxLedgerSize: this.feedLedger.capacity,
      activeChannels: ["REST_API", "WEB_PANEL", "TELEGRAM", "CLI", "BATCH"],
      breakdown: {
        ticks: this.telemetry.totalTicksFed,
        candles: this.telemetry.totalCandlesFed,
        news: this.telemetry.totalNewsFed,
        signals: this.telemetry.totalSignalsFed,
        orderBooks: this.telemetry.totalOrderBooksFed,
        batches: this.telemetry.totalBatchesFed,
        rejected: this.telemetry.totalRecordsRejected
      },
      activeSymbolsCount: activeSymbolsArr.length,
      activeSymbols: activeSymbolsArr.slice(0, 15),
      firstFedAt: this.telemetry.firstFedAt,
      lastFedAt: this.telemetry.lastFedAt,
      recentLedgerCount: this.feedLedger.length
    };
  }

  /**
   * Get Recent Feeding Ledger for UI and CLI
   */
  getRecentLedger(limit = 30) {
    return this.feedLedger.sliceTail(limit);
  }

  /**
   * Get latest custom quote for a symbol
   */
  getQuote(symbol) {
    const sym = String(symbol || "").trim().toUpperCase();
    return this.customQuotes.get(sym) || null;
  }
}

// Global Singleton Instance
export const dataFeedingEngine = new DataFeedingEngine();
