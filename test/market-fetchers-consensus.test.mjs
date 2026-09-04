import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { fetchIexQuote, fetchIexHistorical } from "../src/market-fetcher-iex.mjs";
import { fetchPolygonQuote, fetchPolygonHistorical } from "../src/market-fetcher-polygon.mjs";
import { fetchBinanceQuote, fetchCoingeckoQuote } from "../src/market-fetcher-crypto.mjs";
import { getConsensusPrice, getConsensusReport } from "../src/market-consensus.mjs";
import { app } from "../server.mjs";

test("Week 2: IEX Cloud fetcher throws when token missing and parses valid mock quote and history", async () => {
  // Missing token throws
  const savedToken = process.env.IEX_CLOUD_TOKEN;
  delete process.env.IEX_CLOUD_TOKEN;
  await assert.rejects(
    () => fetchIexQuote("AAPL"),
    /IEX_CLOUD_TOKEN not set/
  );

  // Mock fetchFn
  const mockFetch = async (url) => {
    if (url.includes("/chart/")) {
      return {
        ok: true,
        json: async () => [
          { date: "2026-09-01", close: 180.5, volume: 1000000 },
          { date: "2026-09-02", close: 182.0, volume: 1200000 }
        ]
      };
    }
    return {
      ok: true,
      json: async () => ({
        companyName: "Apple Inc.",
        latestPrice: 182.5,
        iexBidPrice: 182.4,
        iexAskPrice: 182.6,
        iexBidSize: 100,
        iexAskSize: 200,
        latestVolume: 50000000,
        latestUpdate: Date.now()
      })
    };
  };

  const quote = await fetchIexQuote("AAPL", { token: "pk_test_token", fetchFn: mockFetch });
  assert.equal(quote.symbol, "AAPL");
  assert.equal(quote.price, 182.5);
  assert.equal(quote.bid, 182.4);
  assert.equal(quote.ask, 182.6);
  assert.equal(quote.source, "iex-cloud");

  const history = await fetchIexHistorical("AAPL", "1m", { token: "pk_test_token", fetchFn: mockFetch });
  assert.equal(history.length, 2);
  assert.equal(history[1].close, 182.0);

  if (savedToken) process.env.IEX_CLOUD_TOKEN = savedToken;
});

test("Week 2: Polygon.io fetcher throws when key missing and parses stock and crypto snapshots", async () => {
  const savedKey = process.env.POLYGON_API_KEY;
  delete process.env.POLYGON_API_KEY;
  await assert.rejects(
    () => fetchPolygonQuote("AAPL"),
    /POLYGON_API_KEY not set/
  );

  const mockFetch = async (url) => {
    if (url.includes("/prev?")) {
      return {
        ok: true,
        json: async () => ({
          status: "OK",
          results: [{ c: 185.0, o: 183.0, h: 186.0, l: 182.0, v: 45000000 }]
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{
          last_quote: {
            price: 64250.75,
            bid: 64249.0,
            ask: 64251.5,
            bid_size: 2.5,
            ask_size: 3.1,
            last_updated: Date.now()
          }
        }]
      })
    };
  };

  const quote = await fetchPolygonQuote("BTC/USD", { apiKey: "polygon_test_key", fetchFn: mockFetch });
  assert.equal(quote.price, 64250.75);
  assert.equal(quote.bid, 64249.0);
  assert.equal(quote.ask, 64251.5);
  assert.equal(quote.source, "polygon");

  const prevBar = await fetchPolygonHistorical("AAPL", { apiKey: "polygon_test_key", fetchFn: mockFetch });
  assert.equal(prevBar.results[0].c, 185.0);

  if (savedKey) process.env.POLYGON_API_KEY = savedKey;
});

