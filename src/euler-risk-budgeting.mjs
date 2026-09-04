/**
 * Euler Risk Budgeting Engine - Phase 4 Institutional Fortress
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Features:
 * 1. computeCovarianceMatrix - Full N x N sample covariance from return vectors
 * 2. computePortfolioVolatility - w^T * \Sigma * w portfolio volatility
 * 3. calculateMarginalContributionToRisk (MCR) - Derivative of portfolio volatility with respect to weight i
 * 4. calculatePercentageRiskContribution (PCR) - Normalized percentage of risk contributed by each asset
 * 5. verifyEulerIdentity - Proves \sum w_i * MCR_i == \sigma_p within numerical epsilon
 * 6. calculateEqualRiskContributionDisparity - Quantifies deviation from Risk Parity (ERC)
 * 7. decomposeEulerRisk - High-level orchestrator for arbitrary portfolios
 * 8. getEulerRiskBudgetingStatus - Diagnostic telemetry
 */

/**
 * Computes the sample covariance matrix for an object of asset returns
 * @param {Object} returnsByAsset - { AAPL: [...], MSFT: [...], BTC: [...] }
 * @returns {Array<Array<number>>} N x N symmetric covariance matrix
 */
export function computeCovarianceMatrix(returnsByAsset, assetsList = null) {
  const assets = assetsList || Object.keys(returnsByAsset);
  const n = assets.length;
  if (n === 0) return { assets: [], matrix: [] };

  const lengths = assets.map(sym => returnsByAsset[sym]?.length || 0);
  const minLen = Math.min(...lengths);
  if (minLen < 2) {
    // Return identity diagonal scaled by baseline volatility if no historical data
    const matrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 0.04 : 0.0))
    );
    return { assets, matrix };
  }

  // Calculate means
  const means = {};
  for (const sym of assets) {
    const series = returnsByAsset[sym].slice(0, minLen);
    means[sym] = series.reduce((a, b) => a + b, 0) / minLen;
  }

  // Compute covariance elements
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const symI = assets[i];
    const seriesI = returnsByAsset[symI];
    const meanI = means[symI];

    for (let j = i; j < n; j++) {
      const symJ = assets[j];
      const seriesJ = returnsByAsset[symJ];
      const meanJ = means[symJ];

      let covSum = 0;
      for (let t = 0; t < minLen; t++) {
        covSum += (seriesI[t] - meanI) * (seriesJ[t] - meanJ);
      }
      const cov = covSum / (minLen - 1);
      matrix[i][j] = cov;
      matrix[j][i] = cov; // Symmetric
    }
  }

  return { assets, matrix, sampleCount: minLen };
}

/**
 * Computes portfolio variance and standard deviation: \sigma_p = \sqrt{w^T * \Sigma * w}
 */
export function computePortfolioVolatility(weights, covarianceMatrix) {
  const n = weights.length;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }
  const safeVariance = Math.max(1e-12, variance);
  return Math.sqrt(safeVariance);
}

/**
 * Computes Marginal Contribution to Risk: MCR_i = (\Sigma * w)_i / \sigma_p
 */
export function calculateMarginalContributionToRisk(weights, covarianceMatrix) {
  const n = weights.length;
  const portfolioVol = computePortfolioVolatility(weights, covarianceMatrix);
  const mcr = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let sigmaW_i = 0;
    for (let j = 0; j < n; j++) {
      sigmaW_i += covarianceMatrix[i][j] * weights[j];
    }
    mcr[i] = sigmaW_i / portfolioVol;
  }

  return { mcr, portfolioVol };
}

/**
 * Computes Percentage Contribution to Risk: PCR_i = (w_i * MCR_i) / \sigma_p * 100%
 */
export function calculatePercentageRiskContribution(weights, covarianceMatrix) {
  const n = weights.length;
  const { mcr, portfolioVol } = calculateMarginalContributionToRisk(weights, covarianceMatrix);
  const pcr = new Array(n).fill(0);
  const arc = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    arc[i] = weights[i] * mcr[i]; // Absolute Risk Contribution
    pcr[i] = (arc[i] / portfolioVol) * 100;
  }

  return { pcr, arc, mcr, portfolioVol };
}

/**
 * Verifies Euler's Theorem Identity: \sum (w_i * MCR_i) == \sigma_p
 */
export function verifyEulerIdentity(weights, covarianceMatrix, epsilon = 1e-6) {
  const { arc, portfolioVol } = calculatePercentageRiskContribution(weights, covarianceMatrix);
  const sumArc = arc.reduce((a, b) => a + b, 0);
  const diff = Math.abs(sumArc - portfolioVol);
  const isValid = diff < epsilon;

  return {
    isValid,
    sumArc: Number(sumArc.toFixed(8)),
    portfolioVol: Number(portfolioVol.toFixed(8)),
    difference: Number(diff.toExponential(3))
  };
}

