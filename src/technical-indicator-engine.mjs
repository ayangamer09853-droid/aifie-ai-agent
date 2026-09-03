/**
 * Technical Indicator Engine v1.0
 *
 * Real calculations for RSI, MACD, ATR, Bollinger Bands, VWAP, ADX
 * Replaces synthetic confidence scores with data-driven indicators
 *
 * These are the actual mathematical formulas - no fake data
 */

// ============================================================================
// [1] RSI (Relative Strength Index)
// ============================================================================

/**
 * Calculate RSI (Relative Strength Index)
 * @param {number[]} prices - Array of closing prices
 * @param {number} period - RSI period (default 14)
 * @returns {number|null} RSI value (0-100)
 */
export function calculateRSI(prices, period = 14) {
  if (!prices || prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // First average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothed averages
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100; // Strong uptrend
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

// RSI Interpretation
export function interpretRSI(rsi) {
  if (rsi === null) return { signal: "NO_DATA", interpretation: "Insufficient data" };
  if (rsi >= 70) return { signal: "OVERBOUGHT", interpretation: "Potential reversal, selling pressure", action: "CAUTION" };
  if (rsi <= 30) return { signal: "OVERSOLD", interpretation: "Potential reversal, buying pressure", action: "OPPORTUNITY" };
  if (rsi >= 60) return { signal: "BULLISH", interpretation: "Strong upward momentum", action: "BUY" };
  if (rsi <= 40) return { signal: "BEARISH", interpretation: "Strong downward momentum", action: "SELL" };
  return { signal: "NEUTRAL", interpretation: "No clear direction", action: "WAIT" };
}

// ============================================================================
// [2] MACD (Moving Average Convergence Divergence)
// ============================================================================

/**
 * Calculate MACD
 * @param {number[]} prices - Array of closing prices
 * @param {number} fastPeriod - Fast EMA period (default 12)
 * @param {number} slowPeriod - Slow EMA period (default 26)
 * @param {number} signalPeriod - Signal line period (default 9)
 * @returns {object} { macd, signal, histogram }
 */
export function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!prices || prices.length < slowPeriod + signalPeriod) return null;

  // Calculate EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  if (!fastEMA || !slowEMA) return null;

  // MACD line = Fast EMA - Slow EMA
  const macdLine = fastEMA - slowEMA;

  // Calculate MACD histogram values for signal line
  const macdValues = [];
  for (let i = slowPeriod; i < prices.length; i++) {
    const f = calculateEMA(prices.slice(0, i + 1), fastPeriod);
    const s = calculateEMA(prices.slice(0, i + 1), slowPeriod);
    if (f && s) macdValues.push(f - s);
  }

  // Signal line = EMA of MACD line
  const signalLine = calculateEMA(macdValues, signalPeriod);
  if (!signalLine) return null;

  // Histogram = MACD - Signal
  const histogram = macdLine - signalLine;

  return {
    macd: Math.round(macdLine * 10000) / 10000,
    signal: Math.round(signalLine * 10000) / 10000,
    histogram: Math.round(histogram * 10000) / 10000,
    interpretation: histogram > 0 ? "BULLISH" : "BEARISH"
  };
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(prices, period) {
  if (!prices || prices.length < period) return null;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// ============================================================================
// [3] ATR (Average True Range) - Volatility Measure
// ============================================================================

/**
 * Calculate ATR (Average True Range)
 * @param {Array} ohlcv - Array of { open, high, low, close }
 * @param {number} period - ATR period (default 14)
 * @returns {number|null} ATR value
 */
export function calculateATR(ohlcv, period = 14) {
  if (!ohlcv || ohlcv.length < period + 1) return null;

  const trueRanges = [];

  for (let i = 1; i < ohlcv.length; i++) {
    const high = ohlcv[i].high;
    const low = ohlcv[i].low;
    const prevClose = ohlcv[i - 1].close;

    // True Range = max of:
    // 1. High - Low
    // 2. |High - Previous Close|
    // 3. |Low - Previous Close|
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // First ATR is simple average
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Subsequent ATRs are smoothed
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
  }

  return Math.round(atr * 100) / 100;
}

/**
 * Calculate ATR-based position sizing
 */
export function calculateATRPositionSize(accountEquity, riskPercent, atr, price) {
  const riskAmount = accountEquity * (riskPercent / 100);
  const shareQuantity = atr > 0 ? Math.floor(riskAmount / atr) : 0;
  return shareQuantity;
}

// ============================================================================
// [4] BOLLINGER BANDS
// ============================================================================

/**
 * Calculate Bollinger Bands
 * @param {number[]} prices - Array of closing prices
 * @param {number} period - MA period (default 20)
 * @param {number} stdDev - Standard deviation multiplier (default 2)
 * @returns {object} { upper, middle, lower, bandwidth, percentB }
 */
export function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  if (!prices || prices.length < period) return null;

  // Middle Band = SMA
  const slice = prices.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;

  // Standard Deviation
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);

  const upper = sma + (standardDeviation * stdDev);
  const lower = sma - (standardDeviation * stdDev);
  const bandwidth = ((upper - lower) / sma) * 100;
  const percentB = (prices[prices.length - 1] - lower) / (upper - lower);

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(sma * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
    percentB: Math.round(percentB * 100) / 100,
    interpretation: percentB > 0.8 ? "OVERBOUGHT" : percentB < 0.2 ? "OVERSOLD" : "NEUTRAL"
  };
}

