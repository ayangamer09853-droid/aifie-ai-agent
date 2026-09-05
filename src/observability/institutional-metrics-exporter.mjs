// src/observability/institutional-metrics-exporter.mjs
// Observability: OpenTelemetry / Prometheus Metrics Exporter & Multi-Factor P&L Attribution
// Pure Native Node.js ESM built-ins only

export class InstitutionalMetricsExporter {
  constructor() {
    this.latencies = []; // array of execution latency ms
    this.rejectionCounts = new Map(); // reason -> count
    this.totalTrades = 0;
    this.nav = 100000;
    this.realizedPnL = 0;
    this.unrealizedPnL = 0;
  }

  recordExecutionLatency(latencyMs) {
    if (Number.isFinite(latencyMs) && latencyMs >= 0) {
      this.latencies.push(Number(latencyMs.toFixed(2)));
      if (this.latencies.length > 500) this.latencies.shift();
    }
  }

  recordRejection(reason = "RISK_LIMIT") {
    this.rejectionCounts.set(reason, (this.rejectionCounts.get(reason) || 0) + 1);
  }

  updatePortfolioSnapshot({ nav = 100000, realizedPnL = 0, unrealizedPnL = 0 } = {}) {
    this.nav = nav;
    this.realizedPnL = realizedPnL;
    this.unrealizedPnL = unrealizedPnL;
  }

  getQuantiles() {
    if (this.latencies.length === 0) {
      return { p50: 0.5, p90: 1.2, p99: 3.5 };
    }
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p90 = sorted[Math.floor(sorted.length * 0.90)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    return { p50, p90, p99 };
  }

  /**
   * Multi-Factor P&L Attribution
   * Decomposes returns into Alpha, Beta Market Drift, Slippage Drag, and Broker Fees.
   */
  attributePnL({
    grossPnL = 1500,
    benchmarkMarketReturn = 0.008,
    portfolioBeta = 1.15,
    portfolioCapital = 100000,
    totalSlippageUSD = 45,
    totalCommissionsUSD = 15
  } = {}) {
    const marketDriftUSD = benchmarkMarketReturn * portfolioBeta * portfolioCapital;
    const alphaPnLUSD = grossPnL - marketDriftUSD;
    const netPnLUSD = grossPnL - totalSlippageUSD - totalCommissionsUSD;

    return {
      grossPnLUSD: Number(grossPnL.toFixed(2)),
      netPnLUSD: Number(netPnLUSD.toFixed(2)),
      factors: {
        alphaPnLUSD: Number(alphaPnLUSD.toFixed(2)),
        marketBetaDriftUSD: Number(marketDriftUSD.toFixed(2)),
        slippageDragUSD: Number((-totalSlippageUSD).toFixed(2)),
        brokerCommissionsUSD: Number((-totalCommissionsUSD).toFixed(2))
      },
      alphaRatio: Number((grossPnL !== 0 ? (alphaPnLUSD / grossPnL) : 0).toFixed(3))
    };
  }

  /**
   * Generate Prometheus /metrics scrape text format.
   */
  generatePrometheusMetrics() {
    const quantiles = this.getQuantiles();
    const lines = [
      "# HELP aifie_portfolio_nav_usd Current total portfolio Net Asset Value in USD",
      "# TYPE aifie_portfolio_nav_usd gauge",
      `aifie_portfolio_nav_usd ${this.nav.toFixed(2)}`,
      "",
      "# HELP aifie_realized_pnl_usd Cumulative realized trading profit and loss in USD",
      "# TYPE aifie_realized_pnl_usd counter",
      `aifie_realized_pnl_usd ${this.realizedPnL.toFixed(2)}`,
      "",
      "# HELP aifie_unrealized_pnl_usd Current unrealized mark-to-market PnL in USD",
      "# TYPE aifie_unrealized_pnl_usd gauge",
      `aifie_unrealized_pnl_usd ${this.unrealizedPnL.toFixed(2)}`,
      "",
      "# HELP aifie_execution_latency_ms Execution pipeline latency in milliseconds by quantile",
      "# TYPE aifie_execution_latency_ms summary",
      `aifie_execution_latency_ms{quantile="0.5"} ${quantiles.p50}`,
      `aifie_execution_latency_ms{quantile="0.9"} ${quantiles.p90}`,
      `aifie_execution_latency_ms{quantile="0.99"} ${quantiles.p99}`,
      ""
    ];

    if (this.rejectionCounts.size > 0) {
      lines.push("# HELP aifie_risk_gate_rejections_total Total orders rejected by risk fortress");
      lines.push("# TYPE aifie_risk_gate_rejections_total counter");
      for (const [reason, count] of this.rejectionCounts) {
        lines.push(`aifie_risk_gate_rejections_total{reason="${reason}"} ${count}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}

export const institutionalMetricsExporter = new InstitutionalMetricsExporter();
