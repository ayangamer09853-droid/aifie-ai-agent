import test from "node:test";
import assert from "node:assert/strict";
import { getRealMarketToolsStatus, calculateRealTechnicalIndicators, queryCcxtSupportedExchanges } from "../src/real-market-tools-suite.mjs";

test("getRealMarketToolsStatus reports active installed real market SDKs", () => {
  const status = getRealMarketToolsStatus();
  assert.equal(status.toolsSuiteStatus, "REAL_MARKET_TOOLS_SUITE_INSTALLED_ONLINE");
  assert.equal(status.installedToolsCount, 6);
  assert.ok(status.ccxtSupportedExchangesCount > 50);
});

test("calculateRealTechnicalIndicators uses technicalindicators SDK to calculate SMA, RSI, MACD, BB", () => {
  const indicators = calculateRealTechnicalIndicators({ prices: [150, 152, 151, 153, 155, 158, 160, 162, 161, 165] });
  assert.equal(indicators.indicatorStatus, "REAL_TECHNICAL_INDICATORS_CALCULATED");
  assert.ok(indicators.latestRsi > 0);
  assert.ok(indicators.latestSma > 0);
  assert.ok(indicators.latestBollingerBands.upper > indicators.latestBollingerBands.lower);
});

test("queryCcxtSupportedExchanges queries CCXT unified exchange library", () => {
  const res = queryCcxtSupportedExchanges({ search: "binance" });
  assert.equal(res.searchQuery, "binance");
  assert.ok(res.matchedExchangesCount >= 1);
  assert.ok(res.totalCcxtExchanges > 50);
});
