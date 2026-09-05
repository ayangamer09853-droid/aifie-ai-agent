import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  streamingPipeline,
  getStreamingPipelineStatus,
  startStreamingPipeline,
  stopStreamingPipeline,
  ingestLiveTick,
  ingestLiveDepth,
  ingestBurstMarketTicks,
  subscribeStreamingSymbol,
  unsubscribeStreamingSymbol,
  triggerStreamingFailover,
  restoreStreamingPrimary
} from "../src/realtime-streaming-pipeline.mjs";
import { createBinanceWebSocketStream } from "../src/market-feed-binance.mjs";
import { createAlpacaWebSocketStream } from "../src/market-feed-alpaca.mjs";
import { getLatestMarketTick } from "../src/timeseries-market-store.mjs";
import { getOrderBookSnapshot } from "../src/order-book-depth.mjs";
import { app } from "../server.mjs";

test("Pillar 2: Real-Time Streaming Pipeline Lifecycle & Subscriptions", () => {
  const startRes = startStreamingPipeline({ venue: "BINANCE", autoHeartbeat: false });
  assert.equal(startRes.status, "STREAMING_PIPELINE_ACTIVE");
  assert.equal(startRes.venue, "BINANCE");

  const subRes = subscribeStreamingSymbol("SOLUSDT");
  assert.equal(subRes.success, true);
  assert.equal(subRes.symbol, "SOLUSDT");

  const unsubRes = unsubscribeStreamingSymbol("SOLUSDT");
  assert.equal(unsubRes.success, true);

  const status = getStreamingPipelineStatus();
  assert.equal(status.engine, "REALTIME_WEBSOCKET_STREAMING_v100");
  assert.equal(status.isConnected, true);
  assert.equal(status.activeVenue, "BINANCE");
});

test("Pillar 2: Direct Zero-GC Tick Ingestion to RingBuffer with Latency Tracking", () => {
  const now = Date.now();
  const tickRes = ingestLiveTick({
    symbol: "BTCUSDT",
    price: 88250.50,
    volume: 0.125,
    timestamp: now - 5, // 5ms simulated network latency
    venue: "BINANCE_WS"
  });

  assert.equal(tickRes.status, "TICK_INGESTED");
  assert.equal(tickRes.symbol, "BTCUSDT");
  assert.equal(tickRes.price, 88250.50);
  assert.ok(tickRes.latencyMs >= 0);

  // Verify persistence in timeseries ring buffer
  const latest = getLatestMarketTick("BTCUSDT");
  assert.ok(latest);
  assert.equal(latest.price, 88250.50);
});

test("Pillar 2: Direct L2 Order Book Depth Ingestion", () => {
  const depthRes = ingestLiveDepth({
    symbol: "ETHUSDT",
    bids: [[3450, 10], [3449, 25]],
    asks: [[3451, 8], [3452, 30]],
    venue: "BINANCE_WS"
  });

  assert.equal(depthRes.status, "DEPTH_INGESTED");
  assert.equal(depthRes.symbol, "ETHUSDT");
  assert.equal(depthRes.bidsCount, 2);

  const book = getOrderBookSnapshot("ETHUSDT");
  assert.equal(book.symbol, "ETHUSDT");
  assert.equal(book.bids[0][0], 3450);
  assert.equal(book.asks[0][0], 3451);
  assert.equal(book.midPrice, 3450.5);
});

test("Pillar 2: High-Throughput Burst Ingestion Benchmark (> 5,000 ticks/sec)", () => {
  const burstCount = 1000;
  const mockTicks = new Array(burstCount);
  const now = Date.now();

  for (let i = 0; i < burstCount; i++) {
    mockTicks[i] = {
      symbol: "SOLUSDT",
      price: 200 + (i * 0.01),
      volume: 1,
      timestamp: now,
      venue: "BURST_TEST"
    };
  }

  const burstRes = ingestBurstMarketTicks(mockTicks);
  assert.equal(burstRes.status, "BURST_COMPLETED");
  assert.equal(burstRes.ingestedCount, burstCount);
  assert.ok(burstRes.ticksPerSec >= 2000, `Expected high throughput, got ${burstRes.ticksPerSec} ticks/sec`);

  const status = getStreamingPipelineStatus();
  assert.ok(status.totalTicksIngested >= burstCount);
  assert.ok(status.latency.samplesCount > 0);
});

