/**
 * Institutional Level 3 (L3) Order Queue Dynamics & Microstructure Engine v1.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Capabilities:
 * 1. Order-by-order Level 3 Message Processing (ADD, CANCEL, MODIFY, EXECUTE).
 * 2. FIFO Queue Priority Estimator (tracks estimated queue position for simulated orders).
 * 3. Real-Time Cancel-to-Fill Ratio (CFR) & Quote Stuffing / Spoofing Anomaly Sentry.
 * 4. Microsecond Volume-Synchronized Probability of Toxicity (VPIN) Estimator.
 * 5. Fill Probability Decay Curves based on queue depth & order book velocity.
 */

import { randomUUID } from "node:crypto";

export class L3OrderQueueEngine {
  constructor(options = {}) {
    this.symbol = options.symbol || "BTCUSDT";
    this.bucketVolume = options.bucketVolume || 50; // volume per VPIN bucket
    this.numBuckets = options.numBuckets || 20; // number of buckets for rolling VPIN
    this.bids = new Map(); // price -> Map(orderId -> { orderId, size, timestamp, priority })
    this.asks = new Map(); // price -> Map(orderId -> { orderId, size, timestamp, priority })
    this.tradeHistory = [];
    this.orderEventLog = [];
    this.vpinBuckets = [];
    this.currentBucket = { buyVolume: 0, sellVolume: 0, totalVolume: 0 };
    
    // Anomaly tracking
    this.recentCancels = 0;
    this.recentFills = 0;
    this.cfrWindowMs = 60000;
    this.lastCfrReset = Date.now();
  }

  /**
   * Processes an incoming L3 order book event
   * @param {Object} event - { eventType: 'ADD'|'CANCEL'|'MODIFY'|'EXECUTE', side: 'buy'|'sell', price, size, orderId, timestamp }
   */
  processL3Event(event) {
    const { eventType, side, price, size, orderId = randomUUID(), timestamp = Date.now() } = event;
    const isBuy = String(side).toLowerCase() === "buy";
    const bookSide = isBuy ? this.bids : this.asks;

    const record = { eventType, side: isBuy ? "buy" : "sell", price: Number(price), size: Number(size), orderId, timestamp };
    this.orderEventLog.push(record);
    if (this.orderEventLog.length > 500) this.orderEventLog.shift();

    switch (eventType.toUpperCase()) {
      case "ADD": {
        if (!bookSide.has(record.price)) {
          bookSide.set(record.price, new Map());
        }
        const priceLevel = bookSide.get(record.price);
        priceLevel.set(orderId, {
          orderId,
          size: record.size,
          timestamp,
          queuePriority: priceLevel.size + 1
        });
        break;
      }

      case "CANCEL": {
        this.recentCancels++;
        if (bookSide.has(record.price)) {
          const priceLevel = bookSide.get(record.price);
          priceLevel.delete(orderId);
          if (priceLevel.size === 0) bookSide.delete(record.price);
        }
        break;
      }

      case "MODIFY": {
        if (bookSide.has(record.price)) {
          const priceLevel = bookSide.get(record.price);
          if (priceLevel.has(orderId)) {
            const existing = priceLevel.get(orderId);
            // If size increased, lose queue priority and move to back of queue
            if (record.size > existing.size) {
              priceLevel.delete(orderId);
              priceLevel.set(orderId, { orderId, size: record.size, timestamp, queuePriority: priceLevel.size + 1 });
            } else {
              existing.size = record.size;
            }
          }
        }
        break;
      }

      case "EXECUTE": {
        this.recentFills++;
        if (bookSide.has(record.price)) {
          const priceLevel = bookSide.get(record.price);
          if (priceLevel.has(orderId)) {
            const existing = priceLevel.get(orderId);
            if (existing.size <= record.size) {
              priceLevel.delete(orderId);
              if (priceLevel.size === 0) bookSide.delete(record.price);
            } else {
              existing.size -= record.size;
            }
          }
        }
        this._updateVpin(isBuy, record.size, record.price, timestamp);
        break;
      }
    }

    return {
      status: "L3_EVENT_COMMITTED",
      event: record,
      topOfBook: this.getTopOfBook()
    };
  }

  /**
   * Internal volume bucket updater for rolling VPIN
   */
  _updateVpin(isBuy, size, price, timestamp) {
    this.tradeHistory.push({ isBuy, size, price, timestamp });
    if (this.tradeHistory.length > 1000) this.tradeHistory.shift();

    let remainingSize = size;
    while (remainingSize > 0) {
      const spaceInBucket = this.bucketVolume - this.currentBucket.totalVolume;
      const fillAmount = Math.min(remainingSize, spaceInBucket);

      if (isBuy) this.currentBucket.buyVolume += fillAmount;
      else this.currentBucket.sellVolume += fillAmount;
      this.currentBucket.totalVolume += fillAmount;
      remainingSize -= fillAmount;

      if (this.currentBucket.totalVolume >= this.bucketVolume) {
        // Complete current bucket
        const imbalance = Math.abs(this.currentBucket.buyVolume - this.currentBucket.sellVolume);
        this.vpinBuckets.push({
          imbalance,
          buyVolume: this.currentBucket.buyVolume,
          sellVolume: this.currentBucket.sellVolume,
          totalVolume: this.currentBucket.totalVolume,
          timestamp
        });

        if (this.vpinBuckets.length > this.numBuckets) {
          this.vpinBuckets.shift();
        }

        this.currentBucket = { buyVolume: 0, sellVolume: 0, totalVolume: 0 };
      }
    }
  }

