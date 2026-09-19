// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import { globalLifecycle, LIFECYCLE_STATES } from "../src/core/lifecycle.mjs";
import { globalEventBus } from "../src/core/event-bus.mjs";
import { classifyError, RetryableError, FatalError, DataUnsafeError, RiskBreachError } from "../src/core/errors.mjs";
import { autonomousClosedLoopSystem } from "../src/core/autonomous-closed-loop-trading-system.mjs";
import { unifiedRealMarketBrokerHub } from "../src/broker/unified-real-market-broker-hub.mjs";

test("Core Concept Improvements Suite", async (t) => {
  let server;
  let baseUrl;

  await t.test("Setup test HTTP server", async () => {
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  await t.test("1. Safety Boundary: ENABLE_LIVE_TRADING='false' strictly blocks live orders", async () => {
    const prevEnable = process.env.ENABLE_LIVE_TRADING;
    const prevLive = process.env.LIVE_TRADING_ENABLED;

    try {
      // Explicitly set string "false" - which previously bypassed truthy checks
      process.env.ENABLE_LIVE_TRADING = "false";
      process.env.LIVE_TRADING_ENABLED = "false";

      // 1. Check server.mjs /api/orders
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "AAPL", side: "BUY", quantity: 1, mode: "live" })
      });
      assert.equal(res.status, 403, "Live order must be forbidden when ENABLE_LIVE_TRADING='false'");
      const data = await res.json();
      assert.match(data.error, /Live trading disabled/i);

      // 2. Check unifiedRealMarketBrokerHub.dhan
      await assert.rejects(
        async () => unifiedRealMarketBrokerHub.dhan.placeOrder({ symbol: "AAPL", side: "BUY", quantity: 1, price: 150 }),
        /Live trading is disabled/i
      );
    } finally {
      if (prevEnable !== undefined) process.env.ENABLE_LIVE_TRADING = prevEnable;
      else delete process.env.ENABLE_LIVE_TRADING;
      if (prevLive !== undefined) process.env.LIVE_TRADING_ENABLED = prevLive;
      else delete process.env.LIVE_TRADING_ENABLED;
    }
  });

  await t.test("2. Lifecycle State Machine: Transition & REST Endpoints", async () => {
    // Ensure state transitions cleanly: INITIALIZING -> BOOTING -> ONLINE
    if (globalLifecycle.getState() === LIFECYCLE_STATES.INITIALIZING) {
      globalLifecycle.transitionTo(LIFECYCLE_STATES.BOOTING);
      globalLifecycle.transitionTo(LIFECYCLE_STATES.ONLINE);
    } else if (globalLifecycle.getState() === LIFECYCLE_STATES.PAUSED) {
      globalLifecycle.resume();
    }

    // GET /api/lifecycle/status
    const statusRes = await fetch(`${baseUrl}/api/lifecycle/status`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.service, "AifieLifecycleManager");

    // POST /api/lifecycle/pause
    const pauseRes = await fetch(`${baseUrl}/api/lifecycle/pause`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Testing pause" })
    });
    assert.equal(pauseRes.status, 200);
    const pauseData = await pauseRes.json();
    assert.equal(pauseData.lifecycle.currentState, LIFECYCLE_STATES.PAUSED);

    // Verify orders are rejected when PAUSED
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "AAPL", side: "BUY", quantity: 1, mode: "paper" })
    });
    assert.equal(orderRes.status, 403);
    const orderErr = await orderRes.json();
    assert.match(orderErr.error, /lifecycle state is PAUSED/i);

    // POST /api/lifecycle/resume
    const resumeRes = await fetch(`${baseUrl}/api/lifecycle/resume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Testing resume" })
    });
    assert.equal(resumeRes.status, 200);
    const resumeData = await resumeRes.json();
    assert.equal(resumeData.lifecycle.currentState, LIFECYCLE_STATES.ONLINE);

    // POST /api/lifecycle/emergency-halt
    const haltRes = await fetch(`${baseUrl}/api/lifecycle/emergency-halt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Testing emergency halt" })
    });
    assert.equal(haltRes.status, 200);
    assert.equal(globalLifecycle.getState(), LIFECYCLE_STATES.EMERGENCY_HALTED);

    // Verify orders rejected when EMERGENCY_HALTED
    const haltedOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "AAPL", side: "BUY", quantity: 1, mode: "paper" })
    });
    assert.equal(haltedOrderRes.status, 403);

    // Resume for subsequent tests
    globalLifecycle.transitionTo(LIFECYCLE_STATES.INITIALIZING);
    globalLifecycle.transitionTo(LIFECYCLE_STATES.BOOTING);
    globalLifecycle.transitionTo(LIFECYCLE_STATES.ONLINE);
    assert.equal(globalLifecycle.isExecutionAllowed(), true);
  });

  await t.test("3. Central Event Bus: Publishing, Queries & Order Flow Integration", async () => {
    globalEventBus.clear();

    // GET /api/event-bus/status
    const busStatusRes = await fetch(`${baseUrl}/api/event-bus/status`);
    assert.equal(busStatusRes.status, 200);
    const busStatus = await busStatusRes.json();
    assert.equal(busStatus.service, "AifieEventBus");

    // POST /api/event-bus/publish
    const pubRes = await fetch(`${baseUrl}/api/event-bus/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "TEST_METRIC_EVENT",
        payload: { testMetric: 42.5 },
        source: "TestSuite"
      })
    });
    assert.equal(pubRes.status, 200);

    // Place a paper order and verify event bus records ORDER_SUBMITTED and ORDER_FILLED
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 2, price: 175.50, mode: "paper" })
    });
    assert.equal(orderRes.status, 200);

    // GET /api/event-bus/history
    const historyRes = await fetch(`${baseUrl}/api/event-bus/history?eventType=ORDER_FILLED`);
    assert.equal(historyRes.status, 200);
    const historyData = await historyRes.json();
    assert.ok(historyData.events.length >= 1, "ORDER_FILLED event must be recorded in event bus");
    assert.equal(historyData.events[0].eventType, "ORDER_FILLED");

    // Verify replay helper
    let replayedCount = 0;
    await globalEventBus.replay({ eventType: "ORDER_FILLED" }, (evt) => {
      if (evt.eventType === "ORDER_FILLED") replayedCount++;
    });
    assert.ok(replayedCount >= 1, "Replay should yield recorded events");
  });

  await t.test("4. Autonomous Closed-Loop Engine: Dynamic Indicators & Deterministic Feedback", async () => {
    // Run autonomous cycle with explicit indicators and deterministic exit outcome
    const cycleReport = await autonomousClosedLoopSystem.runAutonomousCycle({
      symbol: "NVDA",
      currentPrice: 120.0,
      signal: "BUY",
      strategyId: "TEST_ALPHA_V1",
      accountEquity: 100000,
      indicators: {
        adx: 42, // Strong trend
        rsi: 68,
        volatility: 0.25
      },
      exitPrice: 125.0, // Guaranteed profit exit
      isWin: true
    });

    assert.ok(cycleReport.cycleId.startsWith("AUTOCYCLE_"));
    assert.equal(cycleReport.symbol, "NVDA");
    assert.equal(cycleReport.orderResult.status, "FILLED");
    assert.equal(cycleReport.regime, "TRENDING_BULLISH"); // ADX 42 & RSI 68 => TRENDING_BULLISH

    // Verify learned belief priors updated
    const priors = cycleReport.learnedBeliefs;
    const testPrior = priors.find(p => p.strategyId === "TEST_ALPHA_V1");
    assert.ok(testPrior, "Learned priors must track strategy outcome");
    assert.ok(testPrior.alpha > 1, "Alpha belief count must increment on win");
  });

  await t.test("5. Error Taxonomy & Self-Healing Classification", async () => {
    const retryable = classifyError(new RetryableError("Network socket closed"));
    assert.equal(retryable.type, "RETRYABLE");
    assert.equal(retryable.isRetryable, true);

    const dataUnsafe = classifyError(new DataUnsafeError("Timestamp staleness > 60s"));
    assert.equal(dataUnsafe.type, "DATA_UNSAFE");
    assert.equal(dataUnsafe.isRetryable, false);

    const riskBreach = classifyError(new RiskBreachError("Drawdown exceeded 3.5%"));
    assert.equal(riskBreach.type, "RISK_BREACH");

    const fatal = classifyError(new FatalError("Memory vault corruption"));
    assert.equal(fatal.type, "FATAL");

    // Network error heuristic
    const netErr = classifyError(new Error("fetch failed: ECONNRESET"));
    assert.equal(netErr.type, "RETRYABLE");
  });

  await t.test("Teardown HTTP server", async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