// ============================================================================
// [5] VWAP (Volume Weighted Average Price)
// ============================================================================

/**
 * Calculate VWAP
 * @param {Array} ohlcv - Array of { high, low, close, volume }
 * @returns {number|null} VWAP value
 */
export function calculateVWAP(ohlcv) {
  if (!ohlcv || ohlcv.length === 0) return null;

  let cumulativeTPV = 0; // Typical Price * Volume
  let cumulativeVolume = 0;

  for (const bar of ohlcv) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativeTPV += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;
  }

  if (cumulativeVolume === 0) return null;
  return Math.round((cumulativeTPV / cumulativeVolume) * 100) / 100;
}

// ============================================================================
// [6] ADX (Average Directional Index) - Trend Strength
// ============================================================================

/**
 * Calculate ADX (Average Directional Index)
 * @param {Array} ohlcv - Array of { high, low, close }
 * @param {number} period - ADX period (default 14)
 * @returns {object} { adx, plusDI, minusDI, trend }
 */
export function calculateADX(ohlcv, period = 14) {
  if (!ohlcv || ohlcv.length < period * 2) return null;

  const plusDM = [];
  const minusDM = [];
  const trueRanges = [];

  for (let i = 1; i < ohlcv.length; i++) {
    const high = ohlcv[i].high;
    const low = ohlcv[i].low;
    const prevHigh = ohlcv[i - 1].high;
    const prevLow = ohlcv[i - 1].low;

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const tr = Math.max(
      high - low,
      Math.abs(high - ohlcv[i - 1].close),
      Math.abs(low - ohlcv[i - 1].close)
    );
    trueRanges.push(tr);
  }

  // Smooth values
  const smoothPlusDM = smoothValues(plusDM, period);
  const smoothMinusDM = smoothValues(minusDM, period);
  const smoothTR = smoothValues(trueRanges, period);

  const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
  const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

  const diDiff = Math.abs(plusDI - minusDI);
  const diSum = plusDI + minusDI;
  const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;

  const adx = dx; // Simplified, ideally smoothed further

  let trend = "NEUTRAL";
  if (adx > 25 && plusDI > minusDI) trend = "STRONG_UPTREND";
  else if (adx > 25 && minusDI > plusDI) trend = "STRONG_DOWNTREND";
  else if (adx > 15) trend = "WEAK_TREND";

  return {
    adx: Math.round(adx * 10) / 10,
    plusDI: Math.round(plusDI * 10) / 10,
    minusDI: Math.round(minusDI * 10) / 10,
    trend,
    interpretation: adx > 25 ? "TREND_FOLLOWING" : "RANGE_BOUND"
  };
}

function smoothValues(values, period) {
  if (values.length < period) return 0;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i];
  }
  return sum / period;
}

// ============================================================================
// [7] VOLUME PROFILE / OBV (On Balance Volume)
// ============================================================================

/**
 * Calculate OBV (On Balance Volume)
 * @param {number[]} prices - Array of closing prices
 * @param {number[]} volumes - Array of volumes
 * @returns {number} OBV value
 */
export function calculateOBV(prices, volumes) {
  if (!prices || !volumes || prices.length !== volumes.length) return 0;

  let obv = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) obv += volumes[i];
    else if (prices[i] < prices[i - 1]) obv -= volumes[i];
    // No change = no addition
  }
  return obv;
}

/**
 * Calculate Volume Surge
 * @param {number[]} volumes - Array of volumes
 * @param {number} period - Lookback period (default 20)
 * @returns {number} Volume surge multiplier
 */
