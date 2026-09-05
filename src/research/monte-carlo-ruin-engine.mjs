// src/research/monte-carlo-ruin-engine.mjs
// Monte Carlo Ruin Probability & Tail Risk Simulation Engine
// Runs 10,000 bootstrap simulations to compute drawdown distributions,
// ruin probability, VaR/CVaR, and safe leverage boundaries.

/**
 * Monte Carlo Ruin Engine
 */
export class MonteCarloRuinEngine {
  /**
   * Runs bootstrap Monte Carlo simulation across trades.
   * @param {Object} params
   * @param {number[]} params.returns - Historical trade returns (as decimals, e.g. 0.02 for +2%, -0.01 for -1%)
   * @param {number} [params.initialCapital=100000]
   * @param {number} [params.simulations=10000] - Number of paths to simulate
   * @param {number} [params.horizon=250] - Trade horizon per path
   * @param {number} [params.ruinThreshold=0.30] - Drawdown fraction constituting ruin (default 30% DD)
   * @param {number} [params.leverage=1.0] - Applied leverage multiplier
   * @returns {Object} Monte Carlo simulation analysis report
   */
  static simulate({
    returns = [],
    initialCapital = 100000,
    simulations = 10000,
    horizon = 250,
    ruinThreshold = 0.30,
    leverage = 1.0
  } = {}) {
    if (!returns || returns.length === 0) {
      throw new Error("[MONTE-CARLO] Must provide non-empty trade returns array.");
    }

    const nTrades = returns.length;
    let ruinedPaths = 0;
    const maxDrawdowns = new Float64Array(simulations);
    const finalEquities = new Float64Array(simulations);

    // Fast Pseudo-Random Number Generator (PRNG) for high-speed deterministic bootstrap
    // 10,000 paths * 250 trades = 2,500,000 iterations
    for (let sim = 0; sim < simulations; sim++) {
      let equity = initialCapital;
      let peak = initialCapital;
      let maxDd = 0.0;
      let isRuined = false;

      for (let t = 0; t < horizon; t++) {
        // Uniform random sample with replacement
        const rIdx = Math.floor(Math.random() * nTrades);
        const r = returns[rIdx] * leverage;
        
        equity *= (1.0 + r);
        if (equity <= 0) {
          equity = 0;
          maxDd = 1.0;
          isRuined = true;
          break;
        }

        if (equity > peak) {
          peak = equity;
        } else {
          const dd = (peak - equity) / peak;
          if (dd > maxDd) {
            maxDd = dd;
          }
          if (dd >= ruinThreshold) {
            isRuined = true;
          }
        }
      }

      if (isRuined) {
        ruinedPaths++;
      }
      maxDrawdowns[sim] = maxDd;
      finalEquities[sim] = equity;
    }

    // Sort drawdowns ascending
    maxDrawdowns.sort();
    finalEquities.sort();

    const ruinProbability = ruinedPaths / simulations;
    const expectedMaxDrawdown = maxDrawdowns.reduce((acc, v) => acc + v, 0) / simulations;
    const medianFinalEquity = finalEquities[Math.floor(simulations * 0.5)];
    const p50Drawdown = maxDrawdowns[Math.floor(simulations * 0.50)];
    const p95Drawdown = maxDrawdowns[Math.floor(simulations * 0.95)];
    const p99Drawdown = maxDrawdowns[Math.floor(simulations * 0.99)];
    const p999Drawdown = maxDrawdowns[Math.floor(simulations * 0.999)];

    // 99.9% VaR and CVaR on total return
    const terminalReturns = new Float64Array(simulations);
    for (let i = 0; i < simulations; i++) {
      terminalReturns[i] = (finalEquities[i] - initialCapital) / initialCapital;
    }
    terminalReturns.sort();

    const var999Index = Math.floor(simulations * 0.001); // worst 0.1%
    const var999 = Math.max(0, -terminalReturns[var999Index]);

    let tailSum = 0;
    for (let i = 0; i <= var999Index; i++) {
      tailSum += -terminalReturns[i];
    }
    const cvar999 = tailSum / (var999Index + 1);

    // Kelly estimation & Safe Leverage Multiplier
    const wins = returns.filter(r => r > 0);
    const losses = returns.filter(r => r < 0);
    const winRate = wins.length / nTrades;
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0.01;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0.01;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 1.0;
    
    // Half-Kelly formulation
    const fullKelly = avgLoss > 0 ? (winRate * (winLossRatio + 1) - 1) / winLossRatio : 0;
    const safeKelly = Math.max(0, fullKelly * 0.5);

    // Recommended Safe Leverage boundary
    // Penalize heavily if ruin probability > 0.1%
    const ruinPenalty = Math.max(0, 1.0 - (ruinProbability * 20));
    const safeLeverage = Number(Math.max(0.2, Math.min(3.0, (safeKelly > 0 ? safeKelly * 5 : 1.0) * ruinPenalty)).toFixed(2));

    let recommendedAction = "NORMAL_OPERATION";
    if (ruinProbability >= 0.05) {
      recommendedAction = "EMERGENCY_HALT_UNACCEPTABLE_RUIN";
    } else if (ruinProbability >= 0.01) {
      recommendedAction = "THROTTLE_LEVERAGE_HIGH_RISK";
    } else if (ruinProbability > 0.001) {
      recommendedAction = "CAUTION_MONITOR_DRAWDOWN";
    }

    return Object.freeze({
      simulations,
      horizon,
      initialCapital,
      ruinThreshold,
      appliedLeverage: leverage,
      metrics: {
        probabilityOfRuin: Number(ruinProbability.toFixed(5)),
        probabilityOfRuinPercent: Number((ruinProbability * 100).toFixed(3)),
        expectedMaxDrawdown: Number(expectedMaxDrawdown.toFixed(4)),
        medianFinalEquity: Number(medianFinalEquity.toFixed(2)),
        drawdownQuantiles: {
          p50: Number(p50Drawdown.toFixed(4)),
          p95: Number(p95Drawdown.toFixed(4)),
          p99: Number(p99Drawdown.toFixed(4)),
          p999: Number(p999Drawdown.toFixed(4))
        },
        var999: Number(var999.toFixed(4)),
        cvar999: Number(cvar999.toFixed(4)),
        winRate: Number(winRate.toFixed(4)),
        winLossRatio: Number(winLossRatio.toFixed(2)),
        halfKelly: Number(safeKelly.toFixed(3)),
        safeLeverageMultiplier: safeLeverage
      },
      recommendedAction,
      passAudit: ruinProbability < 0.01
    });
  }
}
