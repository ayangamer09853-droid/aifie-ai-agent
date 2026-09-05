import test from "node:test";
import assert from "node:assert/strict";
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateMomentum, generateTradingSignal } from "../src/technical-indicators.mjs";

test("calculateSMA computes average over given window", () => {
  const prices = [10, 20, 30, 40, 50];
  assert.equal(calculateSMA(prices, 3), 40); // (30+40+50)/3 = 40
  assert.equal(calculateSMA(prices, 5), 30);
  assert.equal(calculateSMA(prices, 10), null);
});

test("calculateEMA computes exponential weighted moving average", () => {
  const prices = [10, 12, 14, 16, 18, 20, 22];
  const ema = calculateEMA(prices, 3);
  assert.notEqual(ema, null);
  assert.ok(ema > 18 && ema <= 22);
});

test("calculateRSI detects oversold and overbought conditions", () => {
  // Constant gains -> RSI close to 100
  const uptrend = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  const rsiUp = calculateRSI(uptrend, 14);
  assert.equal(rsiUp, 100);

  // Constant losses -> RSI close to 0
  const downtrend = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
  const rsiDown = calculateRSI(downtrend, 14);
  assert.equal(rsiDown, 0);
});

test("calculateMACD computes macd line and signal line", () => {
  const prices = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 2) * 10);
  const macd = calculateMACD(prices, 5, 12, 5);
  assert.notEqual(macd, null);
  assert.ok(typeof macd.macdLine === "number");
  assert.ok(typeof macd.signalLine === "number");
  assert.ok(typeof macd.histogram === "number");
});

test("calculateMomentum computes price percent change", () => {
  const prices = [100, 102, 104, 105, 110];
  const mom = calculateMomentum(prices, 4);
  assert.equal(mom, 10); // ((110-100)/100)*100 = 10%
});

test("generateTradingSignal yields BUY on Golden Cross and SELL on Death Cross", () => {
  // Uptrend price series -> fast SMA > slow SMA
  const uptrendPrices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
  const buySignal = generateTradingSignal(uptrendPrices, "sma_crossover");
  assert.equal(buySignal.signal, "BUY");
  assert.ok(buySignal.confidence > 0.5);

  // Downtrend price series -> fast SMA < slow SMA
  const downtrendPrices = [80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 28, 25, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
  const sellSignal = generateTradingSignal(downtrendPrices, "sma_crossover");
  assert.equal(sellSignal.signal, "SELL");
  assert.ok(sellSignal.confidence > 0.5);
});

test("calculateFractionalDifferentiation produces stationary memory-preserving series", async () => {
  const { calculateFractionalDifferentiation } = await import("../src/technical-indicators.mjs");
  const prices = [100, 102, 101, 105, 108, 107, 110, 112, 115, 114, 118];
  const fracDiff = calculateFractionalDifferentiation(prices, 0.4);
  assert.equal(fracDiff.length, prices.length);
  assert.ok(typeof fracDiff[fracDiff.length - 1] === "number");
  assert.ok(Number.isFinite(fracDiff[fracDiff.length - 1]));
});

test("evaluateTripleBarrierLabeling classifies profit take and stop loss events", async () => {
  const { evaluateTripleBarrierLabeling } = await import("../src/technical-indicators.mjs");
  const rallyPrices = [100, 101, 103, 106, 110];
  const ptResult = evaluateTripleBarrierLabeling(rallyPrices, { entryIndex: 0, ptMultiplier: 1.0, slMultiplier: 1.0, volatility: 0.02 });
  assert.equal(ptResult.outcome, "PROFIT_TAKE");
  assert.equal(ptResult.barrierHit, "UPPER_HORIZONTAL");
  assert.ok(ptResult.returnPct > 0);

  const dumpPrices = [100, 99, 97, 94, 90];
  const slResult = evaluateTripleBarrierLabeling(dumpPrices, { entryIndex: 0, ptMultiplier: 1.0, slMultiplier: 1.0, volatility: 0.02 });
  assert.equal(slResult.outcome, "STOP_LOSS");
  assert.equal(slResult.barrierHit, "LOWER_HORIZONTAL");
  assert.ok(slResult.returnPct < 0);
});
