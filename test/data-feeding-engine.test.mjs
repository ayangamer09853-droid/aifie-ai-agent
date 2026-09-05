// test/data-feeding-engine.test.mjs
// Unit Test Suite: Multi-Channel Data Feeding & Ingestion System

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DataFeedingEngine, dataFeedingEngine } from "../src/ingestion/data-feeding-engine.mjs";
import { dispatchV1Route } from "../src/api/v1-router.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";

describe("Data Feeding Engine: Multi-Channel Ingestion & Gateways", () => {
  it("1. Ingests valid real-time market ticks and updates quotes", () => {
    const engine = new DataFeedingEngine({ maxLedgerSize: 50 });
    const result = engine.feedTick({
      symbol: "BTC/USDT",
      price: 68500.50,
      volume: 1.5,
      source: "TEST_TICK"
    });

    assert.equal(result.success, true);
    assert.ok(result.correlationId);
    assert.equal(typeof result.latencyMs, "number");

    const quote = engine.getQuote("BTC/USDT");
    assert.ok(quote);
    assert.equal(quote.price, 68500.50);
    assert.equal(quote.volume, 1.5);
  });

  it("2. Rejects invalid market ticks with non-positive price or empty symbol", () => {
    const engine = new DataFeedingEngine();
    const badPrice = engine.feedTick({ symbol: "ETH/USDT", price: -50 });
    assert.equal(badPrice.success, false);
    assert.equal(badPrice.reason, "INVALID_PRICE");

    const badSym = engine.feedTick({ symbol: "", price: 100 });
    assert.equal(badSym.success, false);
    assert.equal(badSym.reason, "INVALID_SYMBOL");
  });

  it("3. Ingests OHLCV candle and enforces price envelope sanity", () => {
    const engine = new DataFeedingEngine();
    const valid = engine.feedCandle({
      symbol: "SOL/USDT",
      open: 150,
      high: 155,
      low: 148,
      close: 153,
      volume: 200,
      timeframe: "1m"
    });
    assert.equal(valid.success, true);
    assert.ok(valid.correlationId);

    // High less than close violation
    const invalid = engine.feedCandle({
      symbol: "SOL/USDT",
      open: 150,
      high: 151,
      low: 148,
      close: 153 // Close > High
    });
    assert.equal(invalid.success, false);
    assert.equal(invalid.reason, "OHLCV_VIOLATION");
  });

  it("4. Ingests L2 orderbook depth and detects crossed orderbooks", () => {
    const engine = new DataFeedingEngine();
    const validBook = engine.feedOrderBook({
      symbol: "BTC/USDT",
      bids: [[68400, 1.2], [68350, 3.5]],
      asks: [[68450, 0.8], [68500, 2.1]]
    });
    assert.equal(validBook.success, true);
    assert.equal(validBook.bestBid, 68400);
    assert.equal(validBook.bestAsk, 68450);

    // Crossed book (bid >= ask)
    const crossedBook = engine.feedOrderBook({
      symbol: "BTC/USDT",
      bids: [[68600, 1.0]],
      asks: [[68500, 1.0]]
    });
    assert.equal(crossedBook.success, false);
    assert.equal(crossedBook.reason, "ORDERBOOK_CROSSED");
  });

  it("5. Ingests Macro News and sentiment scoring", () => {
    const engine = new DataFeedingEngine();
    const news = engine.feedNews({
      symbol: "BTC",
      headline: "SEC clears way for direct crypto trading on regulated exchanges",
      sentiment: 0.90,
      impact: "HIGH"
    });
    assert.equal(news.success, true);
    assert.equal(news.record.sentimentLabel, "BULLISH");
    assert.equal(news.record.sentimentScore, 0.90);
  });

  it("6. Dispatches proprietary custom alpha signals", () => {
    const engine = new DataFeedingEngine();
    const signal = engine.feedSignal({
      symbol: "ETH/USDT",
      signal: "BUY",
      confidence: 0.88,
      strategy: "MOMENTUM_BREAKOUT"
    });
    assert.equal(signal.success, true);
    assert.equal(signal.record.signal, "BUY");

    const badSignal = engine.feedSignal({
      symbol: "ETH/USDT",
      signal: "INVALID_ACTION"
    });
    assert.equal(badSignal.success, false);
    assert.equal(badSignal.reason, "INVALID_SIGNAL");
  });

  it("7. Parses and bulk ingests batch data (JSON and CSV)", () => {
    const engine = new DataFeedingEngine();

    // CSV Batch
    const csvResult = engine.feedBatch({
      type: "tick",
      format: "csv",
      rawText: "symbol,price,volume\nBTC/USDT,68500,1.2\nETH/USDT,3450,5.0"
    });
    assert.equal(csvResult.success, true);
    assert.equal(csvResult.accepted, 2);

    // JSON Batch
    const jsonResult = engine.feedBatch({
      type: "tick",
      format: "json",
      records: [
        { symbol: "SOL/USDT", price: 155.0, volume: 10 },
        { symbol: "AAPL", price: 232.0, volume: 50 }
      ]
    });
    assert.equal(jsonResult.success, true);
    assert.equal(jsonResult.accepted, 2);
  });

  it("8. Maintains bounded ring-buffer telemetry and circular ledger", () => {
    const engine = new DataFeedingEngine({ maxLedgerSize: 5 });
    for (let i = 1; i <= 10; i++) {
      engine.feedTick({ symbol: "BTC/USDT", price: 68000 + i, volume: 1 });
    }

    const tel = engine.getTelemetry();
    assert.equal(tel.totalRecordsFed, 10);
    assert.equal(tel.ticksFed, 10);
    assert.equal(tel.ledgerSize, 5); // Ring bounded to capacity

    const recent = engine.getRecentLedger(3);
    assert.equal(recent.length, 3);
  });

  it("9. REST API v1 routes dispatch feed operations smoothly", () => {
    // Status
    const statusRes = dispatchV1Route("/api/v1/feed/status", "GET");
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.plane, "DATA_PLANE");
    assert.ok(statusRes.data.totalRecordsFed !== undefined);

    // POST Tick
    const tickRes = dispatchV1Route("/api/v1/feed/tick", "POST", new URLSearchParams(), {
      symbol: "TEST/USDT",
      price: 123.45,
      volume: 10
    });
    assert.equal(tickRes.status, 200);
    assert.equal(tickRes.data.success, true);

    // History
    const histRes = dispatchV1Route("/api/v1/feed/history", "GET");
    assert.equal(histRes.status, 200);
    assert.ok(Array.isArray(histRes.data.ledger));
  });

  it("10. Telegram /feed command parses and executes forward actions", async () => {
    // Parser
    const parsedStatus = parseTelegramCommand("/feed status");
    assert.equal(parsedStatus.command, "/feed");

    const parsedTick = parseTelegramCommand("/feed tick BTC 68900 2.0");
    assert.equal(parsedTick.command, "/feed");

    // Processor
    const paper = { account: { cash: 100000 }, quotes: {} };
    const res = await processTelegramCommand(parsedTick, { paper, orders: [] });
    assert.equal(typeof res, "object");
    assert.ok(res.text.includes("REAL-TIME TICK INGESTED"));
    assert.ok(res.text.includes("68,900"));
    assert.ok(res.replyMarkup?.inline_keyboard?.length >= 2);
  });
});
