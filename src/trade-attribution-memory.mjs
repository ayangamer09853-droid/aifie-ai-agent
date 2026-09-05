/**
 * Trade Attribution & Post-Mortem Memory Vault v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Your memory shouldn't just store conversations.
 * Create Aifie Trading Memory:
 * - Market Regimes, Trade Decisions, Failed Trades, Successful Trades, Model Failures, Execution Failures, Crisis Events.
 * Every completed trade generates a post-mortem:
 * { trade, prediction, confidence, expected_return, actual_return, regime, mistake, lesson }
 * Use this information for research and model retraining, not uncontrolled self-modification of production logic."
 */

class TradeAttributionMemory {
  constructor() {
    this.postMortems = [];
    this.categoryVaults = {
      marketRegimes: [],
      tradeDecisions: [],
      failedTrades: [],
      successfulTrades: [],
      modelFailures: [],
      executionFailures: [],
      crisisEvents: []
    };
  }

  /**
   * Records an immutable trade post-mortem
   */
  recordTradePostMortem({
    tradeId = `TR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    symbol = "BTCUSDT",
    prediction = "BUY",
    confidence = 0.85,
    expected_return = 0.030,
    actual_return = 0.025,
    regime = "TRENDING",
    entryPrice = 88000,
    exitPrice = 90200,
    holdingTimeMinutes = 120,
    slippageCostUsd = 4.50,
    feePaidUsd = 3.20,
    mistake = null,
    lesson = null
  } = {}) {
    const isSuccess = actual_return > 0;
    const cleanSymbol = String(symbol).toUpperCase();

    // Auto-diagnose mistake and lesson if not provided
    let diagnosedMistake = mistake;
    let diagnosedLesson = lesson;

    if (!isSuccess && !diagnosedMistake) {
      if (regime === "HIGH_VOLATILITY") {
        diagnosedMistake = "Underestimated volatility expansion on macro announcement";
        diagnosedLesson = "Apply larger volatility discount in multi-factor Kelly sizing";
      } else if (regime === "MEAN_REVERTING" && prediction === "BUY") {
        diagnosedMistake = "Chased breakout at top of consolidation range";
        diagnosedLesson = "Require Hurst exponent verification and wait for range retest";
      } else {
        diagnosedMistake = "Adverse market move breached technical invalidator";
        diagnosedLesson = "Maintain strict invalidation stop and verify order book imbalance";
      }
    } else if (isSuccess && !diagnosedLesson) {
      diagnosedLesson = `Strategy setup confirmed in ${regime} regime with ${(confidence * 100).toFixed(0)}% confidence`;
    }

    const postMortem = {
      tradeId,
      symbol: cleanSymbol,
      prediction,
      confidence: Number(confidence),
      expected_return: Number(expected_return),
      actual_return: Number(actual_return),
      returnDelta: Number((actual_return - expected_return).toFixed(4)),
      isSuccess,
      regime,
      entryPrice,
      exitPrice,
      holdingTimeMinutes,
      executionDrag: {
        slippageCostUsd: Number(slippageCostUsd),
        feePaidUsd: Number(feePaidUsd),
        totalDragUsd: Number((slippageCostUsd + feePaidUsd).toFixed(2))
      },
      mistake: diagnosedMistake,
      lesson: diagnosedLesson,
      immutablePostMortemTimestamp: new Date().toISOString()
    };

    this.postMortems.push(postMortem);
    this.categoryVaults.tradeDecisions.push({ tradeId, symbol: cleanSymbol, prediction, confidence });

    if (isSuccess) {
      this.categoryVaults.successfulTrades.push(postMortem);
    } else {
      this.categoryVaults.failedTrades.push(postMortem);
    }

    // Bound memory size to prevent leaks
    if (this.postMortems.length > 500) this.postMortems.shift();

    return postMortem;
  }

  recordEvent(category, eventData) {
    if (this.categoryVaults[category]) {
      this.categoryVaults[category].push({
        ...eventData,
        timestamp: new Date().toISOString()
      });
      if (this.categoryVaults[category].length > 200) this.categoryVaults[category].shift();
    }
  }

  /**
   * Queries distilled lessons by regime or symbol to inform future strategy research
   */
  queryLessonsLearned({ regime = null, symbol = null, limit = 10 } = {}) {
    let list = this.postMortems;
    if (regime) list = list.filter(p => p.regime === regime);
    if (symbol) list = list.filter(p => p.symbol === String(symbol).toUpperCase());

    return {
      totalFound: list.length,
      lessons: list.slice(-limit).map(p => ({
        tradeId: p.tradeId,
        symbol: p.symbol,
        regime: p.regime,
        isSuccess: p.isSuccess,
        actual_return: p.actual_return,
        mistake: p.mistake,
        lesson: p.lesson
      }))
    };
  }

  getStatus() {
    const total = this.postMortems.length;
    const wins = this.categoryVaults.successfulTrades.length;
    const losses = this.categoryVaults.failedTrades.length;
    const winRatePct = total > 0 ? Number(((wins / total) * 100).toFixed(2)) : 0;

    return {
      vaultStatus: "TRADE_ATTRIBUTION_MEMORY_ONLINE",
      totalPostMortemsStored: total,
      successfulTradesCount: wins,
      failedTradesCount: losses,
      winRatePct,
      categoriesCount: {
        tradeDecisions: this.categoryVaults.tradeDecisions.length,
        successfulTrades: wins,
        failedTrades: losses,
        modelFailures: this.categoryVaults.modelFailures.length,
        executionFailures: this.categoryVaults.executionFailures.length,
        crisisEvents: this.categoryVaults.crisisEvents.length
      },
      recentPostMortem: this.postMortems[this.postMortems.length - 1] || null,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.postMortems = [];
    for (const k of Object.keys(this.categoryVaults)) {
      this.categoryVaults[k] = [];
    }
  }
}

// Global Singleton Instance
export const tradeAttributionMemory = new TradeAttributionMemory();

export function recordTradePostMortem(tradeData) {
  return tradeAttributionMemory.recordTradePostMortem(tradeData);
}

export function queryTradingLessons(query) {
  return tradeAttributionMemory.queryLessonsLearned(query);
}

export function getTradeMemoryStatus() {
  return tradeAttributionMemory.getStatus();
}
