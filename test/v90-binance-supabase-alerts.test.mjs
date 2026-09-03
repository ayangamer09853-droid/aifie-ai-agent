import test from "node:test";
import assert from "node:assert/strict";
import { generateBinanceSignature, getBinanceConnectorStatus, buildBinanceOrderPayload, fetchBinanceLiveTicker } from "../src/binance-live-crypto-connector.mjs";
import { getSupabaseDbStatus, syncRecordToSupabase } from "../src/supabase-cloud-db-connector.mjs";
import { evaluateAlertPriority, sendSmartTelegramAlert } from "../src/smart-telegram-alert-filter.mjs";

test("Binance HMAC-SHA256 signature generation is deterministic and zero-dependency", () => {
  const sig1 = generateBinanceSignature("symbol=BTCUSDT&side=BUY&timestamp=1000", "test_secret");
  const sig2 = generateBinanceSignature("symbol=BTCUSDT&side=BUY&timestamp=1000", "test_secret");
  assert.equal(sig1, sig2, "Signature must be deterministic");
  assert.ok(sig1.length === 64, "HMAC-SHA256 hex signature must be 64 chars");

  const sig3 = generateBinanceSignature("symbol=BTCUSDT&side=BUY&timestamp=1000", "different_secret");
  assert.notEqual(sig1, sig3, "Different secrets must produce different signatures");
});

test("Binance Connector status reports engine online with correct metadata", () => {
  const status = getBinanceConnectorStatus();
  assert.equal(status.status, "BINANCE_CONNECTOR_ONLINE");
  assert.equal(status.nativeSignatureEngine, "NODE_CRYPTO_HMAC_SHA256_ZERO_DEP");
  assert.ok(Array.isArray(status.supportedPairs));
  assert.ok(status.supportedPairs.includes("BTCUSDT"));
  assert.ok(status.supportedPairs.includes("ETHUSDT"));
});

test("Binance order payload builds correct HMAC-signed query string", () => {
  process.env.BINANCE_SECRET_KEY = "mock_test_secret_key";
  const payload = buildBinanceOrderPayload({ symbol: "BTCUSDT", side: "BUY", quantity: 0.01 });
  assert.ok(payload.queryString.includes("symbol=BTCUSDT"));
  assert.ok(payload.queryString.includes("side=BUY"));
  assert.ok(payload.queryString.includes("quantity=0.01"));
  assert.ok(payload.signature.length === 64, "Should produce HMAC-SHA256 hex signature");
  assert.ok(payload.fullUrl.includes("signature="));
  assert.ok(payload.dryRunUrl.includes("/order/test"));
  delete process.env.BINANCE_SECRET_KEY;
});

test("Binance fetchBinanceLiveTicker returns a price for BTCUSDT with fallback safety", async () => {
  const ticker = await fetchBinanceLiveTicker("BTCUSDT");
  assert.equal(ticker.symbol, "BTCUSDT");
  assert.ok(typeof ticker.price === "number" && ticker.price > 0, "Price must be a positive number");
  assert.ok(ticker.source !== undefined);
});

test("Supabase DB status reports correctly based on env configuration", () => {
  // Without credentials configured it should be in LOCAL_FALLBACK mode
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const status = getSupabaseDbStatus();
  assert.equal(status.status, "LOCAL_FALLBACK_ACTIVE");
  assert.equal(status.isConfigured, false);
  assert.ok(Array.isArray(status.targetTables));
  assert.ok(status.targetTables.includes("trade_ledgers"));
});

test("Supabase syncRecordToSupabase falls back gracefully when not configured", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const result = await syncRecordToSupabase("trade_ledgers", { id: "test_001", action: "BUY", amount: 100 });
  assert.equal(result.synced, true);
  assert.equal(result.storageMode, "LOCAL_FALLBACK");
  assert.equal(result.table, "trade_ledgers");
  assert.ok(result.message.includes("Configure SUPABASE_URL"));
});

test("Smart Telegram Alert Filter correctly suppresses routine noise events", () => {
  const swarmNoise = evaluateAlertPriority("SWARM_HEARTBEAT_TICK");
  assert.equal(swarmNoise.shouldTransmit, false);
  assert.equal(swarmNoise.priority, "ROUTINE_NOISE_SUPPRESSED");

  const orderSlice = evaluateAlertPriority("ORDER_SLICE_EXECUTED");
  assert.equal(orderSlice.shouldTransmit, false);
});

test("Smart Telegram Alert Filter transmits only CRITICAL events", () => {
  const signalAlert = evaluateAlertPriority("1_TAP_TRADE_SIGNAL");
  assert.equal(signalAlert.shouldTransmit, true);
  assert.equal(signalAlert.priority, "CRITICAL_ACTIONABLE");

  const sweepAlert = evaluateAlertPriority("BANK_PROFIT_SWEEP_EXECUTED");
  assert.equal(sweepAlert.shouldTransmit, true);

  const killAlert = evaluateAlertPriority("EMERGENCY_KILLSWITCH_ENGAGED");
  assert.equal(killAlert.shouldTransmit, true);

  const drawdownAlert = evaluateAlertPriority("ROUTINE_UPDATE", { drawdownPct: -2.8 });
  assert.equal(drawdownAlert.shouldTransmit, true);
  assert.equal(drawdownAlert.priority, "CRITICAL_RISK_WARNING");
});

test("sendSmartTelegramAlert returns suppressed when event type is noise", async () => {
  const result = await sendSmartTelegramAlert({ eventType: "ROUTINE_SWARM_TICK", title: "Noise", message: "This should be suppressed" });
  assert.equal(result.transmitted, false);
  assert.equal(result.reason, "SUPPRESSED_BY_SMART_FILTER");
});
