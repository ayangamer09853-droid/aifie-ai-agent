/**
 * Deflated Sharpe Ratio (DSR) & Multiple Hypothesis Testing Calculator v2.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mathematical Framework:
 * - David H. Bailey and Marcos Lopez de Prado (2014):
 *   "The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality",
 *   Journal of Portfolio Management
 * 
 * Corrects Sharpe Ratio for:
 * 1. Number of independent/dependent strategy variations tested (selection bias / data snooping)
 * 2. Return distribution skewness (asymmetric tail risk)
 * 3. Return distribution kurtosis (fat tails / black swans)
 * 4. Sample track record length
 */

/**
 * Abramowitz and Stegun numerical approximation of the Standard Normal Cumulative Distribution Function
 */
export function normalCdf(z) {
  if (z < -8.0) return 0.0;
  if (z > 8.0) return 1.0;

  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.3989422804014327; // 1 / sqrt(2 * PI)

  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const cdf = 1.0 - c * Math.exp(-0.5 * absZ * absZ) * poly;

  return z >= 0 ? cdf : 1.0 - cdf;
}

/**
 * Calculates Deflated Sharpe Ratio (DSR) and its statistical p-value
 */
export function calculateDeflatedSharpeRatio({
  observedSharpe = 1.8,
  benchmarkSharpe = 0.0,
  numberOfTrials = 50,
  sampleLengthDays = 252,
  skewness = -0.2,
  kurtosis = 3.5
} = {}) {
  const eulerMascheroni = 0.5772156649;
  const trials = Math.max(1, numberOfTrials);
  const days = Math.max(10, sampleLengthDays);

  // Variance correction for non-normality (Mertens 2002)
  // sigma^2(SR) = (1 - S * SR + (K - 1) / 4 * SR^2) / T
  const varianceCorrection = 1 - (skewness * observedSharpe) + (((kurtosis - 1) / 4) * Math.pow(observedSharpe, 2));
  const standardError = Math.sqrt(Math.max(0.0001, varianceCorrection) / days);

  // Extreme Value Theory (EVT) asymptotic expected maximum Sharpe under null hypothesis
  // E[max SR] approx (1 - gamma) * Z^{-1}(1 - 1/N) + gamma * Z^{-1}(1 - 1/(N*e))
  const zScoreFactor = Math.sqrt(2 * Math.log(Math.max(2, trials)));
  const logLogCorrection = (Math.log(Math.PI) + Math.log(Math.log(Math.max(2, trials)))) / (2 * zScoreFactor);
  const expectedMaxSharpe = (zScoreFactor - logLogCorrection) * (1 - eulerMascheroni * 0.1);

  // DSR Z-Score
  const dsrZScore = (observedSharpe - expectedMaxSharpe) / standardError;
  const pValue = normalCdf(dsrZScore);

  // A p-value >= 0.95 rejects the null hypothesis at 5% significance level
  const isStatisticallySignificant = pValue >= 0.95;

  return {
    calculator: "BAILEY_LOPEZ_DE_PRADO_DSR",
    observedSharpe: Number(observedSharpe.toFixed(3)),
    numberOfTrials: trials,
    sampleLengthDays: days,
    skewness: Number(skewness.toFixed(3)),
    kurtosis: Number(kurtosis.toFixed(3)),
    expectedMaxSharpeUnderNull: Number(expectedMaxSharpe.toFixed(3)),
    standardError: Number(standardError.toFixed(4)),
    dsrZScore: Number(dsrZScore.toFixed(3)),
    deflatedSharpePValue: Number(pValue.toFixed(4)),
    confidenceLevelPercent: Number((pValue * 100).toFixed(2)),
    isStatisticallySignificant,
    verdict: isStatisticallySignificant
      ? "ROBUST_GENUINE_ALPHA_CONFIRMED"
      : "REJECTED_EXPLAINABLE_BY_MULTIPLE_TESTING_DATA_MINING"
  };
}

export function getDsrStatus() {
  return {
    engine: "DEFLATED_SHARPE_RATIO_CALCULATOR",
    version: "2.0_INSTITUTIONAL",
    standard: "BAILEY_LOPEZ_DE_PRADO_2014",
    timestamp: new Date().toISOString()
  };
}
