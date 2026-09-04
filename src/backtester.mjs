/**
 * Event-Driven Discrete Candle Backtester
 * Simulates trade execution, position management, mark-to-market equity,
 * maximum drawdown, and annualized Sharpe ratio.
 */

export class Backtester {
  constructor(strategy, historicalData = [], initialCash = 100000) {
    this.strategy = strategy;
    this.data = Array.isArray(historicalData) ? historicalData : [];
    this.positions = [];
    this.cash = initialCash;
    this.equity = initialCash;
    this.startEquity = initialCash;
    this.trades = [];
  }

  run() {
    for (const candle of this.data) {
      if (!candle || typeof candle.close !== "number") continue;

      let signal = "HOLD";
      if (typeof this.strategy?.evaluate === "function") {
        signal = this.strategy.evaluate(candle, this.positions);
      } else if (typeof this.strategy === "function") {
        signal = this.strategy(candle, this.positions);
      }

      if (signal === "BUY" && this.cash > candle.close * 10) {
        const qty = Math.floor((this.cash / candle.close) * 0.5); // 50% allocation
        if (qty > 0) {
          this.positions.push({
            symbol: "BACKTEST",
            qty,
            entry: candle.close,
            entryTime: candle.time || new Date().toISOString()
          });
          this.cash -= qty * candle.close;
          this.trades.push({
            time: candle.time || new Date().toISOString(),
            action: "BUY",
            price: candle.close,
            qty
          });
        }
      }

      if (signal === "SELL" && this.positions.length > 0) {
        const pos = this.positions.pop();
        const proceeds = pos.qty * candle.close;
        this.cash += proceeds;
        this.trades.push({
          time: candle.time || new Date().toISOString(),
          action: "SELL",
          price: candle.close,
          qty: pos.qty,
          pnl: proceeds - (pos.qty * pos.entry)
        });
      }

      // Mark-to-market equity
      const positionValue = this.positions.reduce((sum, p) => sum + p.qty * candle.close, 0);
      this.equity = this.cash + positionValue;
    }

    return {
      startEquity: this.startEquity,
      endEquity: Number(this.equity.toFixed(2)),
      tradesCount: this.trades.length,
      trades: this.trades,
      maxDrawdown: Number(this.calculateMaxDrawdown().toFixed(4)),
      sharpeRatio: Number(this.calculateSharpe().toFixed(4))
    };
  }

  calculateMaxDrawdown() {
    let peak = this.startEquity;
    let maxDD = 0;
    for (const trade of this.trades) {
      if (typeof trade.pnl === "number" && trade.pnl < 0) {
        const dd = (trade.pnl / peak) * 100;
        maxDD = Math.min(maxDD, dd);
      }
    }
    return maxDD;
  }

  calculateSharpe(riskFreeRate = 0.02) {
    const returns = this.trades
      .filter(t => typeof t.pnl === "number" && t.qty > 0 && t.price > 0)
      .map(t => t.pnl / (t.qty * t.price));

    if (!returns.length) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stddev = Math.sqrt(variance);

    return (mean - riskFreeRate) / (stddev || 1);
  }
}
