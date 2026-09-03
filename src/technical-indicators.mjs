/**
 * Technical Indicators Engine for Aifie AI Agent
 * Calculates SMA, EMA, RSI, MACD, Momentum, Bollinger Bands, and VWAP
 * and generates strategy-based trading signals.
 */

export function calculateSMA(prices, period) {
  if (!Array.isArray(prices) || prices.length < period || period <= 0) return null;
  const slice = prices.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Number((sum / period).toFixed(4));
}

export function calculateEMA(prices, period) {
  if (!Array.isArray(prices) || prices.length < period || period <= 0) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(4));
}

export function calculateRSI(prices, period = 14) {
  if (!Array.isArray(prices) || prices.length <= period) return null;
  
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgGain === 0 && avgLoss === 0) return 50;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(2));
}

export function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!Array.isArray(prices) || prices.length < slowPeriod + signalPeriod) return null;

  const macdValues = [];
  for (let i = slowPeriod; i <= prices.length; i++) {
    const sub = prices.slice(0, i);
    const fastEma = calculateEMA(sub, fastPeriod);
    const slowEma = calculateEMA(sub, slowPeriod);
    if (fastEma !== null && slowEma !== null) {
      macdValues.push(fastEma - slowEma);
    }
  }

  if (macdValues.length < signalPeriod) return null;

  const macdLine = macdValues[macdValues.length - 1];
  const signalLine = calculateEMA(macdValues, signalPeriod);
  if (signalLine === null) return null;
  const histogram = macdLine - signalLine;

  return {
    macdLine: Number(macdLine.toFixed(4)),
    signalLine: Number(signalLine.toFixed(4)),
    histogram: Number(histogram.toFixed(4))
  };
}

export function calculateMomentum(prices, period = 10) {
  if (!Array.isArray(prices) || prices.length <= period) return null;
  const current = prices[prices.length - 1];
  const prev = prices[prices.length - 1 - period];
  return Number((((current - prev) / prev) * 100).toFixed(2));
}

export function calculateBollingerBands(prices, period = 20, multiplier = 2.0) {
  if (!Array.isArray(prices) || prices.length < period || period <= 0) return null;
  const slice = prices.slice(-period);
  const mean = slice.reduce((acc, val) => acc + val, 0) / period;
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = Number((mean + stdDev * multiplier).toFixed(2));
  const lower = Number((mean - stdDev * multiplier).toFixed(2));
  const middle = Number(mean.toFixed(2));
  const bandwidth = middle > 0 ? Number((((upper - lower) / middle) * 100).toFixed(2)) : 0;

  return { upper, middle, lower, bandwidth };
}

export function calculateVWAP(prices, volumes) {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const volList = Array.isArray(volumes) && volumes.length === prices.length
    ? volumes
    : prices.map(() => 100);

  let cumulativePV = 0;
  let cumulativeV = 0;
  for (let i = 0; i < prices.length; i++) {
    cumulativePV += prices[i] * volList[i];
    cumulativeV += volList[i];
  }
  return cumulativeV > 0 ? Number((cumulativePV / cumulativeV).toFixed(2)) : prices[prices.length - 1];
}

