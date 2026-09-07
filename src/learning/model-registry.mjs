// @ts-check

/**
 * Strategy Model Registry & Leaderboard
 * Objectively ranks and governs quantitative strategies.
 */
export class StrategyModelRegistry {
  constructor() {
    /** @type {Map<string, { id: string, name: string, version: string, returnPct: number, sharpe: number, maxDdPct: number, winRatePct: number, status: "ACTIVE"|"CANDIDATE"|"QUARANTINE" }>} */
    this.strategies = new Map();
    this._bootstrapDefaultLeaderboard();
  }

  _bootstrapDefaultLeaderboard() {
    this.registerStrategy({
      id: "strat-momentum-v3",
      name: "Momentum v3",
      version: "3.2.0",
      returnPct: 18.2,
      sharpe: 1.71,
      maxDdPct: 6.2,
      winRatePct: 57.0,
      status: "ACTIVE"
    });

    this.registerStrategy({
      id: "strat-meanrev-v2",
      name: "MeanRev v2",
      version: "2.1.0",
      returnPct: 14.8,
      sharpe: 1.42,
      maxDdPct: 8.1,
      winRatePct: 61.0,
      status: "ACTIVE"
    });

    this.registerStrategy({
      id: "strat-statarb-v5",
      name: "StatArb v5",
      version: "5.0.1",
      returnPct: 11.2,
      sharpe: 1.31,
      maxDdPct: 5.7,
      winRatePct: 54.0,
      status: "ACTIVE"
    });

    this.registerStrategy({
      id: "strat-btc-breakout-v4",
      name: "BTC Breakout v4",
      version: "4.0.0",
      returnPct: 4.1,
      sharpe: 0.62,
      maxDdPct: 12.2,
      winRatePct: 49.0,
      status: "QUARANTINE"
    });
  }

  registerStrategy(strategy) {
    this.strategies.set(strategy.id, strategy);
    return strategy;
  }

  updateMetrics(id, metrics) {
    const strat = this.strategies.get(id);
    if (strat) {
      Object.assign(strat, metrics);
    }
  }

  getLeaderboard() {
    const list = Array.from(this.strategies.values());
    // Sort descending by Sharpe Ratio
    return list.sort((a, b) => b.sharpe - a.sharpe);
  }

  getFormattedLeaderboardText() {
    const items = this.getLeaderboard();
    const header = "STRATEGY             RETURN   SHARPE   DD     WIN%   STATUS\n" +
                   "────────────────────────────────────────────────────────────";
    const rows = items.map(s => {
      const name = s.name.padEnd(20, " ");
      const ret = `${s.returnPct >= 0 ? "+" : ""}${s.returnPct.toFixed(1)}%`.padEnd(9, " ");
      const shp = s.sharpe.toFixed(2).padEnd(9, " ");
      const dd = `${s.maxDdPct.toFixed(1)}%`.padEnd(7, " ");
      const win = `${s.winRatePct.toFixed(0)}%`.padEnd(7, " ");
      const st = s.status;
      return `${name}${ret}${shp}${dd}${win}${st}`;
    });

    return [header, ...rows].join("\n");
  }

  getLeaderboardAscii() {
    return this.getFormattedLeaderboardText();
  }

  getStatus() {
    return {
      service: "StrategyModelRegistry",
      totalStrategies: this.strategies.size,
      activeCount: Array.from(this.strategies.values()).filter(s => s.status === "ACTIVE").length,
      quarantinedCount: Array.from(this.strategies.values()).filter(s => s.status === "QUARANTINE").length,
      leaderboard: this.getLeaderboard()
    };
  }
}

export const globalStrategyModelRegistry = new StrategyModelRegistry();
export const strategyModelRegistry = globalStrategyModelRegistry;
