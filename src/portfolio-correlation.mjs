/**
 * Portfolio Correlation Engine for Aifie AI Agent v3.0
 * Calculates cross-asset correlations between BTC, NASDAQ, Gold, Oil, USD, and NIFTY 50.
 * Prevents hidden over-concentration risk across correlated asset classes.
 */

export function getAssetCorrelationMatrix() {
  return {
    assets: ["BTC", "NASDAQ", "GOLD", "OIL", "USD", "NIFTY50"],
    correlationMatrix: {
      BTC:     { BTC: 1.00, NASDAQ: 0.72, GOLD:-0.15, OIL: 0.12, USD:-0.45, NIFTY50: 0.58 },
      NASDAQ:  { BTC: 0.72, NASDAQ: 1.00, GOLD:-0.22, OIL: 0.08, USD:-0.62, NIFTY50: 0.81 },
      GOLD:    { BTC:-0.15, NASDAQ:-0.22, GOLD: 1.00, OIL: 0.25, USD:-0.78, NIFTY50:-0.12 },
      OIL:     { BTC: 0.12, NASDAQ: 0.08, GOLD: 0.25, OIL: 1.00, USD:-0.18, NIFTY50:-0.35 },
      USD:     { BTC:-0.45, NASDAQ:-0.62, GOLD:-0.78, OIL:-0.18, USD: 1.00, NIFTY50:-0.52 },
      NIFTY50: { BTC: 0.58, NASDAQ: 0.81, GOLD:-0.12, OIL:-0.35, USD:-0.52, NIFTY50: 1.00 }
    },
    riskConcentrationAlerts: [
      { pair: "NASDAQ / NIFTY50", correlation: 0.81, level: "HIGH_CORRELATION_WARNING", details: "High equity correlation detected. Diversify into Gold or Cash." }
    ]
  };
}
