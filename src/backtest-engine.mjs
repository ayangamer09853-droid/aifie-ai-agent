/**
 * Backtest Engine v1.0
 *
 * Validates the 5-stage pipeline on historical data
 * Measures win rate, Sharpe ratio, max drawdown, R:R accuracy
 *
 * This proves or disproves if the signals are actually profitable
 */

import https from "node:https";
import { calculateRSI, calculateMACD, calculateATR, calculateADX, calculateVolumeSurge } from "./technical-indicator-engine.mjs";

// ============================================================================
// [1] HISTORICAL DATA FETCHER
// ============================================================================

/**
 * Fetch historical klines from Binance
 * @param {string} symbol - Trading pair (e.g., "BTCUSDT")
 * @param {string} interval - Timeframe (1m, 5m, 15m, 1h, 4h, 1d)
 * @param {number} limit - Number of candles (max 1000)
 */
export async function fetchHistoricalKlines(symbol, interval = "1h", limit = 500) {
  return new Promise((resolve, reject) => {
    https
      .get(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const klines = JSON.parse(data);
              const ohlcv = klines.map((k) => ({
                timestamp: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
              }));
              resolve(ohlcv);
            } catch (e) {
              reject(e);
            }
          });
        }
      )
      .on("error", reject);
  });
}

// ============================================================================
// [2] SIGNAL BACKTESTER
// ============================================================================

/**
 * Backtest a single signal on historical data
 * @param {Array} ohlcv - Historical OHLCV data
 * @param {number} entryIndex - Index where signal occurred
 * @param {object} signal - Signal details { direction, confidence, archetype }
 * @param {object} params - Backtest parameters
 */
function backtestSignal(ohlcv, entryIndex, signal, params = {}) {
  const {
    stopLossPercent = 2,
    takeProfitMultiplier = 2.4,
    maxBarsHeld = 48, // 48 hours for 1h timeframe
    atrMultiplier = 1.5
  } = params;

  const entryBar = ohlcv[entryIndex];
  const entryPrice = entryBar.close;
  const direction = signal.direction.includes("BUY") ? "LONG" : "SHORT";

  // Calculate ATR for dynamic stop-loss
  const atrPeriod = ohlcv.slice(Math.max(0, entryIndex - 14), entryIndex);
  const atr = calculateATR(atrPeriod, 14) || (entryPrice * 0.02);

  // Set stop-loss and take-profit
  let stopLoss, takeProfit;
  if (direction === "LONG") {
    stopLoss = entryPrice - (atr * atrMultiplier);
    takeProfit = entryPrice + (atr * atrMultiplier * takeProfitMultiplier);
  } else {
    stopLoss = entryPrice + (atr * atrMultiplier);
    takeProfit = entryPrice - (atr * atrMultiplier * takeProfitMultiplier);
  }

  // Simulate trade
  let result = {
    entryIndex,
    entryTimestamp: entryBar.timestamp,
    entryPrice,
    direction,
    confidence: signal.confidence,
    archetype: signal.archetype,
    stopLoss,
    takeProfit,
    outcome: "PENDING",
    exitPrice: null,
    exitIndex: null,
    barsHeld: 0,
    pnl: 0,
    pnlPercent: 0,
    rMultiple: 0
  };

  const riskAmount = Math.abs(entryPrice - stopLoss);

  // Walk forward through bars
  for (let i = entryIndex + 1; i < Math.min(entryIndex + maxBarsHeld + 1, ohlcv.length); i++) {
    const bar = ohlcv[i];
    result.barsHeld++;

    if (direction === "LONG") {
      // Check stop-loss
      if (bar.low <= stopLoss) {
        result.outcome = "LOSS";
        result.exitPrice = stopLoss;
        result.exitIndex = i;
        result.pnl = stopLoss - entryPrice;
        result.pnlPercent = ((stopLoss - entryPrice) / entryPrice) * 100;
        result.rMultiple = -1;
        break;
      }
      // Check take-profit
      if (bar.high >= takeProfit) {
        result.outcome = "WIN";
        result.exitPrice = takeProfit;
        result.exitIndex = i;
        result.pnl = takeProfit - entryPrice;
        result.pnlPercent = ((takeProfit - entryPrice) / entryPrice) * 100;
        result.rMultiple = takeProfitMultiplier;
        break;
      }
    } else {
      // SHORT
      if (bar.high >= stopLoss) {
        result.outcome = "LOSS";
        result.exitPrice = stopLoss;
        result.exitIndex = i;
        result.pnl = entryPrice - stopLoss;
        result.pnlPercent = ((entryPrice - stopLoss) / entryPrice) * 100;
        result.rMultiple = -1;
        break;
      }
      if (bar.low <= takeProfit) {
        result.outcome = "WIN";
        result.exitPrice = takeProfit;
        result.exitIndex = i;
        result.pnl = entryPrice - takeProfit;
        result.pnlPercent = ((entryPrice - takeProfit) / entryPrice) * 100;
        result.rMultiple = takeProfitMultiplier;
        break;
      }
    }
  }

  // If max bars reached without exit, close at current price
  if (result.outcome === "PENDING") {
    const lastBar = ohlcv[Math.min(entryIndex + maxBarsHeld, ohlcv.length - 1)];
    result.outcome = lastBar.close > entryPrice ? "WIN" : "LOSS";
    result.exitPrice = lastBar.close;
    result.exitIndex = ohlcv.indexOf(lastBar);
    result.pnl = direction === "LONG" ? lastBar.close - entryPrice : entryPrice - lastBar.close;
    result.pnlPercent = Math.abs((result.pnl / entryPrice) * 100);
    result.rMultiple = result.pnl / riskAmount;
  }

  return result;
}

