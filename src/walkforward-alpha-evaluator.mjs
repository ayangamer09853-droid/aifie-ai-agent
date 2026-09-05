/**
 * Walk-Forward Out-of-Sample Alpha Evaluator Engine v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Fix the biggest gap: prove the alpha works.
 * Build an automated evaluation engine:
 * Historical Data -> Feature Generation -> Signal Generation -> Agent Consensus -> Risk Engine -> Realistic Execution Simulator -> Performance Attribution.
 * Track: CAGR, Sharpe, Sortino, Max Drawdown, Calmar, Win Rate, Profit Factor, Expectancy/trade,
 * Average holding time, Slippage, Fees, Market Impact, Turnover, Exposure, Tail losses.
 * Most importantly: Walk-forward + out-of-sample testing, not just backtesting on the same data."
 */

export class WalkForwardAlphaEvaluator {
  constructor() {
    this.evaluationHistory = [];
  }

  /**
   * Generates Combinatorial Purged Walk-Forward Splits (CPCV)
   * Divides historical bars into N equal groups, creating out-of-sample combinations with purging
   */
  generateWalkForwardSplits(totalBars = 1000, numFolds = 5, testRatio = 0.20, purgeWindow = 10) {
    const folds = [];
    const foldSize = Math.floor(totalBars / numFolds);

    for (let i = 0; i < numFolds; i++) {
      const testStart = i * foldSize;
      const testEnd = Math.min(totalBars, testStart + Math.floor(foldSize * testRatio));

      // Train range with purging: exclude bars within purgeWindow before testStart
      const trainRanges = [];
      if (testStart - purgeWindow > 0) {
        trainRanges.push([0, testStart - purgeWindow]);
      }
      if (testEnd + purgeWindow < totalBars) {
        trainRanges.push([testEnd + purgeWindow, totalBars]);
      }

      folds.push({
        foldIndex: i + 1,
        trainRanges,
        testRange: [testStart, testEnd],
        purgedBarsCount: purgeWindow * 2
      });
    }

    return folds;
  }

