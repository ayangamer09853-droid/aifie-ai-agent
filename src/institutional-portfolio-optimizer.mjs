/**
 * Institutional Portfolio Optimizer & CVaR Risk Engine v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Currently your architecture is heavily trade-centric. Make it portfolio-centric.
 * Instead of asking 'Should I buy BTC?', ask 'Does buying BTC improve the entire portfolio?'
 * Calculate: Expected Return + Marginal Risk + Correlation + Liquidity + Drawdown + Existing Exposure.
 * Add: Covariance matrix, correlation clustering, marginal VaR, CVaR 99% / Expected Shortfall,
 * Euler risk contribution, sector/asset concentration, cash allocation."
 */

export function computeCovarianceMatrix(returnsMap = {}) {
  const assets = Object.keys(returnsMap);
  const n = assets.length;
  if (n === 0) return { assets: [], matrix: [], correlations: [] };

  const seriesLength = returnsMap[assets[0]]?.length || 0;
  if (seriesLength < 2) {
    // Identity fallback
    const eye = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0.04 : 0.0)));
    return { assets, matrix: eye, correlations: eye };
  }

  // Calculate means
  const means = {};
  for (const a of assets) {
    const s = returnsMap[a];
    let sum = 0;
    for (let i = 0; i < s.length; i++) sum += s[i];
    means[a] = sum / s.length;
  }

  // Calculate sample covariance matrix
  const cov = Array.from({ length: n }, () => new Array(n).fill(0));
  const stdDevs = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const a1 = assets[i];
    const s1 = returnsMap[a1];
    const m1 = means[a1];

    for (let j = 0; j < n; j++) {
      const a2 = assets[j];
      const s2 = returnsMap[a2];
      const m2 = means[a2];

      let covSum = 0;
      for (let k = 0; k < seriesLength; k++) {
        covSum += (s1[k] - m1) * (s2[k] - m2);
      }
      cov[i][j] = covSum / (seriesLength - 1);
    }
    stdDevs[i] = Math.sqrt(Math.max(1e-8, cov[i][i]));
  }

  // Shrinkage towards diagonal (Ledoit-Wolf approximation: 10% shrinkage for robustness)
  const shrinkageIntensity = 0.10;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        cov[i][j] = (1 - shrinkageIntensity) * cov[i][j];
      }
    }
  }

  // Calculate correlation matrix
  const correlations = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      const denom = stdDevs[i] * stdDevs[j];
      return denom > 0 ? Number((cov[i][j] / denom).toFixed(4)) : (i === j ? 1 : 0);
    })
  );

  return { assets, matrix: cov, correlations, stdDevs };
}

/**
 * Computes Portfolio Value at Risk (VaR 99%) and Conditional Value at Risk (CVaR 99% / Expected Shortfall)
 * CVaR_alpha = mu + sigma * (phi(Z_alpha) / (1 - alpha))
 */
export function calculatePortfolioVaRAndCVaR(weights = [], covMatrix = [], expectedReturns = [], confidence = 0.99) {
  const n = weights.length;
  if (n === 0 || covMatrix.length !== n) {
    return { portfolioVariance: 0, portfolioVol: 0, var99Pct: 0, cvar99Pct: 0 };
  }

  // Portfolio Variance: w^T * Sigma * w
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * covMatrix[i][j] * weights[j];
    }
  }
  const portfolioVol = Math.sqrt(Math.max(0, variance));

  // Portfolio Expected Return: w^T * mu
  let portfolioReturn = 0;
  for (let i = 0; i < n; i++) {
    portfolioReturn += weights[i] * (expectedReturns[i] || 0.0005);
  }

  // Standard Normal Z-score for alpha (0.99 -> 2.3263)
  const zScore = confidence === 0.99 ? 2.3263 : 1.6449;
  const phiZ = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * zScore * zScore); // Standard normal PDF at Z
  const tailRatio = phiZ / (1 - confidence); // approx 2.665 for 99%

  // Parametric Gaussian VaR and CVaR
  const varPct = Number((zScore * portfolioVol * 100).toFixed(2));
  const cvarPct = Number((tailRatio * portfolioVol * 100).toFixed(2));

  return {
    portfolioReturnPct: Number((portfolioReturn * 100).toFixed(2)),
    portfolioVolPct: Number((portfolioVol * 100).toFixed(2)),
    var99Pct: varPct,
    cvar99Pct: cvarPct, // Average loss in worst 1% tail
    expectedShortfallMultiplier: Number(tailRatio.toFixed(3))
  };
}

/**
 * Computes Euler Marginal Risk Contributions for each asset
 * RC_i = w_i * (Sigma * w)_i / sigma_p
 */
export function calculateEulerRiskContributions(weights = [], covMatrix = []) {
  const n = weights.length;
  if (n === 0) return [];

  let variance = 0;
  const sigmaW = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sigmaW[i] += covMatrix[i][j] * weights[j];
    }
    variance += weights[i] * sigmaW[i];
  }

  const portfolioVol = Math.sqrt(Math.max(1e-8, variance));
  const riskContributions = new Array(n);

  for (let i = 0; i < n; i++) {
    const marginalVol = sigmaW[i] / portfolioVol;
    const absoluteRC = weights[i] * marginalVol;
    const pctContribution = variance > 0 ? (absoluteRC / portfolioVol) * 100 : (100 / n);

    riskContributions[i] = {
      weight: Number((weights[i] * 100).toFixed(2)),
      marginalRisk: Number(marginalVol.toFixed(4)),
      absoluteRiskContribution: Number(absoluteRC.toFixed(4)),
      percentageRiskContribution: Number(pctContribution.toFixed(2))
    };
  }

  return riskContributions;
}

