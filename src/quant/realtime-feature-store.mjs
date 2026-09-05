// src/quant/realtime-feature-store.mjs
// Real-Time In-Memory Feature Store & Population Stability Index (PSI) Drift Sentry
// Pure Node.js ESM built-ins only

/**
 * Ring buffer maintaining fixed-size window of numeric observations.
 */
class RingBuffer {
  constructor(capacity = 500) {
    this.capacity = capacity;
    this.buffer = [];
  }

  push(val) {
    this.buffer.push(val);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
  }

  values() {
    return [...this.buffer];
  }

  size() {
    return this.buffer.length;
  }
}

/**
 * In-Memory Feature Store maintaining real-time features across watch symbols.
 */
export class RealtimeFeatureStore {
  constructor() {
    this.symbolFeatures = new Map();
    this.referenceDistributions = new Map(); // Baseline distributions for PSI drift calculation
  }

  _getStore(symbol) {
    if (!this.symbolFeatures.has(symbol)) {
      this.symbolFeatures.set(symbol, {
        prices: new RingBuffer(200),
        volumes: new RingBuffer(200),
        highs: new RingBuffer(200),
        lows: new RingBuffer(200),
        orderFlowImbalance: new RingBuffer(100),
        vpin: new RingBuffer(100),
        kalmanBeta: new RingBuffer(100),
        sentiment: new RingBuffer(100),
        lastUpdated: Date.now()
      });
    }
    return this.symbolFeatures.get(symbol);
  }

  /**
   * Ingest tick or bar data point into feature store.
   */
  ingestTick(symbol, { price, volume = 100, high = null, low = null, ofi = 0, vpin = 0.15, kalmanBeta = 1.0, sentiment = 0.5 }) {
    const store = this._getStore(symbol);
    store.prices.push(price);
    store.volumes.push(volume);
    store.highs.push(high !== null ? high : price * 1.001);
    store.lows.push(low !== null ? low : price * 0.999);
    store.orderFlowImbalance.push(ofi);
    store.vpin.push(vpin);
    store.kalmanBeta.push(kalmanBeta);
    store.sentiment.push(sentiment);
    store.lastUpdated = Date.now();
  }

  /**
   * Compute zero-latency feature vector snapshot for a symbol.
   */
  computeFeatureVector(symbol) {
    const store = this._getStore(symbol);
    const prices = store.prices.values();
    const highs = store.highs.values();
    const lows = store.lows.values();
    const len = prices.length;

    if (len < 5) {
      return {
        symbol,
        ready: false,
        sampleCount: len,
        timestamp: Date.now()
      };
    }

    // 1. Z-scored Returns & Momentum
    const currentPrice = prices[len - 1];
    const ret5 = len >= 5 ? (currentPrice - prices[len - 5]) / prices[len - 5] : 0;
    const ret20 = len >= 20 ? (currentPrice - prices[len - 20]) / prices[len - 20] : ret5;
    
    // Mean and standard deviation of rolling returns
    const returns = [];
    for (let i = 1; i < len; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1);
    const stdDev = Math.sqrt(variance) || 1e-4;
    const zScoreMomentum = Number(((ret20 - meanReturn) / stdDev).toFixed(4));

    // 2. Parkinson Extreme-Value Volatility Estimator
    // sigma_p = sqrt( 1 / (4 * ln(2) * n) * sum( (ln(H_i / L_i))^2 ) )
    let parkinsonSum = 0;
    const nParkinson = Math.min(len, highs.length, lows.length);
    for (let i = 0; i < nParkinson; i++) {
      const h = Math.max(highs[i], prices[i]);
      const l = Math.min(lows[i], prices[i]);
      parkinsonSum += Math.pow(Math.log(h / Math.max(1e-4, l)), 2);
    }
    const parkinsonVol = Math.sqrt((1 / (4 * Math.log(2) * nParkinson)) * parkinsonSum);

    // 3. Microstructure Averages
    const ofiVals = store.orderFlowImbalance.values();
    const avgOFI = ofiVals.length > 0 ? ofiVals.reduce((a, b) => a + b, 0) / ofiVals.length : 0;

    const vpinVals = store.vpin.values();
    const currentVPIN = vpinVals.length > 0 ? vpinVals[vpinVals.length - 1] : 0.15;

    const betaVals = store.kalmanBeta.values();
    const currentBeta = betaVals.length > 0 ? betaVals[betaVals.length - 1] : 1.0;

    const sentimentVals = store.sentiment.values();
    const currentSentiment = sentimentVals.length > 0 ? sentimentVals[sentimentVals.length - 1] : 0.5;

    return {
      symbol,
      ready: true,
      currentPrice,
      zScoreMomentum,
      return5Period: Number(ret5.toFixed(6)),
      return20Period: Number(ret20.toFixed(6)),
      rollingVolatility: Number(stdDev.toFixed(6)),
      parkinsonVolatility: Number(parkinsonVol.toFixed(6)),
      orderFlowImbalance: Number(avgOFI.toFixed(4)),
      vpinToxicity: Number(currentVPIN.toFixed(4)),
      kalmanBeta: Number(currentBeta.toFixed(4)),
      sentimentScore: Number(currentSentiment.toFixed(4)),
      sampleCount: len,
      lastUpdated: store.lastUpdated
    };
  }

