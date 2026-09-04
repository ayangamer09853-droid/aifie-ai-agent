import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";

import {
  fetchBinanceTicker,
  fetchBinanceOrderBook,
  fetchBinanceRecentTrades,
  generateBinanceSignature,
  normalizeBinanceSymbol,
  getBinanceFeedStatus
} from "../src/market-feed-binance.mjs";

import {
  fetchAlpacaLatestTrade,
  fetchAlpacaLatestQuote,
  fetchAlpacaBars,
  fetchAlpacaSnapshot,
  normalizeAlpacaSymbol,
  getAlpacaFeedStatus
} from "../src/market-feed-alpaca.mjs";

import {
  fetchYahooFinanceQuote,
  fetchCoinGeckoPrice,
  resolveUniversalSymbol,
  getUniversalFeedStatus
} from "../src/market-feed-universal.mjs";

import {
  recordMarketTick,
  getCandleBars,
  getTickHistory,
  computeSessionVwap,
  purgeStaleTicks,
  clearTimeseriesStore,
  getTimeseriesStoreStatus
} from "../src/timeseries-market-store.mjs";

import {
  updateOrderBookL2,
  calculateBidAskImbalance,
  computeMicroPrice,
  detectSpreadSpike,
  getOrderBookSnapshot,
  clearOrderBook
} from "../src/order-book-depth.mjs";

import {
  validatePriceTick,
  isQuoteStale,
  detectSpikeAnomaly,
  sanitizeTickBatch,
  getSanitizerStats,
  resetSanitizerStats
} from "../src/data-sanitizer.mjs";

import { getUnifiedMarketQuote } from "../src/market-data.mjs";

let server;
let baseUrl;

test.before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
});

test("Phase 1: Binance connector normalizes symbols and fetches ticker, depth, and trades", async () => {
  assert.equal(normalizeBinanceSymbol("btc/usdt"), "BTCUSDT");
  assert.equal(normalizeBinanceSymbol("ETH-USDT"), "ETHUSDT");

  const status = getBinanceFeedStatus();
  assert.equal(status.provider, "BINANCE");
  assert.equal(status.status, "ONLINE");

  const ticker = await fetchBinanceTicker("BTCUSDT");
  assert.equal(ticker.success, true);
  assert.equal(ticker.symbol, "BTCUSDT");
  assert.ok(ticker.price > 0);
  assert.ok(ticker.bid > 0);
  assert.ok(ticker.ask > 0);

  const depth = await fetchBinanceOrderBook("BTCUSDT", 10);
  assert.equal(depth.success, true);
  assert.ok(depth.bids.length > 0);
  assert.ok(depth.asks.length > 0);

  const trades = await fetchBinanceRecentTrades("BTCUSDT", 5);
  assert.equal(trades.success, true);
  assert.ok(trades.count > 0);

  const sig = generateBinanceSignature("symbol=BTCUSDT", "secretKey123");
  assert.equal(typeof sig, "string");
  assert.equal(sig.length, 64);
});

test("Phase 1: Alpaca connector fetches US equities trade, NBBO quote, bars, and snapshot", async () => {
  assert.equal(normalizeAlpacaSymbol("aapl"), "AAPL");

  const status = getAlpacaFeedStatus();
  assert.equal(status.provider, "ALPACA");
  assert.equal(status.status, "ONLINE");

  const trade = await fetchAlpacaLatestTrade("AAPL");
  assert.equal(trade.success, true);
  assert.equal(trade.symbol, "AAPL");
  assert.ok(trade.price > 0);

  const quote = await fetchAlpacaLatestQuote("AAPL");
  assert.equal(quote.success, true);
  assert.ok(quote.bid > 0);
  assert.ok(quote.ask > 0);
  assert.ok(quote.spread >= 0);

  const bars = await fetchAlpacaBars("AAPL", "1Min", 10);
  assert.equal(bars.success, true);
  assert.ok(bars.barsCount > 0);
  assert.ok(bars.bars[0].open > 0);
  assert.ok(bars.bars[0].close > 0);

  const snap = await fetchAlpacaSnapshot("AAPL");
  assert.equal(snap.success, true);
  assert.ok(snap.price > 0);
});