export function generateTradingSignal(prices, strategyName = "sma_crossover") {
  if (!Array.isArray(prices) || prices.length < 5) {
    return {
      signal: "HOLD",
      confidence: 0,
      rationale: "Insufficient price history for technical analysis",
      indicators: {}
    };
  }

  const currentPrice = prices[prices.length - 1];
  const sma9 = calculateSMA(prices, 9) ?? calculateSMA(prices, Math.min(prices.length, 5));
  const sma21 = calculateSMA(prices, 21) ?? calculateSMA(prices, prices.length);
  const rsi = calculateRSI(prices, Math.min(14, prices.length - 1));
  const macd = calculateMACD(prices, 5, 12, 5) || { macdLine: 0, signalLine: 0, histogram: 0 };
  const momentum = calculateMomentum(prices, Math.min(5, prices.length - 1));
  const bollinger = calculateBollingerBands(prices, Math.min(prices.length, 10)) || { upper: currentPrice * 1.05, middle: currentPrice, lower: currentPrice * 0.95, bandwidth: 10 };
  const vwap = calculateVWAP(prices);

  const indicators = { currentPrice, sma9, sma21, rsi, macd, momentum, bollinger, vwap };

  if (strategyName === "bollinger_bands") {
    if (currentPrice <= bollinger.lower) {
      return {
        signal: "BUY",
        confidence: 0.85,
        rationale: `Price (${currentPrice}) touched lower Bollinger Band (${bollinger.lower}). Oversold mean-reversion buy.`,
        indicators
      };
    }
    if (currentPrice >= bollinger.upper) {
      return {
        signal: "SELL",
        confidence: 0.85,
        rationale: `Price (${currentPrice}) touched upper Bollinger Band (${bollinger.upper}). Overbought mean-reversion sell.`,
        indicators
      };
    }
    return {
      signal: "HOLD",
      confidence: 0.5,
      rationale: `Price (${currentPrice}) is within Bollinger Bands range (${bollinger.lower} - ${bollinger.upper}).`,
      indicators
    };
  }

  if (strategyName === "vwap_trend") {
    if (currentPrice > vwap && (momentum ?? 0) > 0) {
      return {
        signal: "BUY",
        confidence: 0.82,
        rationale: `Price (${currentPrice}) is above VWAP (${vwap}) with positive momentum (+${momentum}%).`,
        indicators
      };
    }
    if (currentPrice < vwap && (momentum ?? 0) < 0) {
      return {
        signal: "SELL",
        confidence: 0.82,
        rationale: `Price (${currentPrice}) is below VWAP (${vwap}) with negative momentum (${momentum}%).`,
        indicators
      };
    }
    return {
      signal: "HOLD",
      confidence: 0.5,
      rationale: `Price (${currentPrice}) is consolidating around VWAP (${vwap}).`,
      indicators
    };
  }

  if (strategyName === "ml_ensemble") {
    let buyVotes = 0;
    let sellVotes = 0;

    if (sma9 > sma21) buyVotes++; else if (sma9 < sma21) sellVotes++;
    if (rsi !== null && rsi < 45) buyVotes++; else if (rsi !== null && rsi > 55) sellVotes++;
    if (macd.histogram > 0) buyVotes++; else if (macd.histogram < 0) sellVotes++;
    if (currentPrice <= bollinger.middle) buyVotes++; else sellVotes++;
    if (currentPrice >= vwap) buyVotes++; else sellVotes++;

    if (buyVotes >= 3 && buyVotes > sellVotes) {
      return {
        signal: "BUY",
        confidence: Number((buyVotes / 5).toFixed(2)),
        rationale: `ML Ensemble Consensus: ${buyVotes}/5 indicators voting BUY.`,
        indicators
      };
    }
    if (sellVotes >= 3 && sellVotes > buyVotes) {
      return {
        signal: "SELL",
        confidence: Number((sellVotes / 5).toFixed(2)),
        rationale: `ML Ensemble Consensus: ${sellVotes}/5 indicators voting SELL.`,
        indicators
      };
    }
    return {
      signal: "HOLD",
      confidence: 0.5,
      rationale: `ML Ensemble neutral split (Buy: ${buyVotes}, Sell: ${sellVotes}).`,
      indicators
    };
  }

  if (strategyName === "rsi_mean_reversion") {
    if (rsi !== null && rsi < 30) {
      return {
        signal: "BUY",
        confidence: Math.min(0.9, Number(((30 - rsi) / 30 + 0.5).toFixed(2))),
        rationale: `RSI Oversold (${rsi} < 30). Potential bullish mean-reversion reversal.`,
        indicators
      };
    }
    if (rsi !== null && rsi > 70) {
      return {
        signal: "SELL",
        confidence: Math.min(0.9, Number(((rsi - 70) / 30 + 0.5).toFixed(2))),
        rationale: `RSI Overbought (${rsi} > 70). Potential bearish mean-reversion pull-back.`,
        indicators
      };
    }
    return {
      signal: "HOLD",
      confidence: 0.5,
      rationale: `RSI Neutral (${rsi ?? "N/A"}). No extreme mean-reversion trigger.`,
      indicators
    };
  }

  if (strategyName === "macd_trend") {
    if (macd.histogram > 0 && macd.macdLine > macd.signalLine) {
      return {
        signal: "BUY",
        confidence: 0.8,
        rationale: `MACD bullish crossover (MACD ${macd.macdLine} > Signal ${macd.signalLine}).`,
        indicators
      };
    }
    if (macd.histogram < 0 && macd.macdLine < macd.signalLine) {
      return {
        signal: "SELL",
        confidence: 0.8,
        rationale: `MACD bearish crossover (MACD ${macd.macdLine} < Signal ${macd.signalLine}).`,
        indicators
      };
    }
    return {
      signal: "HOLD",
      confidence: 0.5,
      rationale: "MACD momentum is flat or converging.",
      indicators
    };
  }

  // Default / SMA Crossover strategy
  if (sma9 !== null && sma21 !== null) {
    if (sma9 > sma21) {
      const diff = Number((((sma9 - sma21) / sma21) * 100).toFixed(2));
      return {
        signal: "BUY",
        confidence: Math.min(0.95, 0.6 + diff * 0.1),
        rationale: `Golden Cross signal: Fast SMA-9 (${sma9}) is above Slow SMA-21 (${sma21}) by ${diff}%.`,
        indicators
      };
    }
    if (sma9 < sma21) {
      const diff = Number((((sma21 - sma9) / sma21) * 100).toFixed(2));
      return {
        signal: "SELL",
        confidence: Math.min(0.95, 0.6 + diff * 0.1),
        rationale: `Death Cross signal: Fast SMA-9 (${sma9}) is below Slow SMA-21 (${sma21}) by ${diff}%.`,
        indicators
      };
    }
  }

  return {
    signal: "HOLD",
    confidence: 0.5,
    rationale: "SMA values are equal or converging. Market is consolidating.",
    indicators
  };
}