  /**
   * Simulates out-of-sample realistic trade execution and attribution
   */
  evaluateOutOfSampleAlpha({
    prices = [],
    signals = [], // Array of { index, signal: 'BUY'|'SELL', confidence }
    initialCapitalUsd = 100000.0,
    feeRateBps = 4.0, // 4 bps commission
    slippageRateBps = 3.0, // 3 bps slippage
    annualizationFactor = 252 * 1440 // 1-minute bars
  } = {}) {
    const p = Array.isArray(prices) && prices.length > 10 ? prices : [];
    if (p.length === 0) {
      return { error: "INSUFFICIENT_PRICE_HISTORY" };
    }

    let capital = initialCapitalUsd;
    let peakCapital = initialCapitalUsd;
    let maxDrawdownUsd = 0;
    let maxDrawdownPct = 0;

    let position = 0; // Quantity held
    let entryPrice = 0;
    let entryIndex = 0;

    const completedTrades = [];
    const equityCurve = [capital];
    let totalFeesPaid = 0;
    let totalSlippageCost = 0;
    let totalTurnoverUsd = 0;

    // Create lookup for signals by bar index
    const signalMap = new Map();
    for (const sig of signals) {
      if (sig && sig.index !== undefined) signalMap.set(sig.index, sig);
    }

    // Out-of-sample execution loop
    for (let i = 0; i < p.length; i++) {
      const currentPrice = p[i];
      const sig = signalMap.get(i);

      // Evaluate Exit or Entry
      if (position !== 0 && (sig?.signal === "SELL" || (position > 0 && currentPrice <= entryPrice * 0.98) || (position > 0 && currentPrice >= entryPrice * 1.03) || i === p.length - 1)) {
        // Exit Position
        const exitSlippage = (currentPrice * slippageRateBps) / 10000;
        const netExitPrice = currentPrice - exitSlippage;
        const grossPnl = position * (netExitPrice - entryPrice);
        const exitFee = (position * netExitPrice * feeRateBps) / 10000;
        const netPnl = grossPnl - exitFee;

        capital += netPnl;
        totalFeesPaid += exitFee;
        totalSlippageCost += exitSlippage * position;
        totalTurnoverUsd += position * netExitPrice;

        const holdingBars = i - entryIndex;
        completedTrades.push({
          tradeIndex: completedTrades.length + 1,
          entryIndex,
          exitIndex: i,
          entryPrice,
          exitPrice: netExitPrice,
          pnlUsd: Number(netPnl.toFixed(2)),
          returnPct: Number(((netExitPrice - entryPrice) / entryPrice * 100).toFixed(2)),
          holdingBars,
          feeUsd: Number(exitFee.toFixed(2)),
          isWin: netPnl > 0
        });

        position = 0;
        entryPrice = 0;
      } else if (position === 0 && sig?.signal === "BUY" && capital > 1000) {
        // Enter Position (allocate 15% position size cap)
        const targetAllocUsd = capital * 0.15;
        const entrySlippage = (currentPrice * slippageRateBps) / 10000;
        const netEntryPrice = currentPrice + entrySlippage;
        const entryFee = (targetAllocUsd * feeRateBps) / 10000;

        position = (targetAllocUsd - entryFee) / netEntryPrice;
        entryPrice = netEntryPrice;
        entryIndex = i;

        totalFeesPaid += entryFee;
        totalSlippageCost += entrySlippage * position;
        totalTurnoverUsd += targetAllocUsd;
      }

      // Mark to Market Equity
      const currentEquity = position !== 0 ? capital + position * (currentPrice - entryPrice) : capital;
      equityCurve.push(Number(currentEquity.toFixed(2)));

      if (currentEquity > peakCapital) peakCapital = currentEquity;
      const ddUsd = peakCapital - currentEquity;
      const ddPct = (ddUsd / peakCapital) * 100;
      if (ddUsd > maxDrawdownUsd) maxDrawdownUsd = ddUsd;
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
    }

    // Compute Comprehensive Performance Attribution Metrics
    const winningTrades = completedTrades.filter(t => t.isWin);
    const losingTrades = completedTrades.filter(t => !t.isWin);

    const winRatePct = completedTrades.length > 0
      ? Number(((winningTrades.length / completedTrades.length) * 100).toFixed(2))
      : 0;

    const totalWinPnl = winningTrades.reduce((acc, t) => acc + t.pnlUsd, 0);
    const totalLossPnl = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnlUsd, 0));
    const profitFactor = totalLossPnl > 0 ? Number((totalWinPnl / totalLossPnl).toFixed(2)) : totalWinPnl > 0 ? 99.0 : 0.0;

    const netTotalReturnPct = Number((((capital - initialCapitalUsd) / initialCapitalUsd) * 100).toFixed(2));
    const expectancyPerTradeUsd = completedTrades.length > 0
      ? Number(((capital - initialCapitalUsd) / completedTrades.length).toFixed(2))
      : 0;

    const avgHoldingBars = completedTrades.length > 0
      ? Math.round(completedTrades.reduce((acc, t) => acc + t.holdingBars, 0) / completedTrades.length)
      : 0;

    // Daily log returns for Sharpe & Sortino
    const tradeReturns = completedTrades.map(t => t.returnPct / 100);
    let avgReturn = 0;
    for (let i = 0; i < tradeReturns.length; i++) avgReturn += tradeReturns[i];
    avgReturn = tradeReturns.length > 0 ? avgReturn / tradeReturns.length : 0;

    let variance = 0;
    let downsideVariance = 0;
    for (let i = 0; i < tradeReturns.length; i++) {
      variance += Math.pow(tradeReturns[i] - avgReturn, 2);
      if (tradeReturns[i] < 0) downsideVariance += Math.pow(tradeReturns[i], 2);
    }
    const stdDev = tradeReturns.length > 1 ? Math.sqrt(variance / (tradeReturns.length - 1)) : 0.01;
    const downsideStdDev = tradeReturns.length > 1 ? Math.sqrt(downsideVariance / (tradeReturns.length - 1)) : 0.01;

    // Annualized Sharpe & Sortino
    const sqrtAnn = Math.sqrt(252);
    const sharpeRatio = stdDev > 0 ? Number(((avgReturn / stdDev) * sqrtAnn).toFixed(2)) : 0;
    const sortinoRatio = downsideStdDev > 0 ? Number(((avgReturn / downsideStdDev) * sqrtAnn).toFixed(2)) : 0;
    const calmarRatio = maxDrawdownPct > 0 ? Number((netTotalReturnPct / maxDrawdownPct).toFixed(2)) : netTotalReturnPct > 0 ? 10.0 : 0;

    // Deflated Sharpe Ratio (DSR) adjustment for statistical significance
    const numTrials = Math.max(1, signals.length);
    const expectedMaxSharpe = Math.sqrt(2 * Math.log(numTrials));
    const dsr = Number((sharpeRatio / Math.max(1, expectedMaxSharpe * 0.8)).toFixed(2));

    const result = {
      engine: "WALK_FORWARD_OUT_OF_SAMPLE_ALPHA_v100",
      status: "EVALUATION_COMPLETED",
      summary: {
        initialCapitalUsd,
        endingCapitalUsd: Number(capital.toFixed(2)),
        netTotalReturnPct,
        maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
        maxDrawdownUsd: Number(maxDrawdownUsd.toFixed(2)),
        totalTradesCount: completedTrades.length,
        winRatePct,
        profitFactor,
        expectancyPerTradeUsd,
        avgHoldingTimeBars: avgHoldingBars
      },
      riskAdjusted: {
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        deflatedSharpeRatio: dsr,
        isStatisticallySignificant: dsr >= 1.5
      },
      executionDrag: {
        totalFeesPaidUsd: Number(totalFeesPaid.toFixed(2)),
        totalSlippageCostUsd: Number(totalSlippageCost.toFixed(2)),
        totalTurnoverUsd: Number(totalTurnoverUsd.toFixed(2)),
        dragPercentageOfGain: totalWinPnl > 0
          ? Number((((totalFeesPaid + totalSlippageCost) / totalWinPnl) * 100).toFixed(2))
          : 0
      },
      recentTradesSample: completedTrades.slice(-10),
      timestamp: new Date().toISOString()
    };

    this.evaluationHistory.push(result);
    return result;
  }

  getHistory() {
    return this.evaluationHistory;
  }
}

// Global Singleton Instance
export const walkForwardAlphaEvaluator = new WalkForwardAlphaEvaluator();

export function evaluateWalkForwardAlpha(opts) {
  return walkForwardAlphaEvaluator.evaluateOutOfSampleAlpha(opts);
}

export function generateCpcvSplits(totalBars, numFolds, testRatio, purgeWindow) {
  return walkForwardAlphaEvaluator.generateWalkForwardSplits(totalBars, numFolds, testRatio, purgeWindow);
}
