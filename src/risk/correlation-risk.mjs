// src/risk/correlation-risk.mjs
// Cross-Asset Correlation Risk & Clustered Concentration Controller.
// Restricts total portfolio allocation to highly correlated assets (rho > threshold).

export class CorrelationRiskManager {
  constructor(config = {}) {
    this.highCorrelationThreshold = config.highCorrelationThreshold || 0.75; // Pearson rho > 0.75 considered clustered
    this.maxCorrelatedClusterExposure = config.maxCorrelatedClusterExposure || 0.30; // Max 30% of NAV in a single correlated cluster
    // Pre-computed default correlation matrix for common test assets (can be updated dynamically)
    this.correlationMatrix = {
      "AAPL:MSFT": 0.82,
      "AAPL:GOOGL": 0.78,
      "MSFT:GOOGL": 0.85,
      "NVDA:AAPL": 0.76,
      "NVDA:MSFT": 0.80,
      "TSLA:NVDA": 0.68,
      "BTC:ETH": 0.88,
      "XOM:CVX": 0.89,
      "JPM:BAC": 0.91
    };
  }

  setCorrelation(symA, symB, rho) {
    const pair = this._pairKey(symA, symB);
    this.correlationMatrix[pair] = rho;
  }

  getCorrelation(symA, symB) {
    if (symA.toUpperCase() === symB.toUpperCase()) return 1.0;
    const pair = this._pairKey(symA, symB);
    return this.correlationMatrix[pair] ?? 0.20; // Default baseline correlation 0.20
  }

  _pairKey(a, b) {
    const sorted = [a.toUpperCase(), b.toUpperCase()].sort();
    return `${sorted[0]}:${sorted[1]}`;
  }

  /**
   * Validate that the new order doesn't cause a cluster of correlated assets to breach the portfolio cap.
   * @param {Object} params
   * @param {string} params.symbol
   * @param {string} params.side
   * @param {number} params.quantity
   * @param {number} params.price
   * @param {Object} params.portfolio
   */
  validateCorrelationRisk({ symbol, side, quantity, price, portfolio }) {
    if (!portfolio || !portfolio.totalNav || portfolio.totalNav <= 0) {
      return { approved: false, reason: "INVALID_PORTFOLIO_NAV: NAV must be positive" };
    }

    const nav = portfolio.totalNav;
    const positions = portfolio.positions || {};
    const symUpper = symbol.toUpperCase();

    // Projected position for current symbol
    const currentQty = (positions[symUpper] && positions[symUpper].quantity) || 0;
    const projectedQty = side === "BUY" ? currentQty + quantity : currentQty - quantity;
    const projectedNotional = Math.abs(projectedQty * price);

    // Find all assets in portfolio with high correlation to candidate symbol
    let clusterNotional = projectedNotional;
    const clusterMembers = [symUpper];

    for (const [existingSym, pos] of Object.entries(positions)) {
      if (existingSym.toUpperCase() === symUpper) continue;
      const rho = this.getCorrelation(symUpper, existingSym);
      if (rho >= this.highCorrelationThreshold) {
        const notional = Math.abs((pos.quantity || 0) * (pos.currentPrice || price));
        clusterNotional += notional;
        clusterMembers.push(`${existingSym.toUpperCase()} (ρ=${rho.toFixed(2)})`);
      }
    }

    const clusterWeight = clusterNotional / nav;

    if (clusterWeight > this.maxCorrelatedClusterExposure) {
      return {
        approved: false,
        reason: `CORRELATED_EXPOSURE_EXCEEDED: Correlated cluster [${clusterMembers.join(", ")}] weight ${(clusterWeight * 100).toFixed(1)}% exceeds cap ${(this.maxCorrelatedClusterExposure * 100).toFixed(1)}%`,
        clusterWeight,
        maxAllowed: this.maxCorrelatedClusterExposure,
        clusterMembers
      };
    }

    return {
      approved: true,
      clusterWeight,
      clusterMembers
    };
  }
}

export const correlationRiskManager = new CorrelationRiskManager();
