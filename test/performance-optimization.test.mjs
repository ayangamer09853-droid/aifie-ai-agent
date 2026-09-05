import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { AsyncMutex, createPaperState, setQuote, placePaperOrder } from "../src/paper-engine.mjs";
import { MarketCache, marketCache } from "../src/market-cache.mjs";
import { createStateStore } from "../src/state-store.mjs";
import { app } from "../server.mjs";

test("AsyncMutex serializes concurrent tasks and prevents race conditions", async () => {
  const mutex = new AsyncMutex();
  let counter = 0;
  const executionOrder = [];

  const task = async (id) => {
    return mutex.runExclusive(async () => {
      const current = counter;
      // Simulate non-trivial asynchronous work
      await new Promise(r => setTimeout(r, 10));
      counter = current + 1;
      executionOrder.push(id);
      return counter;
    });
  };

  const results = await Promise.all([task(1), task(2), task(3), task(4), task(5)]);
  assert.equal(counter, 5);
  assert.deepEqual(results, [1, 2, 3, 4, 5]);
  assert.equal(executionOrder.length, 5);
});

test("MarketCache deduplicates concurrent in-flight requests (SingleFlight)", async () => {
  const cache = new MarketCache({ defaultTtlMs: 200, maxEntries: 5 });
  let callCount = 0;

  const fetcher = async () => {
    callCount++;
    await new Promise(r => setTimeout(r, 25));
    return { price: 150.25 };
  };

  // Launch 10 concurrent requests for the same key
  const promises = Array.from({ length: 10 }, () => cache.getOrFetch("AAPL", fetcher, 200));
  const results = await Promise.all(promises);

  assert.equal(callCount, 1, "underlying fetcher should be invoked exactly once for in-flight requests");
  assert.ok(results.every(r => r.price === 150.25));

  const telemetry = cache.getTelemetry();
  assert.equal(telemetry.deduped, 9);
  assert.equal(telemetry.misses, 1);
});

test("MarketCache respects TTL expiration and LRU eviction", async () => {
  const cache = new MarketCache({ defaultTtlMs: 50, maxEntries: 2 });
  cache.set("A", { val: 1 }, 50);
  cache.set("B", { val: 2 }, 50);

  assert.deepEqual(cache.get("A"), { val: 1 });
  assert.deepEqual(cache.get("B"), { val: 2 });

  // Adding 3rd item evicts oldest (A was accessed before B, so B is newest, A is evicted next if we touch B)
  cache.get("B");
  cache.set("C", { val: 3 }, 50);

  // A should be evicted due to capacity 2
  assert.equal(cache.get("A"), null);
  assert.deepEqual(cache.get("B"), { val: 2 });
  assert.deepEqual(cache.get("C"), { val: 3 });

  // Wait for TTL expiry
  await new Promise(r => setTimeout(r, 60));
  assert.equal(cache.get("B"), null);
  assert.equal(cache.get("C"), null);
});

test("StateStore enforces maxOrders bounds and supports async persistence", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "aifie-perf-"));
  const filePath = join(tempDir, "state.json");

  try {
    const store = createStateStore(filePath, { maxOrders: 5 });

    for (let i = 1; i <= 10; i++) {
      store.appendOrder({
        id: `order-${i}`,
        symbol: "AAPL",
        side: "buy",
        quantity: i,
        status: "simulated"
      });
    }

    const loaded = store.loadOrders();
    assert.equal(loaded.length, 5, "should retain only the most recent 5 orders");
    assert.equal(loaded[0].id, "order-6");
    assert.equal(loaded[4].id, "order-10");

    // Test appendOrderAsync
    await store.appendOrderAsync({
      id: "order-11",
      symbol: "MSFT",
      side: "buy",
      quantity: 1,
      status: "simulated"
    });

    const afterAsync = store.loadOrders();
    assert.equal(afterAsync.length, 5);
    assert.equal(afterAsync[4].id, "order-11");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("PaperEngine handles high concurrency under Mutex without balance discrepancies", async () => {
  const paper = createPaperState();
  const mutex = new AsyncMutex();
  setQuote(paper, { symbol: "NVDA", price: 100 });

  const numOrders = 20;
  const tasks = Array.from({ length: numOrders }, (_, i) => {
    return mutex.runExclusive(async () => {
      return placePaperOrder(paper, {
        symbol: "NVDA",
        side: "buy",
        quantity: 1
      });
    });
  });

  const fills = await Promise.all(tasks);
  assert.equal(fills.length, numOrders);
  assert.equal(paper.account.positions.NVDA.quantity, numOrders);
  assert.ok(paper.account.cash < 100000);
});

test("Server serves /api/performance/telemetry and supports HTTP ETag 304 caching", async () => {
  const server = createServer(app);
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 1. Performance Telemetry
    const telemRes = await fetch(`${baseUrl}/api/performance/telemetry`);
    assert.equal(telemRes.status, 200);
    const telemetry = await telemRes.json();
    assert.equal(telemetry.success, true);
    assert.ok(telemetry.eventLoop);
    assert.ok(telemetry.memory);
    assert.ok(telemetry.orders);
    assert.ok(telemetry.marketCache);

    // 2. ETag Caching on Dashboard
    const initialDash = await fetch(`${baseUrl}/`);
    assert.equal(initialDash.status, 200);
    const etag = initialDash.headers.get("etag");
    assert.ok(etag, "dashboard should return an ETag header");

    const cachedDash = await fetch(`${baseUrl}/`, {
      headers: { "if-none-match": etag }
    });
    assert.equal(cachedDash.status, 304, "subsequent request with matching ETag should return 304 Not Modified");
  } finally {
    server.closeAllConnections?.();
    await new Promise(r => server.close(r));
  }
});
