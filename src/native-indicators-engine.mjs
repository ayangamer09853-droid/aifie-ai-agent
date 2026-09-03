/**
 * Native Quantitative Technical Indicators Engine v87.0
 * Pure Zero-Dependency JavaScript Financial Mathematics
 * High-performance, deterministic implementations of SMA, EMA, RSI, MACD, and Bollinger Bands.
 */

export function calculateSMA(values = [], period = 5) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  const results = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }
    if (i >= period - 1) {
      results.push(parseFloat((sum / period).toFixed(4)));
    }
  }
  return results;
}

export function calculateEMA(values = [], period = 5) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  const results = [];
  const k = 2 / (period + 1);

  // Initial SMA
  let initialSum = 0;
  for (let i = 0; i < period; i++) initialSum += values[i];
  let ema = initialSum / period;
  results.push(parseFloat(ema.toFixed(4)));

  for (let i = period; i < values.length; i++) {
    ema = (values[i] * k) + (ema * (1 - k));
    results.push(parseFloat(ema.toFixed(4)));
  }
  return results;
}

export function calculateRSI(values = [], period = 5) {
  if (!Array.isArray(values) || values.length <= period || period <= 0) return [];
  const results = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  results.push(parseFloat((100 - (100 / (1 + rs))).toFixed(2)));

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    results.push(parseFloat(rsi.toFixed(2)));
  }
  return results;
}

export function calculateMACD(values = [], { fastPeriod = 3, slowPeriod = 6, signalPeriod = 3 } = {}) {
  const fastEMA = calculateEMA(values, fastPeriod);
  const slowEMA = calculateEMA(values, slowPeriod);

  if (slowEMA.length === 0) return [];

  // Align fastEMA with slowEMA
  const offset = fastEMA.length - slowEMA.length;
  const macdLine = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(parseFloat((fastEMA[i + offset] - slowEMA[i]).toFixed(4)));
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const results = [];
  const sigOffset = macdLine.length - signalLine.length;

  for (let i = 0; i < signalLine.length; i++) {
    const macdVal = macdLine[i + sigOffset];
    const sigVal = signalLine[i];
    results.push({
      MACD: macdVal,
      signal: sigVal,
      histogram: parseFloat((macdVal - sigVal).toFixed(4))
    });
  }
  return results;
}

export function calculateBollingerBands(values = [], { period = 5, stdDev = 2 } = {}) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  const results = [];

  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);

    results.push({
      middle: parseFloat(mean.toFixed(2)),
      upper: parseFloat((mean + (sd * stdDev)).toFixed(2)),
      lower: parseFloat((mean - (sd * stdDev)).toFixed(2))
    });
  }
  return results;
}