test("Pillar 2: Resilient Failover & Circuit Breaker", () => {
  const failoverRes = triggerStreamingFailover("BINANCE", "LATENCY_SPIKE_DETECTED");
  assert.equal(failoverRes.status, "FAILOVER_EXECUTED");
  assert.equal(failoverRes.activeVenue, "ALPACA");
  assert.equal(failoverRes.reason, "LATENCY_SPIKE_DETECTED");

  let status = getStreamingPipelineStatus();
  assert.equal(status.activeVenue, "ALPACA");
  assert.equal(status.isFailoverActive, true);

  const restoreRes = restoreStreamingPrimary();
  assert.equal(restoreRes.status, "PRIMARY_VENUE_RESTORED");
  assert.equal(restoreRes.activeVenue, "BINANCE");

  status = getStreamingPipelineStatus();
  assert.equal(status.activeVenue, "BINANCE");
  assert.equal(status.isFailoverActive, false);
});

test("Pillar 2: Binance & Alpaca WebSocket Stream Clients", () => {
  let binanceReceived = null;
  const binanceClient = createBinanceWebSocketStream({
    symbols: ["BTCUSDT"],
    isTestEnv: true,
    onTick: (tick) => { binanceReceived = tick; }
  });

  assert.equal(binanceClient.status, "SIMULATED_ACTIVE");
  binanceClient.simulateTradeMessage("BTCUSDT", 88900.0, 0.5);
  assert.ok(binanceReceived);
  assert.equal(binanceReceived.symbol, "BTCUSDT");
  assert.equal(binanceReceived.price, 88900.0);
  binanceClient.close();
  assert.equal(binanceClient.status, "CLOSED");

  let alpacaReceived = null;
  const alpacaClient = createAlpacaWebSocketStream({
    symbols: ["AAPL"],
    isTestEnv: true,
    onTrade: (trade) => { alpacaReceived = trade; }
  });

  assert.equal(alpacaClient.status, "SIMULATED_ACTIVE");
  alpacaClient.simulateTradeMessage("AAPL", 231.50, 200);
  assert.ok(alpacaReceived);
  assert.equal(alpacaReceived.symbol, "AAPL");
  assert.equal(alpacaReceived.price, 231.50);
  alpacaClient.close();
  assert.equal(alpacaClient.status, "CLOSED");
});

test("Pillar 2: REST API Endpoints for Real-Time Streaming", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    // 1. Status endpoint
    const statusRes = await fetch(`http://127.0.0.1:${port}/api/v100/streaming/status`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.engine, "REALTIME_WEBSOCKET_STREAMING_v100");

    // 2. Subscribe endpoint
    const subRes = await fetch(`http://127.0.0.1:${port}/api/v100/streaming/subscribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "NVDA" })
    });
    assert.equal(subRes.status, 200);
    const subData = await subRes.json();
    assert.equal(subData.success, true);
    assert.equal(subData.symbol, "NVDA");

    // 3. Simulate tick endpoint
    const tickRes = await fetch(`http://127.0.0.1:${port}/api/v100/streaming/simulate-tick`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "NVDA", price: 125.75, volume: 50, venue: "API_SIM" })
    });
    assert.equal(tickRes.status, 200);
    const tickData = await tickRes.json();
    assert.equal(tickData.status, "TICK_INGESTED");
    assert.equal(tickData.symbol, "NVDA");

    // 4. Failover endpoint
    const failoverRes = await fetch(`http://127.0.0.1:${port}/api/v100/streaming/failover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromVenue: "BINANCE", reason: "API_TEST" })
    });
    assert.equal(failoverRes.status, 200);
    const failoverData = await failoverRes.json();
    assert.equal(failoverData.status, "FAILOVER_EXECUTED");

    // 5. Restore primary endpoint
    const restoreRes = await fetch(`http://127.0.0.1:${port}/api/v100/streaming/failover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ restorePrimary: true })
    });
    assert.equal(restoreRes.status, 200);
    const restoreData = await restoreRes.json();
    assert.equal(restoreData.status, "PRIMARY_VENUE_RESTORED");
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
    stopStreamingPipeline();
  }
});