  /**
   * Calculates rolling VPIN (Volume-Synchronized Probability of Toxicity)
   * VPIN = sum(|V_buy - V_sell|) / (N * V_bucket)
   */
  calculateVpin() {
    if (this.vpinBuckets.length === 0) {
      return { vpin: 0.15, toxicityLevel: "LOW_TOXICITY", sampleBuckets: 0 };
    }

    const totalImbalance = this.vpinBuckets.reduce((sum, b) => sum + b.imbalance, 0);
    const totalVolume = this.vpinBuckets.reduce((sum, b) => sum + b.totalVolume, 0);
    const vpin = totalVolume > 0 ? Number((totalImbalance / totalVolume).toFixed(4)) : 0.15;

    let toxicityLevel = "NORMAL";
    if (vpin >= 0.45) toxicityLevel = "EXTREME_TOXICITY_ADVERSE_SELECTION";
    else if (vpin >= 0.30) toxicityLevel = "HIGH_TOXICITY";
    else if (vpin <= 0.10) toxicityLevel = "LOW_TOXICITY_BENIGN";

    return {
      vpin,
      toxicityLevel,
      sampleBuckets: this.vpinBuckets.length,
      recentTradeCount: this.tradeHistory.length
    };
  }

  /**
   * Estimates Queue Priority for a hypothetical or live placed limit order
   * @param {Object} order - { side: 'buy'|'sell', price, quantity }
   */
  estimateQueuePriority(order) {
    const isBuy = String(order.side).toLowerCase() === "buy";
    const bookSide = isBuy ? this.bids : this.asks;
    const price = Number(order.price);
    const quantity = Number(order.quantity || order.size || 1);

    let aheadVolume = 0;
    let aheadOrdersCount = 0;

    if (bookSide.has(price)) {
      const priceLevel = bookSide.get(price);
      aheadOrdersCount = priceLevel.size;
      for (const entry of priceLevel.values()) {
        aheadVolume += entry.size;
      }
    }

    // Better price levels ahead
    let betterPriceLevelsVolume = 0;
    for (const [p, map] of bookSide.entries()) {
      if ((isBuy && p > price) || (!isBuy && p < price)) {
        for (const entry of map.values()) {
          betterPriceLevelsVolume += entry.size;
        }
      }
    }

    const totalVolumeAhead = aheadVolume + betterPriceLevelsVolume;
    const vpinMetrics = this.calculateVpin();
    
    // Fill probability estimated by exponential decay with respect to ahead volume and toxicity
    const decayRate = 0.05 + (vpinMetrics.vpin * 0.1);
    const fillProbability = Number((Math.exp(-decayRate * (totalVolumeAhead / Math.max(1, quantity)))).toFixed(4));

    return {
      symbol: this.symbol,
      side: isBuy ? "buy" : "sell",
      price,
      quantity,
      queuePosition: aheadOrdersCount + 1,
      ordersAhead: aheadOrdersCount,
      volumeAheadAtPrice: aheadVolume,
      totalVolumeAhead,
      fillProbabilityPercent: Number((fillProbability * 100).toFixed(2)),
      vpinToxicity: vpinMetrics.vpin,
      toxicityLevel: vpinMetrics.toxicityLevel
    };
  }

  /**
   * Evaluates Cancel-to-Fill Ratio (CFR) and detects order spoofing / quote stuffing
   */
  evaluateCancelToFillRatio() {
    const now = Date.now();
    if (now - this.lastCfrReset > this.cfrWindowMs) {
      this.recentCancels = Math.floor(this.recentCancels * 0.5);
      this.recentFills = Math.floor(this.recentFills * 0.5);
      this.lastCfrReset = now;
    }

    const ratio = this.recentFills > 0 
      ? Number((this.recentCancels / this.recentFills).toFixed(2)) 
      : this.recentCancels > 0 ? this.recentCancels : 1.0;

    const isSpoofingSuspected = ratio > 25.0 && this.recentCancels > 50;

    return {
      cancelCount: this.recentCancels,
      fillCount: this.recentFills,
      cancelToFillRatio: ratio,
      isSpoofingSuspected,
      anomalyStatus: isSpoofingSuspected ? "HIGH_CFR_SPOOFING_ALERT" : "NORMAL_MARKET_MAKING"
    };
  }

  /**
   * Retrieves current Top of Book (BBO) and depth
   */
  getTopOfBook() {
    const bidPrices = Array.from(this.bids.keys()).sort((a, b) => b - a);
    const askPrices = Array.from(this.asks.keys()).sort((a, b) => a - b);

    const bestBid = bidPrices[0] || null;
    const bestAsk = askPrices[0] || null;
    const spread = bestBid && bestAsk ? Number((bestAsk - bestBid).toFixed(4)) : null;

    return {
      bestBid,
      bestAsk,
      spread,
      bidLevelsCount: bidPrices.length,
      askLevelsCount: askPrices.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generates comprehensive L3 Microstructure Report
   */
  getMicrostructureTelemetry() {
    return {
      symbol: this.symbol,
      topOfBook: this.getTopOfBook(),
      vpin: this.calculateVpin(),
      cfr: this.evaluateCancelToFillRatio(),
      totalOrderEventsLogged: this.orderEventLog.length,
      timestamp: new Date().toISOString()
    };
  }
}

// Global Singleton Instance for Platform Access
export const l3MicrostructureEngine = new L3OrderQueueEngine();
