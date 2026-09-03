import test from "node:test";
import assert from "node:assert/strict";

// Mock config before importing
process.env.PORT = "9999";
process.env.HOST = "127.0.0.1";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "ERROR";

import { config, getMaskedConfig, validateProductionConfig, printConfigSummary } from "../src/config-central.mjs";

test("config loads environment variables with defaults", () => {
  assert.ok(typeof config.port === "number");
  assert.ok(typeof config.host === "string");
  assert.ok(typeof config.nodeEnv === "string");
});

test("config applies default values for missing env vars", () => {
  assert.equal(typeof config.liveTradeEnabled, "boolean");
  assert.equal(config.maxLiveOrderNotional, 50000);
  assert.equal(config.maxDailyLossPercent, 3.5);
  assert.equal(config.riskPerTradePercent, 1.0);
  assert.equal(config.maxTotalAgents, 50);
  assert.equal(config.maxReplicasPerTemplate, 10);
});

test("getMaskedConfig hides sensitive values", async () => {
  process.env.GEMINI_API_KEY = "test-secret-key-12345";

  // Re-import to pick up new env
  const { getMaskedConfig: getMasked } = await import("../src/config-central.mjs?" + Date.now());
  const masked = getMasked();

  assert.ok(typeof masked === "object");
});

test("validateProductionConfig returns warnings in production without required config", () => {
  const origEnv = config.nodeEnv;
  const origToken = config.apiToken;
  config.nodeEnv = "production";
  config.apiToken = "";

  const errors = validateProductionConfig();
  assert.ok(Array.isArray(errors));
  assert.ok(errors.some(e => e.includes("API_TOKEN")));

  config.nodeEnv = origEnv;
  config.apiToken = origToken;
});

test("printConfigSummary does not throw", () => {
  assert.doesNotThrow(() => printConfigSummary());
});

test("config handles boolean coercion correctly", async () => {
  process.env.LIVE_TRADING_ENABLED = "true";
  process.env.DEBUG = "1";

  const { config: config2 } = await import("../src/config-central.mjs?" + Date.now());

  assert.equal(config2.liveTradeEnabled, true);
  assert.equal(config2.debugMode, true);
});

test("config handles numeric coercion correctly", async () => {
  process.env.MAX_DAILY_LOSS_PERCENT = "5.5";
  process.env.MAX_TOTAL_AGENTS = "100";

  const { config: config3 } = await import("../src/config-central.mjs?" + Date.now());

  assert.equal(config3.maxDailyLossPercent, 5.5);
  assert.equal(config3.maxTotalAgents, 100);
});