// ============================================================================
// [3] FULL BACKTEST RUNNER
// ============================================================================

/**
 * Run full backtest on historical data
 * @param {string} symbol - Trading pair
 * @param {string} interval - Timeframe
 * @param {number} lookbackBars - Number of candles to test
 */
export async function runBacktest(symbol, interval = "1h", lookbackBars = 500) {
  console.log(`\n[BACKTEST] Starting backtest for ${symbol}...`);

  const ohlcv = await fetchHistoricalKlines(symbol, interval, lookbackBars);
  console.log(`[BACKTEST] Fetched ${ohlcv.length} candles`);

  const signals = [];
  const trades = [];

  // Scan for signals across historical data
  for (let i = 50; i < ohlcv.length - 48; i++) {
    const closes = ohlcv.slice(0, i + 1).map((b) => b.close);
    const volumes = ohlcv.slice(0, i + 1).map((b) => b.volume);

    // Calculate indicators
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const adx = calculateADX(ohlcv.slice(0, i + 1));
    const volumeSurge = calculateVolumeSurge(volumes);

    // Generate signal (simplified logic)
    let signal = null;

    // BREAKOUT signal
    if (rsi > 60 && rsi < 75 && macd && macd.histogram > 0 && volumeSurge > 1.3) {
      signal = {
        direction: "BUY_MOMENTUM",
        archetype: "BREAKOUT",
        confidence: 70 + Math.min(20, volumeSurge * 5)
      };
    }
    // PULLBACK signal
    else if (rsi < 40 && rsi > 25 && adx && adx.adx > 20) {
      signal = {
        direction: "BUY_PULLBACK",
        archetype: "PULLBACK",
        confidence: 65 + Math.min(15, 40 - rsi)
      };
    }
    // MOMENTUM signal
    else if (macd && macd.histogram > 0 && volumeSurge > 1.5 && adx && adx.adx > 25) {
      signal = {
        direction: "BUY_MOMENTUM",
        archetype: "MOMENTUM",
        confidence: 75 + Math.min(15, adx.adx / 5)
      };
    }

    if (signal && signal.confidence >= 70) {
      signals.push({ index: i, signal, bar: ohlcv[i] });

      // Backtest this signal
      const trade = backtestSignal(ohlcv, i, signal, {
        stopLossPercent: 2,
        takeProfitMultiplier: 2.4,
        maxBarsHeld: 48
      });
      trades.push(trade);
    }
  }

  console.log(`[BACKTEST] Found ${signals.length} signals`);

  // Calculate performance metrics
  const metrics = calculateBacktestMetrics(trades);

  return {
    symbol,
    interval,
    totalBars: ohlcv.length,
    signalsFound: signals.length,
    tradesTaken: trades.length,
    metrics,
    trades: trades.slice(0, 20), // Return first 20 trades for inspection
    allTrades: trades
  };
}