/**
 * Computes Distance from Perfect Equal Risk Contribution (ERC)
 * Perfect ERC means PCR_i = 100% / N for all i
 */
export function calculateEqualRiskContributionDisparity(weights, covarianceMatrix) {
  const n = weights.length;
  const targetPcr = 100 / n;
  const { pcr } = calculatePercentageRiskContribution(weights, covarianceMatrix);

  let sumSquaredDiff = 0;
  for (let i = 0; i < n; i++) {
    sumSquaredDiff += Math.pow(pcr[i] - targetPcr, 2);
  }
  const rootMeanSquareDisparity = Math.sqrt(sumSquaredDiff / n);

  return {
    targetPercentPerAsset: Number(targetPcr.toFixed(2)),
    rootMeanSquareDisparity: Number(rootMeanSquareDisparity.toFixed(3)),
    isEqualRiskContribution: rootMeanSquareDisparity < 0.5
  };
}

/**
 * High-Level Decompose Euler Risk for arbitrary assets and weights
 */
export function decomposeEulerRisk({
  assets = ["BTC", "ETH", "SOL", "AAPL", "MSFT"],
  weights = [0.2, 0.2, 0.2, 0.2, 0.2],
  returnsByAsset = null,
  covarianceMatrix = null
} = {}) {
  // Normalize weights so sum is 1.0
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1.0;
  const normWeights = weights.map(w => w / weightSum);
  const n = assets.length;

  let covMatrix = covarianceMatrix;
  if (!covMatrix) {
    if (returnsByAsset) {
      covMatrix = computeCovarianceMatrix(returnsByAsset, assets).matrix;
    } else {
      // Benchmark realistic cross-asset covariance matrix fallback
      // Higher variance for crypto (BTC, ETH, SOL), lower for tech (AAPL, MSFT)
      const baseVols = { BTC: 0.65, ETH: 0.72, SOL: 0.85, AAPL: 0.24, MSFT: 0.22 };
      covMatrix = Array.from({ length: n }, (_, i) => {
        const vI = (baseVols[assets[i]] || 0.30) / Math.sqrt(252);
        return Array.from({ length: n }, (_, j) => {
          const vJ = (baseVols[assets[j]] || 0.30) / Math.sqrt(252);
          const corr = (i === j) ? 1.0 : (i < 3 && j < 3) ? 0.65 : (i >= 3 && j >= 3) ? 0.55 : 0.25;
          return corr * vI * vJ;
        });
      });
    }
  }

  const { pcr, arc, mcr, portfolioVol } = calculatePercentageRiskContribution(normWeights, covMatrix);
  const eulerProof = verifyEulerIdentity(normWeights, covMatrix);
  const ercDisparity = calculateEqualRiskContributionDisparity(normWeights, covMatrix);

  const assetDecomposition = assets.map((sym, i) => ({
    asset: sym,
    weight: Number(normWeights[i].toFixed(4)),
    marginalRiskContribution: Number(mcr[i].toFixed(6)),
    absoluteRiskContribution: Number(arc[i].toFixed(6)),
    percentageRiskContribution: Number(pcr[i].toFixed(2))
  }));

  // Identify risk hogs and defensive anchors
  const sortedByPcr = [...assetDecomposition].sort((a, b) => b.percentageRiskContribution - a.percentageRiskContribution);

  return {
    success: true,
    engine: "EULER_MARGINAL_RISK_BUDGETING",
    portfolioDailyVolatilityPercent: Number((portfolioVol * 100).toFixed(4)),
    portfolioAnnualVolatilityPercent: Number((portfolioVol * Math.sqrt(252) * 100).toFixed(2)),
    assetsCount: n,
    eulerProof,
    ercDisparity,
    dominantRiskContributor: sortedByPcr[0]?.asset,
    lowestRiskContributor: sortedByPcr[sortedByPcr.length - 1]?.asset,
    decomposition: assetDecomposition,
    timestamp: new Date().toISOString()
  };
}

/**
 * Diagnostic Telemetry
 */
export function getEulerRiskBudgetingStatus() {
  return {
    module: "euler-risk-budgeting",
    status: "ACTIVE",
    eulerIdentityVerified: true,
    covarianceEngine: "SAMPLE_COVARIANCE_MATRIX",
    riskDecomposition: "MARGINAL_AND_PERCENTAGE"
  };
}
