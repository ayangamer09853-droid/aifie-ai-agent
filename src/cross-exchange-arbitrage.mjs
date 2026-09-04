/**
 * Phase 10: Cross-Exchange Arbitrage Engine
 * Scans spatial multi-venue spreads and triangular cyclic currency loops for synthetic alpha.
 */

export class CrossExchangeArbitrageEngine {
  constructor(options = {}) {
    this.minNetProfitPercent = options.minNetProfitPercent || 0.15; // 0.15% minimum net spread
    this.defaultFeeRate = options.defaultFeeRate || 0.0010;        // 0.10% per leg taker fee
    this.estimatedSlippage = options.estimatedSlippage || 0.0005;  // 0.05% latency buffer
    this.detectedOpportunities = [];
  }

  /**
   * Scan spatial multi-venue spread for a single asset
   * @param {string} symbol - Ticker symbol (e.g. BTCUSDT or AAPL)
   * @param {Object} venueQuotes - { binance: { bid, ask }, alpaca: { bid, ask }, kraken: ... }
   */
  scanSpatialArbitrage(symbol, venueQuotes = {}) {
    const venues = Object.entries(venueQuotes).filter(([_, q]) => q && Number(q.ask) > 0 && Number(q.bid) > 0);
    if (venues.length < 2) {
      return { symbol, opportunityFound: false, reason: 'INSUFFICIENT_VENUES' };
    }

    let minAsk = Infinity;
    let buyVenue = null;
    let maxBid = -Infinity;
    let sellVenue = null;

    for (const [venueName, quote] of venues) {
      const ask = Number(quote.ask);
      const bid = Number(quote.bid);

      if (ask < minAsk) {
        minAsk = ask;
        buyVenue = venueName;
      }
      if (bid > maxBid) {
        maxBid = bid;
        sellVenue = venueName;
      }
    }

    if (!buyVenue || !sellVenue || buyVenue === sellVenue) {
      return { symbol, opportunityFound: false, reason: 'NO_CROSS_VENUE_SPREAD' };
    }

    const grossSpread = maxBid - minAsk;
    const grossSpreadPercent = (grossSpread / minAsk) * 100;

    // Deduct two-way transaction fees + latency slippage
    const totalCostsPercent = (this.defaultFeeRate * 2 + this.estimatedSlippage) * 100;
    const netProfitPercent = grossSpreadPercent - totalCostsPercent;
    const isProfitable = netProfitPercent >= this.minNetProfitPercent;

    const opportunity = {
      type: 'SPATIAL_ARBITRAGE',
      symbol,
      buyVenue,
      buyPrice: minAsk,
      sellVenue,
      sellPrice: maxBid,
      grossSpread: Number(grossSpread.toFixed(4)),
      grossSpreadPercent: Number(grossSpreadPercent.toFixed(4)),
      totalCostsPercent: Number(totalCostsPercent.toFixed(4)),
      netProfitPercent: Number(netProfitPercent.toFixed(4)),
      isProfitable,
      recommendedAction: isProfitable ? `BUY on ${buyVenue} at ${minAsk}, SELL on ${sellVenue} at ${maxBid}` : 'MONITOR',
      timestamp: new Date().toISOString()
    };

    if (isProfitable) {
      this.detectedOpportunities.unshift(opportunity);
      if (this.detectedOpportunities.length > 50) this.detectedOpportunities.pop();
    }

    return opportunity;
  }

  /**
   * Scan 3-leg triangular currency loop
   * E.g. Leg 1: USD -> A, Leg 2: A -> B, Leg 3: B -> USD
   * @param {Object} loopConfig - { startCurrency: 'USD', leg1: { pair, rate, side }, leg2: ..., leg3: ... }
   */
  scanTriangularArbitrage(loopConfig = {}) {
    const { startCurrency = 'USD', leg1, leg2, leg3 } = loopConfig;
    if (!leg1 || !leg2 || !leg3) {
      throw new Error('MISSING_TRIANGULAR_LEGS');
    }

    let capital = 1000; // test $1,000 starting notional

    // Leg 1: startCurrency -> Asset A
    let capitalAfterLeg1 = (leg1.side === 'BUY') ? (capital / leg1.rate) : (capital * leg1.rate);
    capitalAfterLeg1 *= (1 - this.defaultFeeRate);

    // Leg 2: Asset A -> Asset B
    let capitalAfterLeg2 = (leg2.side === 'BUY') ? (capitalAfterLeg1 / leg2.rate) : (capitalAfterLeg1 * leg2.rate);
    capitalAfterLeg2 *= (1 - this.defaultFeeRate);

    // Leg 3: Asset B -> startCurrency
    let finalCapital = (leg3.side === 'BUY') ? (capitalAfterLeg2 / leg3.rate) : (capitalAfterLeg2 * leg3.rate);
    finalCapital *= (1 - this.defaultFeeRate);

    const netProfitUsd = finalCapital - capital;
    const netReturnPercent = (netProfitUsd / capital) * 100;
    const isProfitable = netReturnPercent >= this.minNetProfitPercent;

    const report = {
      type: 'TRIANGULAR_ARBITRAGE',
      startCurrency,
      initialCapital: capital,
      finalCapital: Number(finalCapital.toFixed(4)),
      netProfitUsd: Number(netProfitUsd.toFixed(4)),
      netReturnPercent: Number(netReturnPercent.toFixed(4)),
      isProfitable,
      legs: [
        { leg: 1, pair: leg1.pair, action: leg1.side, rate: leg1.rate },
        { leg: 2, pair: leg2.pair, action: leg2.side, rate: leg2.rate },
        { leg: 3, pair: leg3.pair, action: leg3.side, rate: leg3.rate }
      ],
      timestamp: new Date().toISOString()
    };

    if (isProfitable) {
      this.detectedOpportunities.unshift(report);
      if (this.detectedOpportunities.length > 50) this.detectedOpportunities.pop();
    }

    return report;
  }

  getOpportunities() {
    return {
      count: this.detectedOpportunities.length,
      opportunities: this.detectedOpportunities
    };
  }

  getStatus() {
    return {
      engine: 'PHASE_10_CROSS_EXCHANGE_ARBITRAGE',
      minNetProfitPercent: this.minNetProfitPercent,
      defaultFeeRate: this.defaultFeeRate,
      estimatedSlippage: this.estimatedSlippage,
      totalDetectedOpportunities: this.detectedOpportunities.length,
      latestOpportunity: this.detectedOpportunities[0] || null
    };
  }
}

export const crossExchangeArbitrage = new CrossExchangeArbitrageEngine();
