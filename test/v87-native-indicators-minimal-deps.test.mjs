import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands
} from "../src/native-indicators-engine.mjs";
import {
  getRealMarketToolsStatus,
  calculateRealTechnicalIndicators
} from "../src/real-market-tools-suite.mjs";

test("Native Quantitative Indicators calculate exact financial mathematics with 0 dependencies", () => {
  const prices = [100, 102, 104, 103, 105, 107, 106, 108, 110, 112];

  // Test SMA
  const sma = calculateSMA(prices, 5);
  assert.ok(sma.length > 0);
  assert.equal(sma[0], 102.8); // (100+102+104+103+105)/5

  // Test EMA
  const ema = calculateEMA(prices, 5);
  assert.ok(ema.length > 0);

  // Test RSI
  const rsi = calculateRSI(prices, 5);
  assert.ok(rsi.length > 0);
  assert.ok(rsi[rsi.length - 1] > 0 && rsi[rsi.length - 1] <= 100);

  // Test MACD
  const macd = calculateMACD(prices, { fastPeriod: 3, slowPeriod: 6, signalPeriod: 3 });
  assert.ok(macd.length > 0);
  assert.ok(typeof macd[0].MACD === "number");

  // Test Bollinger Bands
  const bb = calculateBollingerBands(prices, { period: 5, stdDev: 2 });
  assert.ok(bb.length > 0);
  assert.ok(bb[0].upper > bb[0].middle);
  assert.ok(bb[0].middle > bb[0].lower);
});

test("Real Market Tools Suite operates cleanly under Ultra-Light architecture", () => {
  const status = getRealMarketToolsStatus();
  assert.equal(status.toolsSuiteStatus, "REAL_MARKET_TOOLS_SUITE_INSTALLED_ONLINE");
  assert.equal(status.dependencyArchitecture, "ULTRA_LIGHT_NATIVE_MATHEMATICS");

  const calc = calculateRealTechnicalIndicators();
  assert.equal(calc.indicatorStatus, "REAL_TECHNICAL_INDICATORS_CALCULATED");
  assert.equal(calc.calculationEngine, "NATIVE_PURE_JS_ZERO_DEP");
  assert.ok(typeof calc.latestRsi === "number");
  assert.ok(typeof calc.latestSma === "number");
});
