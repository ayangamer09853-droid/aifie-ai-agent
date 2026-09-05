// src/strategies/strategy-registry.mjs
// Strategy Registry Architecture
// Replaces ad-hoc autonomous agent swarms with a strictly schema-validated Strategy Registry.

export class StrategyRegistry {
  constructor() {
    this.strategies = new Map();
    this._initializeStandardStrategies();
  }

  _initializeStandardStrategies() {
    this.register({
      id: "trend-v12",
      name: "Trend Momentum Breakout",
      version: "12.2.0",
      owner: "Quant Momentum Desk",
      inputSchema: ["bars_1m", "ema_20", "ema_50", "adx_14"],
      outputSchema: { direction: "BUY|SELL|NEUTRAL", confidence: "0..1", expectedReturn: "number" },
      features: ["trend_strength", "breakout_atr", "volume_expansion"],
      riskProfile: { maxDrawdown: 0.12, maxLeverage: 1.5, stopLossAtrMultiplier: 2.0 },
      historicalPerformance: { sharpe: 1.84, winRate: 0.54, profitFactor: 1.95 },
      baseWeight: 0.20,
      currentWeight: 0.20,
      status: "PRODUCTION"
    });

    this.register({
      id: "meanrev-v8",
      name: "Ornstein-Uhlenbeck Mean Reversion",
      version: "8.4.1",
      owner: "Statistical Arbitrage Desk",
      inputSchema: ["hurst_exponent", "z_score", "half_life"],
      outputSchema: { direction: "BUY|SELL|NEUTRAL", confidence: "0..1", expectedReturn: "number" },
      features: ["mean_reversion_speed", "z_distance", "band_penetration"],
      riskProfile: { maxDrawdown: 0.08, maxLeverage: 2.0, maxHoldingBars: 30 },
      historicalPerformance: { sharpe: 2.15, winRate: 0.67, profitFactor: 2.10 },
      baseWeight: 0.20,
      currentWeight: 0.20,
      status: "PRODUCTION"
    });

    this.register({
      id: "stat-arb-v5",
      name: "Cointegration Pairs Arbitrage",
      version: "5.1.0",
      owner: "Pairs Trading Desk",
      inputSchema: ["pair_spread", "coint_pvalue", "adf_stat"],
      outputSchema: { direction: "BUY|SELL|NEUTRAL", confidence: "0..1", expectedReturn: "number" },
      features: ["spread_zscore", "half_life_decay"],
      riskProfile: { maxDrawdown: 0.06, maxLeverage: 2.5, stopZScore: 3.5 },
      historicalPerformance: { sharpe: 2.40, winRate: 0.71, profitFactor: 2.35 },
      baseWeight: 0.20,
      currentWeight: 0.20,
      status: "PRODUCTION"
    });

    this.register({
      id: "rl-v17",
      name: "NTU TradeMaster Deep Actor-Critic Policy",
      version: "17.0.3",
      owner: "Deep RL Core",
      inputSchema: ["normalized_state_vector", "action_mask"],
      outputSchema: { direction: "BUY|SELL|NEUTRAL", confidence: "0..1", expectedReturn: "number" },
      features: ["state_embeddings", "q_values", "entropy"],
      riskProfile: { maxDrawdown: 0.15, maxLeverage: 1.2, maxEntropyDrop: 0.4 },
      historicalPerformance: { sharpe: 1.95, winRate: 0.58, profitFactor: 1.88 },
      baseWeight: 0.20,
      currentWeight: 0.20,
      status: "PRODUCTION"
    });

    this.register({
      id: "microstructure-v6",
      name: "L2 Order Book Imbalance & Flow Toxicity",
      version: "6.3.0",
      owner: "HFT Microstructure Desk",
      inputSchema: ["obi", "micro_price", "vpin"],
      outputSchema: { direction: "BUY|SELL|NEUTRAL", confidence: "0..1", expectedReturn: "number" },
      features: ["queue_depletion", "depth_skew", "toxic_flow_pct"],
      riskProfile: { maxDrawdown: 0.05, maxLeverage: 3.0, maxHoldingMs: 60000 },
      historicalPerformance: { sharpe: 2.80, winRate: 0.74, profitFactor: 2.65 },
      baseWeight: 0.10,
      currentWeight: 0.10,
      status: "PRODUCTION"
    });

    this.register({
      id: "value-v4",
      name: "Buffett Moat & Graham DCF Margin of Safety",
      version: "4.0.0",
      owner: "Fundamental Value Desk",
      inputSchema: ["dcf_margin_pct", "moat_score", "roe"],
      outputSchema: { direction: "BUY|SELL|NEUTRAL", confidence: "0..1", expectedReturn: "number" },
      features: ["owner_earnings_yield", "capital_efficiency"],
      riskProfile: { maxDrawdown: 0.18, maxLeverage: 1.0, minimumMarginOfSafety: 0.25 },
      historicalPerformance: { sharpe: 1.62, winRate: 0.61, profitFactor: 2.05 },
      baseWeight: 0.10,
      currentWeight: 0.10,
      status: "PRODUCTION"
    });
  }

