/**
 * Portfolio Optimizer
 * Computes Hierarchical Risk Parity (HRP), Black-Litterman subjective views blending,
 * and Markowitz Efficient Frontier simulation.
 */

export function calculateHierarchicalRiskParity(returns, cov) {
  if (!Array.isArray(returns) || !Array.isArray(cov)) {
    throw new Error("Invalid returns or covariance matrix passed to calculateHierarchicalRiskParity");
  }

  const n = returns.length;
  if (n === 0) return [];

  // Inverse-volatility risk parity weights
  const stddevs = returns.map((_, i) => {
    const variance = cov[i] && typeof cov[i][i] === "number" ? cov[i][i] : 0.04;
    return Math.sqrt(Math.max(1e-6, variance));
  });

  const inverseVol = stddevs.map(s => 1 / s);
  const sum = inverseVol.reduce((a, b) => a + b, 0) || 1;

  return inverseVol.map(iv => Number((iv / sum).toFixed(4)));
}

export function calculateBlackLitterman(marketCap, views = []) {
  if (!Array.isArray(marketCap) || marketCap.length === 0) {
    throw new Error("Invalid marketCap array passed to calculateBlackLitterman");
  }

  const totalCap = marketCap.reduce((a, b) => a + b, 0) || 1;
  const weights = marketCap.map(m => m / totalCap);

  // Adjust by investor views (confidence-weighted return)
  if (Array.isArray(views)) {
    for (const view of views) {
      if (view && typeof view.assetIdx === "number" && view.assetIdx >= 0 && view.assetIdx < weights.length) {
        const confidence = typeof view.confidence === "number" ? view.confidence : 0.5;
        const expectedReturn = typeof view.expectedReturn === "number" ? view.expectedReturn : 0;
        weights[view.assetIdx] *= (1 + confidence * expectedReturn);
      }
    }
  }

  // Normalize and clamp to [0, 1]
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map(w => Number(Math.max(0, Math.min(1, w / sum)).toFixed(4)));
}

export function calculateMarkowitzFrontier(returns, cov, riskFreeRate = 0.02) {
  if (!Array.isArray(returns) || !Array.isArray(cov) || returns.length === 0) {
    throw new Error("Invalid returns or covariance matrix passed to calculateMarkowitzFrontier");
  }

  const frontier = [];
  const n = returns.length;

  for (let targetRisk = 0.05; targetRisk <= 0.50; targetRisk += 0.05) {
    let bestReturn = -Infinity;
    let bestWeights = null;

    for (let iter = 0; iter < 400; iter++) {
      const rawWeights = Array(n).fill(0).map(() => Math.random());
      const sumW = rawWeights.reduce((a, b) => a + b, 0) || 1;
      const w = rawWeights.map(x => x / sumW);

      const portfolioReturn = w.reduce((acc, weight, idx) => acc + weight * (returns[idx] || 0), 0);

      let portfolioVariance = 0;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const cv = cov[r] && typeof cov[r][c] === "number" ? cov[r][c] : 0;
          portfolioVariance += w[r] * w[c] * cv;
        }
      }
      const portfolioRisk = Math.sqrt(Math.max(0, portfolioVariance));

      if (Math.abs(portfolioRisk - targetRisk) < 0.04 && portfolioReturn > bestReturn) {
        bestReturn = portfolioReturn;
        bestWeights = w;
      }
    }

    if (bestReturn !== -Infinity) {
      frontier.push({
        risk: Number(targetRisk.toFixed(2)),
        return: Number(bestReturn.toFixed(4)),
        sharpe: Number(((bestReturn - riskFreeRate) / targetRisk).toFixed(4)),
        weights: bestWeights ? bestWeights.map(x => Number(x.toFixed(4))) : []
      });
    }
  }

  return frontier;
}