test("Phase 1: Universal feed resolves symbol classes and fetches fallback prices", async () => {
  const cryptoRes = resolveUniversalSymbol("BTC/USDT");
  assert.equal(cryptoRes.assetClass, "CRYPTO");

  const equityRes = resolveUniversalSymbol("NVDA");
  assert.equal(equityRes.assetClass, "EQUITY");

  const fxRes = resolveUniversalSymbol("EURUSD");
  assert.equal(fxRes.assetClass, "FOREX");

  const status = getUniversalFeedStatus();
  assert.equal(status.provider, "UNIVERSAL_AGGREGATOR");

  const yQuote = await fetchYahooFinanceQuote("AAPL");
  assert.equal(yQuote.success, true);
  assert.ok(yQuote.price > 0);

  const cgPrice = await fetchCoinGeckoPrice("bitcoin");
  assert.equal(cgPrice.success, true);
  assert.ok(cgPrice.priceUsd > 0);
});

test("Phase 1: Timeseries market store aggregates ticks into OHLCV bars and computes VWAP", () => {
  clearTimeseriesStore("TEST_ASSET");

  const baseTime = 1700000000000;
  // Ingest 3 ticks in same 1m bucket
  recordMarketTick({ symbol: "TEST_ASSET", price: 100, volume: 10, timestamp: baseTime });
  recordMarketTick({ symbol: "TEST_ASSET", price: 105, volume: 20, timestamp: baseTime + 1000 });
  recordMarketTick({ symbol: "TEST_ASSET", price: 98, volume: 10, timestamp: baseTime + 2000 });

  const history = getTickHistory("TEST_ASSET");
  assert.equal(history.length, 3);

  const bars = getCandleBars("TEST_ASSET", "1m");
  assert.equal(bars.length, 1);
  const bar = bars[0];
  assert.equal(bar.open, 100);
  assert.equal(bar.high, 105);
  assert.equal(bar.low, 98);
  assert.equal(bar.close, 98);
  assert.equal(bar.volume, 40);

  // Expected VWAP: (100*10 + 105*20 + 98*10) / 40 = (1000 + 2100 + 980) / 40 = 4080 / 40 = 102
  const vwap = computeSessionVwap("TEST_ASSET");
  assert.equal(vwap, 102);

  const purge = purgeStaleTicks("TEST_ASSET", 1000, baseTime + 2000);
  assert.equal(purge.purged, 1); // first tick is older than 1000ms
  assert.equal(purge.remaining, 2);

  const storeStatus = getTimeseriesStoreStatus();
  assert.equal(storeStatus.status, "TIMESERIES_STORE_ONLINE");
  assert.ok(storeStatus.trackedSymbols.includes("TEST_ASSET"));
});

test("Phase 1: Order book depth computes Imbalance (OBI), Micro-Price, and detects Spread Spikes", () => {
  clearOrderBook("BTCUSDT");

  // Asymmetric book: Bids have 40 volume, Asks have 10 volume (Bullish pressure)
  updateOrderBookL2("BTCUSDT", {
    bids: [[100, 30], [99, 10]],
    asks: [[101, 5], [102, 5]]
  });

  const obi = calculateBidAskImbalance("BTCUSDT", 2);
  // Imbalance = (40 - 10) / (40 + 10) = 30 / 50 = 0.6
  assert.equal(obi.imbalance, 0.6);
  assert.equal(obi.bias, "BULLISH_PRESSURE");

  // Micro-Price with top bid [100, 30] and top ask [101, 5]:
  // P_micro = (101 * 30 + 100 * 5) / (30 + 5) = (3030 + 500) / 35 = 3530 / 35 = 100.8571
  const micro = computeMicroPrice("BTCUSDT");
  assert.equal(micro.microPrice, 100.8571);
  assert.equal(micro.midPrice, 100.5);
  assert.equal(micro.spread, 1);

  // Normal spread test (< 0.25% threshold)
  const normalCheck = detectSpreadSpike("BTCUSDT", 2.0);
  assert.equal(normalCheck.isSpike, false);

  // Spread spike detection test
  const spikeCheck = detectSpreadSpike("BTCUSDT", 0.5);
  assert.equal(spikeCheck.isSpike, true);

  const snap = getOrderBookSnapshot("BTCUSDT", 2);
  assert.equal(snap.bids.length, 2);
  assert.equal(snap.asks.length, 2);
  assert.equal(snap.imbalance, 0.6);
});

