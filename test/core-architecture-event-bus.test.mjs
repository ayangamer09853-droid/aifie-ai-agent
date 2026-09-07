// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { AifieEventBus, globalEventBus } from "../src/core/event-bus.mjs";
import { AifieLifecycleManager, LIFECYCLE_STATES } from "../src/core/lifecycle.mjs";
import { RetryableError, FatalError, DataUnsafeError, RiskBreachError, classifyError } from "../src/core/errors.mjs";
import { AIFIE_CONFIG, getMaskedConfig } from "../src/core/config.mjs";

test("AifieEventBus: publishes, subscribes, and records events in ring buffer", async () => {
  const bus = new AifieEventBus({ maxHistory: 5 });
  const received = [];

  const unsubscribe = bus.subscribe("MARKET_TICK", (evt) => {
    received.push(evt);
  });

  bus.publish("MARKET_TICK", { symbol: "BTCUSDT", price: 65000 });
  bus.publish("MARKET_TICK", { symbol: "ETHUSDT", price: 3500 });
  bus.publish("SIGNAL_GENERATED", { symbol: "BTCUSDT", signal: "BUY" });

  assert.equal(received.length, 2);
  assert.equal(received[0].payload.symbol, "BTCUSDT");
  assert.equal(received[1].payload.symbol, "ETHUSDT");

  const history = bus.queryHistory({ eventType: "MARKET_TICK" });
  assert.equal(history.length, 2);

  unsubscribe();
  bus.publish("MARKET_TICK", { symbol: "SOLUSDT", price: 150 });
  assert.equal(received.length, 2); // Unsubscribed, no new deliveries
});

test("AifieLifecycleManager: enforces valid state transitions and tracks history", () => {
  const lifecycle = new AifieLifecycleManager();
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.INITIALIZING);

  lifecycle.transitionTo(LIFECYCLE_STATES.BOOTING);
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.BOOTING);

  lifecycle.transitionTo(LIFECYCLE_STATES.ONLINE);
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.ONLINE);

  // Invalid transition directly to STOPPED from ONLINE
  assert.throws(() => {
    lifecycle.transitionTo(LIFECYCLE_STATES.STOPPED);
  }, /Invalid lifecycle transition/);

  // Emergency halt
  lifecycle.emergencyHalt("Test crisis");
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.EMERGENCY_HALTED);
});

test("Aifie Error Hierarchy: correctly classifies errors and recovery strategies", () => {
  const retryable = new RetryableError("Network socket timed out");
  const dataUnsafe = new DataUnsafeError("Market quote timestamp is stale by 45s");
  const riskBreach = new RiskBreachError("Max position notional exceeded");

  assert.equal(classifyError(retryable).type, "RETRYABLE");
  assert.equal(classifyError(dataUnsafe).type, "DATA_UNSAFE");
  assert.equal(classifyError(riskBreach).type, "RISK_BREACH");
  assert.equal(classifyError(new Error("ECONNRESET by peer")).type, "RETRYABLE");
});

test("Aifie Configuration: provides immutable configuration and safe masked dump", () => {
  assert.equal(AIFIE_CONFIG.TRADING_MODE, "paper");
  assert.equal(AIFIE_CONFIG.USER_EMAIL, "m69249661@gmail.com");

  const masked = getMaskedConfig();
  assert.equal(masked.userEmail, "m69249661@gmail.com");
  assert.equal(masked.tradingMode, "paper");
  assert.equal(masked.hasOwnProperty("TELEGRAM_BOT_TOKEN"), false);
});
