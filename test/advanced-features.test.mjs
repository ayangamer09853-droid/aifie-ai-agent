import test from "node:test";
import assert from "node:assert/strict";
import { getUpcomingEconomicEvents, checkNewsVolatilityShield } from "../src/economic-tracker.mjs";
import { calculateTrendStrength, generateDailyReport } from "../src/daily-report.mjs";
import { createAlertRule, evaluateSmartAlerts, getActiveAlerts } from "../src/price-alerts.mjs";
import { getPreMarketIntelligence } from "../src/premarket-intel.mjs";
import { createPaperState } from "../src/paper-engine.mjs";
import { createStrategyState } from "../src/strategy-lab.mjs";
import { executeMultiAssetTrades } from "../src/multi-trade-engine.mjs";

test("getUpcomingEconomicEvents returns macro events and checkNewsVolatilityShield handles risk status", () => {
  const events = getUpcomingEconomicEvents();
  assert.ok(events.events.length >= 3);
  assert.equal(events.macroRiskLevel, "MODERATE");

  const shield = checkNewsVolatilityShield();
  assert.ok(typeof shield.isShieldActive === "boolean");
});

test("calculateTrendStrength evaluates ADX and trend direction", () => {
  const uptrendPrices = [100, 102, 105, 108, 112, 115, 120];
  const trend = calculateTrendStrength(uptrendPrices);
  assert.equal(trend.direction, "BULLISH");
  assert.ok(trend.score > 50);
  assert.ok(trend.adx > 15);
});

test("generateDailyReport generates full daily PnL and summary audit", () => {
  const mockOrders = [
    { side: "sell", fillPrice: 110, quotedPrice: 100, quantity: 2, commission: 1.0, symbol: "AAPL" }
  ];
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100020, positions: {} } });
  
  const report = generateDailyReport(mockOrders, paper);
  assert.ok(report.reportDate);
  assert.equal(report.summary.dailyPnl, 20);
  assert.ok(report.trendStrengths.AAPL);
});

test("createAlertRule and evaluateSmartAlerts trigger price target alerts", () => {
  const rule = createAlertRule({ symbol: "AAPL", condition: "ABOVE", targetPrice: 150 });
  assert.equal(rule.symbol, "AAPL");
  
  const mockQuotes = { AAPL: { symbol: "AAPL", price: 155 } };
  const triggered = evaluateSmartAlerts(mockQuotes, {});
  assert.ok(triggered.length >= 1);
  assert.equal(triggered[0].symbol, "AAPL");
});

test("getPreMarketIntelligence returns directional pre-market bias", async () => {
  const intel = await getPreMarketIntelligence("TSLA");
  assert.equal(intel.symbol, "TSLA");
  assert.ok(["BULLISH", "BEARISH", "NEUTRAL"].includes(intel.bias));
  assert.ok(intel.preMarketPrice > 0);
});

test("executeMultiAssetTrades runs parallel scans across watch symbols", async () => {
  const paper = createPaperState();
  const strategyLab = createStrategyState();
  const orders = [];
  
  const result = await executeMultiAssetTrades({
    watchSymbols: ["AAPL", "TSLA"],
    paper,
    strategyLab,
    orders,
    activeStrategyId: "sma_crossover",
    maxTradeQuantity: 5
  });

  assert.equal(result.totalSymbolsScanned, 2);
  assert.ok(typeof result.tradesExecutedCount === "number");
});