  /**
   * Register baseline reference distribution for PSI calculation.
   */
  setBaselineDistribution(featureKey, baselineSamples) {
    this.referenceDistributions.set(featureKey, [...baselineSamples]);
  }

  /**
   * Population Stability Index (PSI) Drift Sentry.
   * Compares empirical bucket distribution of live values against baseline.
   */
  calculatePopulationStabilityIndex(featureKey, liveSamples, bucketCount = 5) {
    const baseline = this.referenceDistributions.get(featureKey);
    if (!baseline || baseline.length < 10 || liveSamples.length < 10) {
      return {
        featureKey,
        psi: 0.0,
        status: "INSUFFICIENT_DATA",
        dampeningMultiplier: 1.0
      };
    }

    // Determine min and max across combined distributions
    const combined = [...baseline, ...liveSamples];
    const minVal = Math.min(...combined);
    const maxVal = Math.max(...combined);
    const step = (maxVal - minVal) / bucketCount || 1;

    let psiSum = 0;
    const bucketDetails = [];

    for (let b = 0; b < bucketCount; b++) {
      const lower = minVal + b * step;
      const upper = b === bucketCount - 1 ? maxVal + 1e-6 : minVal + (b + 1) * step;

      // Count occurrences in bucket
      const baseCount = baseline.filter(v => v >= lower && v < upper).length;
      const liveCount = liveSamples.filter(v => v >= lower && v < upper).length;

      // Percentage proportions with Laplace smoothing
      const baseProp = Math.max(1e-4, baseCount / baseline.length);
      const liveProp = Math.max(1e-4, liveCount / liveSamples.length);

      const bucketPsi = (liveProp - baseProp) * Math.log(liveProp / baseProp);
      psiSum += bucketPsi;

      bucketDetails.push({
        bucket: b + 1,
        range: `[${lower.toFixed(3)}, ${upper.toFixed(3)})`,
        baselineProp: Number(baseProp.toFixed(4)),
        liveProp: Number(liveProp.toFixed(4)),
        bucketPsi: Number(bucketPsi.toFixed(6))
      });
    }

    const psi = Number(Math.max(0, psiSum).toFixed(4));
    let status = "STABLE";
    let dampeningMultiplier = 1.0;

    if (psi >= 0.25) {
      status = "SEVERE_DRIFT";
      dampeningMultiplier = 0.25; // 75% downweighting due to severe distribution breakdown
    } else if (psi >= 0.10) {
      status = "MODERATE_DRIFT";
      dampeningMultiplier = 0.70; // 30% downweighting
    }

    return {
      featureKey,
      psi,
      status,
      dampeningMultiplier,
      baselineSamplesCount: baseline.length,
      liveSamplesCount: liveSamples.length,
      bucketDetails,
      evaluatedAt: Date.now()
    };
  }
}

export const realtimeFeatureStore = new RealtimeFeatureStore();