  /**
   * Registers a new strategy with strict schema enforcement.
   * @param {Object} strategy
   */
  register(strategy) {
    if (!strategy.id || typeof strategy.id !== "string") {
      throw new Error("Strategy must have a valid 'id'");
    }
    if (!strategy.version || !strategy.owner) {
      throw new Error(`Strategy ${strategy.id} missing version or owner`);
    }

    const validated = {
      id: strategy.id,
      name: strategy.name || strategy.id,
      version: strategy.version,
      owner: strategy.owner,
      inputSchema: Array.isArray(strategy.inputSchema) ? strategy.inputSchema : [],
      outputSchema: strategy.outputSchema || {},
      features: Array.isArray(strategy.features) ? strategy.features : [],
      riskProfile: strategy.riskProfile || {},
      historicalPerformance: strategy.historicalPerformance || { sharpe: 0, winRate: 0, profitFactor: 0 },
      baseWeight: strategy.baseWeight ?? 0.1,
      currentWeight: strategy.currentWeight ?? strategy.baseWeight ?? 0.1,
      status: strategy.status || "RESEARCH",
      updatedAt: Date.now()
    };

    this.strategies.set(strategy.id, validated);
    return Object.freeze({ ...validated });
  }

  /**
   * Retrieves a strategy by ID.
   * @param {string} id
   */
  get(id) {
    const s = this.strategies.get(id);
    return s ? Object.freeze({ ...s }) : null;
  }

  /**
   * Lists all registered strategies, optionally filtered by status.
   * @param {string} [status]
   */
  list(status) {
    const all = Array.from(this.strategies.values());
    if (status) {
      return all.filter(s => s.status === status).map(s => Object.freeze({ ...s }));
    }
    return all.map(s => Object.freeze({ ...s }));
  }

  /**
   * Promotes or changes status of a strategy.
   * Allowed statuses: RESEARCH -> VALIDATION -> PAPER -> SHADOW -> PRODUCTION -> DEGRADED -> QUARANTINED
   * @param {string} id
   * @param {string} newStatus
   * @param {string} reason
   */
  setStatus(id, newStatus, reason) {
    const strategy = this.strategies.get(id);
    if (!strategy) throw new Error(`Strategy ${id} not found`);

    const validStatuses = ["RESEARCH", "VALIDATION", "PAPER", "SHADOW", "PRODUCTION", "DEGRADED", "QUARANTINED"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status ${newStatus}. Must be one of: ${validStatuses.join(", ")}`);
    }

    const oldStatus = strategy.status;
    strategy.status = newStatus;
    strategy.lastStatusChange = {
      from: oldStatus,
      to: newStatus,
      timestamp: Date.now(),
      reason: reason || "Manual status change"
    };

    if (newStatus === "DEGRADED" || newStatus === "QUARANTINED") {
      strategy.currentWeight = 0; // zero allocation on failure
    }

    return Object.freeze({ ...strategy });
  }

  /**
   * Adjusts strategy weights according to the active Market Regime.
   * @param {string} regime - e.g. "TRENDING", "MEAN_REVERTING", "HIGH_VOLATILITY", "CRISIS"
   */
  adaptWeightsToRegime(regime) {
    const strategies = Array.from(this.strategies.values());
    
    for (const strat of strategies) {
      if (strat.status !== "PRODUCTION" && strat.status !== "SHADOW") {
        strat.currentWeight = 0;
        continue;
      }

      let multiplier = 1.0;
      switch (regime) {
        case "TRENDING":
          if (strat.id.startsWith("trend")) multiplier = 1.8;
          else if (strat.id.startsWith("meanrev")) multiplier = 0.4;
          break;
        case "MEAN_REVERTING":
          if (strat.id.startsWith("meanrev") || strat.id.startsWith("stat-arb")) multiplier = 1.8;
          else if (strat.id.startsWith("trend")) multiplier = 0.3;
          break;
        case "HIGH_VOLATILITY":
          if (strat.id.startsWith("microstructure")) multiplier = 1.5;
          else multiplier = 0.6;
          break;
        case "CRISIS":
          // Extreme risk protection: only microstructure or zero weight
          multiplier = strat.id.startsWith("microstructure") ? 0.5 : 0.0;
          break;
        default:
          multiplier = 1.0;
          break;
      }

      strat.currentWeight = Number((strat.baseWeight * multiplier).toFixed(4));
    }

    // Normalize weights to sum to 1.0
    const totalWeight = strategies.reduce((sum, s) => sum + s.currentWeight, 0);
    if (totalWeight > 0) {
      for (const strat of strategies) {
        strat.currentWeight = Number((strat.currentWeight / totalWeight).toFixed(4));
      }
    }

    return this.list();
  }
}

export const strategyRegistry = new StrategyRegistry();