test("Week 2: Binance & CoinGecko crypto fetchers return normalized quotes with float parsing", async () => {
  const mockBinanceFetch = async () => ({
    ok: true,
    json: async () => ({
      symbol: "BTCUSDT",
      lastPrice: "64500.50",
      bidPrice: "64499.00",
      askPrice: "64501.00",
      bidQty: "1.250",
      askQty: "2.500",
      volume: "15200.45",
      quoteVolume: "980000000.0",
      priceChangePercent: "2.45"
    })
  });

  const bQuote = await fetchBinanceQuote("BTC/USDT", { fetchFn: mockBinanceFetch });
  assert.equal(bQuote.symbol, "BTCUSDT");
  assert.equal(typeof bQuote.price, "number");
  assert.equal(bQuote.price, 64500.50);
  assert.equal(bQuote.bid, 64499.00);
  assert.equal(bQuote.ask, 64501.00);
  assert.equal(bQuote.volume_24h, 15200.45);
  assert.equal(bQuote.source, "binance");

  const mockCoingeckoFetch = async () => ({
    ok: true,
    json: async () => ({
      bitcoin: {
        usd: 64510.00,
        usd_market_cap: 1270000000000
      }
    })
  });

  const cgQuote = await fetchCoingeckoQuote("BTC", { fetchFn: mockCoingeckoFetch });
  assert.equal(cgQuote.price, 64510.00);
  assert.equal(cgQuote.marketcap, 1270000000000);
  assert.equal(cgQuote.source, "coingecko");
});

test("Week 2: Consensus Layer calculates median, mean, spread, and handles multi-provider quorum", async () => {
  // Test with custom providers returning distinct prices: [64400, 64500, 64600] -> median 64500
  const customProviders = [
    Promise.resolve({ source: "p1", price: 64400 }),
    Promise.resolve({ source: "p2", price: 64500 }),
    Promise.resolve({ source: "p3", price: 64600 })
  ];

  const medianPrice = await getConsensusPrice("BTCUSDT", { providers: customProviders });
  assert.equal(medianPrice, 64500);

  // Detailed report
  const customProvidersEven = [
    Promise.resolve({ source: "p1", price: 100 }),
    Promise.resolve({ source: "p2", price: 102 }),
    Promise.resolve({ source: "p3", price: 104 }),
    Promise.resolve({ source: "p4", price: 106 })
  ];

  const report = await getConsensusReport("AAPL", { providers: customProvidersEven });
  assert.equal(report.median, 103); // (102 + 104) / 2
  assert.equal(report.min, 100);
  assert.equal(report.max, 106);
  assert.equal(report.spread, 6);
  assert.equal(report.providerCount, 4);

  // Fallback price when no providers respond
  const emptyReport = await getConsensusReport("TEST", {
    providers: [Promise.reject(new Error("down"))],
    fallbackPrice: 50.0
  });
  assert.equal(emptyReport.consensusPrice, 50.0);

  // Error when all fail and no fallback
  await assert.rejects(
    () => getConsensusReport("FAIL", { providers: [Promise.reject(new Error("fail"))] }),
    /No price data for FAIL/
  );
});

test("Week 2: Server exposes IEX, Polygon, Crypto, and Consensus REST API endpoints", async () => {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. POST /api/market/consensus with custom mock payload or fallback
    const postRes = await fetch(`${baseUrl}/api/market/consensus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "ETHUSDT",
        fallbackPrice: 3450.25
      })
    });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.success, true);
    assert.ok(postData.consensus);
    assert.ok(postData.consensus.consensusPrice > 0);

    // 2. GET /api/market/consensus
    const getRes = await fetch(`${baseUrl}/api/market/consensus?symbol=BTCUSDT`);
    // Will either succeed if Binance/CoinGecko network reachable or return 502 with structured message
    assert.ok([200, 502].includes(getRes.status));

    // 3. GET /api/market/iex/quote without token returns 502 graceful error
    const iexRes = await fetch(`${baseUrl}/api/market/iex/quote?symbol=AAPL`);
    assert.equal(iexRes.status, 502);
    const iexData = await iexRes.json();
    assert.equal(iexData.success, false);

    // 4. GET /api/market/polygon/quote without key returns 502 graceful error
    const polyRes = await fetch(`${baseUrl}/api/market/polygon/quote?symbol=AAPL`);
    assert.equal(polyRes.status, 502);
    const polyData = await polyRes.json();
    assert.equal(polyData.success, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