// ============================================================================
// [4] PERFORMANCE METRICS CALCULATOR
// ============================================================================

function calculateBacktestMetrics(trades) {
  if (trades.length === 0) {
    return {
      error: "No trades to analyze"
    };
  }

  const wins = trades.filter((t) => t.outcome === "WIN");
  const losses = trades.filter((t) => t.outcome === "LOSS");

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgPnL = totalPnL / trades.length;

  const winRate = (wins.length / trades.length) * 100;

  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0;

  const avgRMultiple = trades.reduce((sum, t) => sum + t.rMultiple, 0) / trades.length;

  // Sharpe Ratio (simplified, assumes risk-free rate = 0)
  const returns = trades.map((t) => t.pnlPercent);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  // Max Drawdown
  let cumulativePnL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equityCurve = [];

  for (const trade of trades) {
    cumulativePnL += trade.pnlPercent;
    equityCurve.push(cumulativePnL);

    if (cumulativePnL > peak) peak = cumulativePnL;

    const drawdown = peak - cumulativePnL;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Profit Factor
  const grossProfit = wins.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
  const grossLoss = losses.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Risk/Reward Actual
  const avgRisk = Math.abs(avgLoss);
  const avgReward = avgWin;
  const actualRR = avgRisk > 0 ? avgReward / avgRisk : 0;

  // Win rate by archetype
  const archetypeStats = {};
  for (const trade of trades) {
    const archetype = trade.archetype;
    if (!archetypeStats[archetype]) {
      archetypeStats[archetype] = { wins: 0, losses: 0, total: 0 };
    }
    archetypeStats[archetype].total++;
    if (trade.outcome === "WIN") archetypeStats[archetype].wins++;
    else archetypeStats[archetype].losses++;
  }

  for (const arch of Object.keys(archetypeStats)) {
    archetypeStats[arch].winRate = (archetypeStats[arch].wins / archetypeStats[arch].total) * 100;
  }

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: Math.round(winRate * 10) / 10,
    totalPnL: Math.round(totalPnL * 100) / 100,
    avgPnL: Math.round(avgPnL * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    avgRMultiple: Math.round(avgRMultiple * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    actualRiskReward: Math.round(actualRR * 100) / 100,
    archetypeStats,
    equityCurve
  };
}

// ============================================================================
// [5] MULTI-SYMBOL BACKTEST
// ============================================================================

export async function runMultiSymbolBacktest(symbols, interval = "1h", lookbackBars = 500) {
  console.log(`\n[BACKTEST] Running multi-symbol backtest on ${symbols.length} symbols...`);

  const results = {};

  for (const symbol of symbols) {
    try {
      const result = await runBacktest(symbol, interval, lookbackBars);
      results[symbol] = result;
      console.log(`[BACKTEST] ${symbol}: ${result.metrics.winRate}% win rate, ${result.metrics.totalPnL} total PnL`);
    } catch (e) {
      console.error(`[BACKTEST] ${symbol} failed: ${e.message}`);
      results[symbol] = { error: e.message };
    }
  }

  // Aggregate metrics
  const allTrades = Object.values(results)
    .filter((r) => r.allTrades)
    .flatMap((r) => r.allTrades);

  const aggregateMetrics = calculateBacktestMetrics(allTrades);

  return {
    symbols: Object.keys(results),
    results,
    aggregateMetrics,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// [6] EXPORTS
// ============================================================================

export default {
  fetchHistoricalKlines,
  runBacktest,
  runMultiSymbolBacktest,
  calculateBacktestMetrics
};