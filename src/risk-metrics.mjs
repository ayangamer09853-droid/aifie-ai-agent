/**
 * Quantitative Risk Metrics
 * Calculates Value at Risk (VaR), Conditional VaR (Expected Shortfall),
 * Sharpe Ratio, Sortino Ratio, and Peak-to-Trough Maximum Drawdown.
 */

export function calculateValueAtRisk(returns, confidence = 0.95) {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * (1 - confidence))));
  return Number(sorted[index].toFixed(6));
}

export function calculateConditionalValueAtRisk(returns, confidence = 0.95) {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const varCutoff = calculateValueAtRisk(returns, confidence);
  const tail = returns.filter(r => r <= varCutoff);
  if (tail.length === 0) return varCutoff;
  const cvar = tail.reduce((a, b) => a + b, 0) / tail.length;
  return Number(cvar.toFixed(6));
}

export function calculateSharpeRatio(returns, riskFreeRate = 0.02) {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return 0;
  return Number(((mean - riskFreeRate) / stddev).toFixed(4));
}

export function calculateSortinoRatio(returns, riskFreeRate = 0.02) {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downside = returns.filter(r => r < riskFreeRate);
  if (downside.length === 0) return Number(((mean - riskFreeRate) / 0.0001).toFixed(4));
  const downvariance = downside.reduce((sum, r) => sum + Math.pow(r - riskFreeRate, 2), 0) / downside.length;
  const downstddev = Math.sqrt(downvariance);
  if (downstddev === 0) return 0;
  return Number(((mean - riskFreeRate) / downstddev).toFixed(4));
}

export function calculateMaxDrawdown(equity) {
  if (!Array.isArray(equity) || equity.length === 0) return 0;
  let peak = equity[0];
  let maxDD = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    if (peak > 0) {
      maxDD = Math.max(maxDD, (peak - e) / peak);
    }
  }
  return Number(maxDD.toFixed(4));
}
