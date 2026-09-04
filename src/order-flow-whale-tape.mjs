/**
 * Phase 9: Order Flow & Whale Tape Analysis Engine
 * Detects whale trade clusters, iceberg orders, and Cumulative Volume Delta (CVD).
 */

export class OrderFlowWhaleTracker {
  constructor(options = {}) {
    this.whaleThresholdNotional = options.whaleThresholdNotional || 500000; // $500k default
    this.tapeHistory = [];
    this.cvdHistory = [];
    this.detectedWhales = [];
    this.detectedIcebergs = [];
    this.runningCvd = 0;
  }

  /**
   * Process incoming trade tick
   * @param {Object} trade - { price, size, side: 'buy'|'sell', timestamp, symbol }
   */
  processTradeTick(trade) {
    const price = Number(trade.price || 0);
    const size = Number(trade.size || trade.qty || trade.quantity || 0);
    const notional = price * size;
    const isBuyerInitiated = (trade.side === 'buy' || trade.isBuyerMaker === false);
    const delta = isBuyerInitiated ? size : -size;

    this.runningCvd += delta;

    const tickRecord = {
      price,
      size,
      notional,
      side: isBuyerInitiated ? 'BUY' : 'SELL',
      delta,
      runningCvd: Number(this.runningCvd.toFixed(4)),
      symbol: (trade.symbol || 'BTCUSDT').toUpperCase(),
      timestamp: trade.timestamp || new Date().toISOString()
    };

    this.tapeHistory.push(tickRecord);
    if (this.tapeHistory.length > 5000) this.tapeHistory.shift();

    // Check if trade is a Whale Transaction
    if (notional >= this.whaleThresholdNotional) {
      const whaleEvent = {
        type: 'WHALE_TRADE',
        symbol: tickRecord.symbol,
        notional: Number(notional.toFixed(2)),
        price,
        size,
        side: tickRecord.side,
        timestamp: tickRecord.timestamp
      };
      this.detectedWhales.unshift(whaleEvent);
      if (this.detectedWhales.length > 100) this.detectedWhales.pop();
    }

    return tickRecord;
  }

  /**
   * Detect Whale Walls in Order Book Depth
   * @param {Array} bids - Array of [price, size]
   * @param {Array} asks - Array of [price, size]
   * @returns {Object} { whaleBidWalls, whaleAskWalls, dominantWallSide }
   */
  detectWhaleWalls(bids = [], asks = []) {
    const whaleBidWalls = [];
    const whaleAskWalls = [];

    for (const [pStr, sStr] of bids) {
      const price = Number(pStr);
      const size = Number(sStr);
      const notional = price * size;
      if (notional >= this.whaleThresholdNotional) {
        whaleBidWalls.push({ price, size, notional: Number(notional.toFixed(2)), side: 'BID' });
      }
    }

    for (const [pStr, sStr] of asks) {
      const price = Number(pStr);
      const size = Number(sStr);
      const notional = price * size;
      if (notional >= this.whaleThresholdNotional) {
        whaleAskWalls.push({ price, size, notional: Number(notional.toFixed(2)), side: 'ASK' });
      }
    }

    const totalBidWhaleNotional = whaleBidWalls.reduce((sum, w) => sum + w.notional, 0);
    const totalAskWhaleNotional = whaleAskWalls.reduce((sum, w) => sum + w.notional, 0);

    return {
      whaleBidWalls,
      whaleAskWalls,
      totalBidWhaleNotional,
      totalAskWhaleNotional,
      dominantSide: totalBidWhaleNotional > totalAskWhaleNotional ? 'BIDS_DOMINANT' : (totalAskWhaleNotional > totalBidWhaleNotional ? 'ASKS_DOMINANT' : 'BALANCED')
    };
  }

  /**
   * Detect Iceberg orders from consecutive trades at price level exceeding visible quote size
   * @param {number} priceLevel - Monitored price level
   * @param {number} visibleSize - Reported visible level 2 quote size
   * @param {Array} executedTradesAtPrice - Trades executed at this exact price
   */
  detectIceberg(priceLevel, visibleSize, executedTradesAtPrice = []) {
    const totalExecutedVolume = executedTradesAtPrice.reduce((sum, t) => sum + Number(t.size || t.qty || 0), 0);
    const ratio = visibleSize > 0 ? (totalExecutedVolume / visibleSize) : 1;

    // If total executed volume is >= 2.5x visible depth, an iceberg is reloading
    const isIceberg = ratio >= 2.5 && totalExecutedVolume > 0;
    const icebergReport = {
      priceLevel,
      visibleSize,
      totalExecutedVolume,
      hiddenReloadRatio: Number(ratio.toFixed(2)),
      isIceberg,
      detectedAt: new Date().toISOString()
    };

    if (isIceberg) {
      this.detectedIcebergs.unshift(icebergReport);
      if (this.detectedIcebergs.length > 50) this.detectedIcebergs.pop();
    }

    return icebergReport;
  }

  /**
   * Compute Cumulative Volume Delta (CVD) divergence over last N ticks
   */
  getCvdAnalytics(windowSize = 100) {
    const slice = this.tapeHistory.slice(-windowSize);
    if (slice.length === 0) {
      return { cvd: 0, deltaTrend: 'NEUTRAL', buyerVolume: 0, sellerVolume: 0 };
    }

    const buyerVolume = slice.filter(t => t.side === 'BUY').reduce((acc, t) => acc + t.size, 0);
    const sellerVolume = slice.filter(t => t.side === 'SELL').reduce((acc, t) => acc + t.size, 0);
    const netDelta = buyerVolume - sellerVolume;

    const firstPrice = slice[0].price;
    const lastPrice = slice[slice.length - 1].price;
    const priceChange = lastPrice - firstPrice;

    // Divergence: Price falling while CVD rising (absorption) or Price rising while CVD falling
    let divergence = 'NONE';
    if (priceChange <= 0 && netDelta > 0) {
      divergence = 'BULLISH_ABSORPTION_DIVERGENCE';
    } else if (priceChange >= 0 && netDelta < 0) {
      divergence = 'BEARISH_EXHAUSTION_DIVERGENCE';
    }

    return {
      windowTicks: slice.length,
      buyerVolume: Number(buyerVolume.toFixed(4)),
      sellerVolume: Number(sellerVolume.toFixed(4)),
      netDelta: Number(netDelta.toFixed(4)),
      runningCvd: Number(this.runningCvd.toFixed(4)),
      priceChange: Number(priceChange.toFixed(4)),
      divergence
    };
  }

  getStatus() {
    return {
      engine: 'PHASE_9_ORDER_FLOW_WHALE_TAPE',
      totalTapeTicks: this.tapeHistory.length,
      runningCvd: Number(this.runningCvd.toFixed(4)),
      whaleThresholdNotional: this.whaleThresholdNotional,
      recentWhalesCount: this.detectedWhales.length,
      recentIcebergsCount: this.detectedIcebergs.length,
      lastWhaleEvent: this.detectedWhales[0] || null
    };
  }
}

export const orderFlowTracker = new OrderFlowWhaleTracker();