/**
 * Evaluates whether adding an asset setup improves the whole portfolio
 * Compares Portfolio Before vs Portfolio After (Sharpe, Diversification Ratio, CVaR 99%, Concentration)
 */
export function evaluatePortfolioImprovement({
  candidateSymbol = "BTCUSDT",
  candidateWeight = 0.10,
  currentPortfolio = [
    { symbol: "AAPL", weight: 0.35, expectedReturn: 0.08, vol: 0.20 },
    { symbol: "NVDA", weight: 0.25, expectedReturn: 0.15, vol: 0.35 },
    { symbol: "CASH", weight: 0.40, expectedReturn: 0.03, vol: 0.00 }
  ],
  candidateExpectedReturn = 0.12,
  candidateVol = 0.45,
  correlationWithPortfolio = 0.25
} = {}) {
  // Before State
  const activeAssets = currentPortfolio.filter(p => p.symbol !== "CASH");
  const cashWeightBefore = currentPortfolio.find(p => p.symbol === "CASH")?.weight || 0.40;

  // Compute Before Metrics
  let weightedReturnBefore = 0;
  let weightedVolBefore = 0;
  for (const a of currentPortfolio) {
    weightedReturnBefore += a.weight * a.expectedReturn;
    weightedVolBefore += a.weight * a.vol;
  }
  const sharpeBefore = Number(((weightedReturnBefore - 0.03) / Math.max(0.01, weightedVolBefore * 0.85)).toFixed(2));
  const cvarBefore = Number((2.665 * (weightedVolBefore * 0.85) * 100).toFixed(2));

  // After State (Adding candidate by scaling cash down)
  const candidateAlloc = Math.min(candidateWeight, Math.max(0, cashWeightBefore - 0.15)); // Preserve 15% cash minimum
  const cashWeightAfter = Math.max(0.15, cashWeightBefore - candidateAlloc);

  let weightedReturnAfter = 0;
  let weightedVolAfter = 0;
  for (const a of activeAssets) {
    weightedReturnAfter += a.weight * a.expectedReturn;
    weightedVolAfter += a.weight * a.vol;
  }
  weightedReturnAfter += candidateAlloc * candidateExpectedReturn + cashWeightAfter * 0.03;

  // Diversification benefit from low correlation
  const diversificationMultiplier = Math.sqrt(Math.max(0.5, 1.0 - (1.0 - correlationWithPortfolio) * 0.35));
  weightedVolAfter = (weightedVolBefore + candidateAlloc * candidateVol) * diversificationMultiplier;

  const sharpeAfter = Number(((weightedReturnAfter - 0.03) / Math.max(0.01, weightedVolAfter)).toFixed(2));
  const cvarAfter = Number((2.665 * weightedVolAfter * 100).toFixed(2));

  // Herfindahl-Hirschman Concentration Index (HHI): sum of squared weights
  let hhiBefore = 0;
  for (const a of currentPortfolio) hhiBefore += Math.pow(a.weight * 100, 2);
  let hhiAfter = Math.pow(candidateAlloc * 100, 2) + Math.pow(cashWeightAfter * 100, 2);
  for (const a of activeAssets) hhiAfter += Math.pow(a.weight * 100, 2);

  const deltaSharpe = Number((sharpeAfter - sharpeBefore).toFixed(2));
  const deltaCVaR = Number((cvarAfter - cvarBefore).toFixed(2));

  let verdict = "ENHANCES_PORTFOLIO";
  const rationales = [];

  if (deltaSharpe > 0 && correlationWithPortfolio <= 0.50) {
    verdict = "ENHANCES_PORTFOLIO";
    rationales.push(`Sharpe ratio improves by +${deltaSharpe} due to low correlation diversification (${correlationWithPortfolio})`);
  } else if (deltaSharpe < -0.15 || correlationWithPortfolio > 0.85) {
    verdict = "DEGRADES_PORTFOLIO_CONCENTRATION";
    rationales.push(`High correlation (${correlationWithPortfolio}) increases portfolio redundancy without proportional risk-adjusted return`);
  } else {
    verdict = "NEUTRAL_ALLOCATION";
    rationales.push(`Modest marginal impact on portfolio efficiency (Delta Sharpe ${deltaSharpe})`);
  }

  return {
    candidateSymbol,
    allocatedWeightPct: Number((candidateAlloc * 100).toFixed(2)),
    cashReserveWeightPct: Number((cashWeightAfter * 100).toFixed(2)),
    metricsBefore: {
      expectedReturnPct: Number((weightedReturnBefore * 100).toFixed(2)),
      sharpeRatio: sharpeBefore,
      cvar99Pct: cvarBefore,
      hhiConcentration: Math.round(hhiBefore)
    },
    metricsAfter: {
      expectedReturnPct: Number((weightedReturnAfter * 100).toFixed(2)),
      sharpeRatio: sharpeAfter,
      cvar99Pct: cvarAfter,
      hhiConcentration: Math.round(hhiAfter)
    },
    deltaSharpe,
    deltaCVaR,
    correlationUsed: correlationWithPortfolio,
    verdict,
    rationales,
    timestamp: new Date().toISOString()
  };
}
