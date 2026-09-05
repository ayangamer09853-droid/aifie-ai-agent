// src/risk/exposure-manager.mjs
// Portfolio Gross/Net Leverage and Sector Exposure Manager.
// Monitors leverage limits, sector caps, and prevents directional over-exposure.

export class ExposureManager {
  constructor(config = {}) {
    this.maxGrossLeverage = config.maxGrossLeverage || 1.5; // 1.5x max gross leverage
    this.maxNetLeverage = config.maxNetLeverage || 1.0; // 1.0x max net directional
    this.maxSectorExposure = config.maxSectorExposure || 0.35; // 35% max in any single sector
    this.symbolSectorMap = {
      AAPL: "TECHNOLOGY",
      MSFT: "TECHNOLOGY",
      GOOGL: "TECHNOLOGY",
      NVDA: "TECHNOLOGY",
      AMZN: "CONSUMER_DISCRETIONARY",
      TSLA: "CONSUMER_DISCRETIONARY",
      JPM: "FINANCIALS",
      BAC: "FINANCIALS",
      XOM: "ENERGY",
      CVX: "ENERGY",
      BTC: "CRYPTO",
      ETH: "CRYPTO",
      DEFAULT: "DIVERSIFIED"
    };
  }

  registerSymbolSector(symbol, sector) {
    this.symbolSectorMap[symbol.toUpperCase()] = sector.toUpperCase();
  }

  getSector(symbol) {
    return this.symbolSectorMap[symbol.toUpperCase()] || this.symbolSectorMap.DEFAULT;
  }

  /**
   * Validate portfolio-level leverage and sector exposure post-trade.
   * @param {Object} params
   * @param {string} params.symbol
   * @param {string} params.side
   * @param {number} params.quantity
   * @param {number} params.price
   * @param {Object} params.portfolio - { totalNav, cash, positions: { [sym]: { quantity, currentPrice } } }
   * @returns {{ approved: boolean, reason?: string, projectedGrossLeverage?: number, projectedSectorExposure?: number }}
   */
  validateExposure({ symbol, side, quantity, price, portfolio }) {
    if (!portfolio || typeof portfolio.totalNav !== "number" || portfolio.totalNav <= 0) {
      return { approved: false, reason: "INVALID_PORTFOLIO_NAV: NAV must be positive" };
    }

    const nav = portfolio.totalNav;
    const positions = portfolio.positions || {};
    const sector = this.getSector(symbol);

    let currentGrossNotional = 0;
    let currentNetNotional = 0;
    const sectorNotionals = {};

    for (const [sym, pos] of Object.entries(positions)) {
      const posNotional = (pos.quantity || 0) * (pos.currentPrice || price);
      currentGrossNotional += Math.abs(posNotional);
      currentNetNotional += posNotional;

      const posSector = this.getSector(sym);
      sectorNotionals[posSector] = (sectorNotionals[posSector] || 0) + Math.abs(posNotional);
    }

    // Calculate delta for intended order
    const orderNotional = quantity * price;
    const orderDelta = side === "BUY" ? orderNotional : -orderNotional;

    // Projected values
    const currentPosQuantity = (positions[symbol] && positions[symbol].quantity) || 0;
    const projectedPosQuantity = side === "BUY" ? currentPosQuantity + quantity : currentPosQuantity - quantity;
    
    // Recalculate gross and net with new position
    let projectedGrossNotional = 0;
    let projectedNetNotional = 0;
    const projectedSectorNotionals = { ...sectorNotionals };

    const oldPosNotional = Math.abs(currentPosQuantity * price);
    const newPosNotional = Math.abs(projectedPosQuantity * price);

    projectedGrossNotional = currentGrossNotional - oldPosNotional + newPosNotional;
    projectedNetNotional = currentNetNotional + orderDelta;

    projectedSectorNotionals[sector] = (projectedSectorNotionals[sector] || 0) - oldPosNotional + newPosNotional;

    const projectedGrossLeverage = projectedGrossNotional / nav;
    const projectedNetLeverage = Math.abs(projectedNetNotional) / nav;
    const projectedSectorWeight = (projectedSectorNotionals[sector] || 0) / nav;

    // 1. Gross Leverage Check
    if (projectedGrossLeverage > this.maxGrossLeverage) {
      return {
        approved: false,
        reason: `MAX_GROSS_LEVERAGE_EXCEEDED: Projected leverage ${projectedGrossLeverage.toFixed(2)}x exceeds ceiling ${this.maxGrossLeverage}x`,
        projectedGrossLeverage,
        maxAllowed: this.maxGrossLeverage
      };
    }

    // 2. Net Directional Leverage Check
    if (projectedNetLeverage > this.maxNetLeverage) {
      return {
        approved: false,
        reason: `MAX_NET_LEVERAGE_EXCEEDED: Projected net exposure ${projectedNetLeverage.toFixed(2)}x exceeds ceiling ${this.maxNetLeverage}x`,
        projectedNetLeverage,
        maxAllowed: this.maxNetLeverage
      };
    }

    // 3. Sector Exposure Cap Check
    if (projectedSectorWeight > this.maxSectorExposure) {
      return {
        approved: false,
        reason: `SECTOR_EXPOSURE_EXCEEDED: Projected sector [${sector}] weight ${(projectedSectorWeight * 100).toFixed(1)}% exceeds cap ${(this.maxSectorExposure * 100).toFixed(1)}%`,
        sector,
        projectedSectorWeight,
        maxAllowed: this.maxSectorExposure
      };
    }

    return {
      approved: true,
      projectedGrossLeverage,
      projectedNetLeverage,
      sector,
      projectedSectorWeight
    };
  }
}

export const exposureManager = new ExposureManager();