export function calculateVolumeSurge(volumes, period = 20) {
  if (!volumes || volumes.length < period) return 1;

  const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avgVolume = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;

  return Math.round((recentVolume / avgVolume) * 100) / 100;
}

// ============================================================================
// [8] COMPREHENSIVE SIGNAL SCORER
// ============================================================================

/**
 * Generate comprehensive technical analysis for a symbol
 * @param {string} symbol - Trading symbol
 * @param {string} source - 'binance' or 'alpaca'
 * @returns {object} Complete technical analysis
 */
export async function analyzeSymbolTechnical(symbol, source = "binance") {
  const result = {
    symbol,
    source,
    timestamp: new Date().toISOString(),
    indicators: {},
    signals: {},
    confidenceScore: 50,
    recommendation: "WAIT"
  };

  try {
    // Get historical data
    let priceData;
    if (source === "binance") {
      priceData = await fetchSymbolDataBinance(symbol);
    } else {
      priceData = await fetchSymbolDataAlpaca(symbol);
    }

    if (!priceData || priceData.close.length < 50) {
      result.error = "Insufficient data";
      return result;
    }

    const closes = priceData.close;
    const ohlcv = priceData.ohlcv;

    // Calculate all indicators
    result.indicators.rsi = calculateRSI(closes, 14);
    result.indicators.rsiInterpretation = interpretRSI(result.indicators.rsi);

    const macd = calculateMACD(closes);
    if (macd) {
      result.indicators.macd = macd;
      result.indicators.macdInterpretation = macd.histogram > 0 ? "BULLISH" : "BEARISH";
    }

    result.indicators.atr = calculateATR(ohlcv, 14);

    const bb = calculateBollingerBands(closes);
    if (bb) {
      result.indicators.bollinger = bb;
    }

    result.indicators.vwap = calculateVWAP(ohlcv);

    const adx = calculateADX(ohlcv);
    if (adx) {
      result.indicators.adx = adx;
    }

    result.indicators.volumeSurge = calculateVolumeSurge(priceData.volume);
    result.indicators.priceChange24h = ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;

    // Calculate confidence score based on indicator confluence
    let score = 50; // Base

    // RSI contribution
    if (result.indicators.rsi) {
      if (result.indicators.rsi < 30) score += 15; // Oversold = buying opportunity
      else if (result.indicators.rsi > 70) score -= 10;
      else if (result.indicators.rsi > 60) score += 5;
      else if (result.indicators.rsi < 40) score += 5;
    }

    // MACD contribution
    if (result.indicators.macd) {
      if (result.indicators.macd.histogram > 0) score += 10;
      else score -= 5;
    }

    // ADX contribution
    if (result.indicators.adx && result.indicators.adx.adx > 25) {
      score += 10; // Strong trend
    }

    // Volume surge contribution
    if (result.indicators.volumeSurge > 1.5) score += 10;
    else if (result.indicators.volumeSurge > 1.2) score += 5;

    // Price momentum
    if (result.indicators.priceChange24h > 2) score += 5;
    else if (result.indicators.priceChange24h < -2) score -= 5;

    result.confidenceScore = Math.min(96, Math.max(10, score));

    // Generate recommendation
    if (result.confidenceScore >= 75 && result.indicators.rsi < 65) {
      result.recommendation = "BUY";
    } else if (result.confidenceScore <= 30 || result.indicators.rsi > 75) {
      result.recommendation = "SELL";
    } else {
      result.recommendation = "WAIT";
    }

  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// Helper functions to fetch data
async function fetchSymbolDataBinance(symbol) {
  // Use existing Binance connector if available
  try {
    const https = await import("node:https");

    return new Promise((resolve, reject) => {
      https.get(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`,
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            try {
              const klines = JSON.parse(data);
              const ohlcv = klines.map(k => ({
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
              }));
              const close = ohlcv.map(k => k.close);
              const volume = ohlcv.map(k => k.volume);
              resolve({ close, ohlcv, volume });
            } catch (e) {
              reject(e);
            }
          });
        }
      ).on("error", reject);
    });
  } catch (e) {
    return null;
  }
}

async function fetchSymbolDataAlpaca(symbol) {
  // Placeholder for Alpaca integration
  // Would use Alpaca REST API for stock data
  return null;
}

// ============================================================================
// [9] EXPORTS
// ============================================================================

export default {
  calculateRSI,
  interpretRSI,
  calculateMACD,
  calculateATR,
  calculateBollingerBands,
  calculateVWAP,
  calculateADX,
  calculateOBV,
  calculateVolumeSurge,
  analyzeSymbolTechnical
};