test("Phase 1: Data sanitizer filters flash spikes, stale quotes, and anomalies", () => {
  resetSanitizerStats();

  // Valid tick
  const valid = validatePriceTick({ symbol: "AAPL", price: 150, volume: 10 });
  assert.equal(valid.valid, true);

  // Negative/Zero price rejected
  const neg = validatePriceTick({ symbol: "AAPL", price: -10 });
  assert.equal(neg.valid, false);
  assert.equal(neg.reason, "INVALID_PRICE_NON_POSITIVE");

  // Flash spike (> 25% price jump from previous tick) rejected
  const lastTick = { price: 100 };
  const spike = validatePriceTick({ symbol: "AAPL", price: 135 }, lastTick, { maxJumpPercent: 25 });
  assert.equal(spike.valid, false);
  assert.equal(spike.reason, "EXCESSIVE_PRICE_JUMP_FLASH_SPIKE");

  // Staleness check
  const stale = isQuoteStale(new Date(Date.now() - 120000).toISOString(), 60000);
  assert.equal(stale.isStale, true);

  const fresh = isQuoteStale(new Date().toISOString(), 60000);
  assert.equal(fresh.isStale, false);

  // Statistical outlier detection
  const rolling = [100, 101, 99, 100.5, 99.8, 100.2, 100.1];
  const normalAnomaly = detectSpikeAnomaly(100.3, rolling);
  assert.equal(normalAnomaly.isAnomaly, false);

  const extremeAnomaly = detectSpikeAnomaly(115, rolling);
  assert.equal(extremeAnomaly.isAnomaly, true);

  // Batch sanitization
  const batch = sanitizeTickBatch([
    { symbol: "AAPL", price: 100, volume: 10 },
    { symbol: "AAPL", price: -5, volume: 10 },
    { symbol: "AAPL", price: 101, volume: 20 }
  ]);
  assert.equal(batch.inputCount, 3);
  assert.equal(batch.sanitizedCount, 2);
  assert.equal(batch.rejectedCount, 1);
});

test("Phase 1: Unified market data router resolves quotes and auto-ingests into timeseries", async () => {
  const cryptoQuote = await getUnifiedMarketQuote("BTCUSDT");
  assert.equal(cryptoQuote.symbol, "BTCUSDT");
  assert.ok(cryptoQuote.price > 0);
  assert.ok(cryptoQuote.provider);

  const equityQuote = await getUnifiedMarketQuote("NVDA");
  assert.equal(equityQuote.symbol, "NVDA");
  assert.ok(equityQuote.price > 0);

  const history = getTickHistory("BTCUSDT");
  assert.ok(history.length > 0);
});

test("Phase 1: Server exposes market data endpoints with live responses", async () => {
  // Quote endpoint
  const qRes = await fetch(`${baseUrl}/api/market/quote?symbol=BTCUSDT`);
  assert.equal(qRes.status, 200);
  const qData = await qRes.json();
  assert.equal(qData.success, true);
  assert.ok(qData.quote.price > 0);

  // Bars endpoint
  const bRes = await fetch(`${baseUrl}/api/market/bars?symbol=BTCUSDT&timeframe=1m&limit=10`);
  assert.equal(bRes.status, 200);
  const bData = await bRes.json();
  assert.equal(bData.success, true);
  assert.ok(Array.isArray(bData.bars));

  // Depth endpoint
  const dRes = await fetch(`${baseUrl}/api/market/depth?symbol=BTCUSDT&limit=5`);
  assert.equal(dRes.status, 200);
  const dData = await dRes.json();
  assert.equal(dData.success, true);
  assert.ok(Array.isArray(dData.bids));
  assert.ok(Array.isArray(dData.asks));

  // Market status endpoint
  const sRes = await fetch(`${baseUrl}/api/market/status`);
  assert.equal(sRes.status, 200);
  const sData = await sRes.json();
  assert.equal(sData.success, true);
  assert.equal(sData.phase, "PHASE_1_MARKET_DATA_ENGINE");
  assert.ok(sData.providers.binance);
  assert.ok(sData.providers.alpaca);
  assert.ok(sData.providers.universal);
  assert.ok(sData.timeseries);
  assert.ok(sData.sanitizer);
});
