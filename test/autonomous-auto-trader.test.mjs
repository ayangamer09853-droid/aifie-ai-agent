import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import { createPaperState, setQuote } from "../src/paper-engine.mjs";
import {
  startAutoTrader,
  stopAutoTrader,
  getAutoTraderStatus,
  executeAutonomousTradeCycle
} from "../src/autonomous-auto-trader.mjs";
import {
  parseTelegramCommand,
  processTelegramCommand
} from "../src/telegram-command-listener.mjs";

test("executeAutonomousTradeCycle executes an automatic trade cycle on simulated paper account", async () => {
  const paper = createPaperState({
    account: {
      cash: 100000,
      positions: {}
    },
    risk: {
      maxPositionNotional: 100000
    }
  });
  setQuote(paper, { symbol: "AAPL", price: 220 });
  setQuote(paper, { symbol: "BTC/USDT", price: 65000 });
  const orders = [];

  const result = await executeAutonomousTradeCycle({
    paper,
    orders,
    forceExecute: true
  });

  assert.equal(result.success, true);
  assert.ok(result.scanTimestamp);
  assert.ok(result.tradesExecutedCount >= 1, "At least one trade should have executed with forceExecute");
  assert.ok(orders.length >= 1, "Order should be added to orders list");
  assert.equal(orders[0].side, "buy");
  assert.equal(orders[0].mode, "paper");
  assert.ok(orders[0].audit.source.includes("auto_trader") || orders[0].audit.source.includes("autonomous"));
});

test("getAutoTraderStatus returns active status, watchlist, risk limits, and champion strategy", () => {
  const status = getAutoTraderStatus();
  assert.equal(typeof status.isRunning, "boolean");
  assert.equal(typeof status.mode, "string");
  assert.ok(Array.isArray(status.watchSymbols));
  assert.ok(status.watchSymbols.includes("BTC/USDT"));
  assert.equal(status.stopLossPercent, 3.0);
  assert.equal(status.takeProfitPercent, 7.0);
  assert.ok(typeof status.championStrategy === "string");
  assert.ok(Array.isArray(status.recentAutoTrades));
});

test("startAutoTrader and stopAutoTrader transition daemon state cleanly", () => {
  const paper = createPaperState();
  const orders = [];

  const started = startAutoTrader({ paper, orders, intervalMs: 20000 });
  assert.equal(started.isRunning, true);

  const stopped = stopAutoTrader();
  assert.equal(stopped.isRunning, false);
});

test("Telegram /autotrade on, off, status, now return rich operational telemetry", async () => {
  const paper = createPaperState({ account: { cash: 100000 } });
  setQuote(paper, { symbol: "AAPL", price: 150 });
  const orders = [];

  // Parse button aliases
  const parsedOn = parseTelegramCommand("🤖 24/7 Auto-Trader ON");
  assert.equal(parsedOn.command, "/autotrade");
  assert.equal(parsedOn.symbol, "ON");

  const parsedNow = parseTelegramCommand("⚡ Auto-Trade Scan Now");
  assert.equal(parsedNow.command, "/autotrade");
  assert.equal(parsedNow.symbol, "NOW");

  // Process /autotrade status
  const respStatus = await processTelegramCommand({ command: "/autotrade", symbol: "status" }, { paper, orders });
  assert.ok(respStatus.includes("AUTONOMOUS AUTO-TRADER STATUS"));

  // Process /autotrade on
  const respOn = await processTelegramCommand({ command: "/autotrade", symbol: "on" }, { paper, orders });
  assert.ok(respOn.includes("AUTONOMOUS AUTO-TRADING ACTIVATED"));

  // Process /autotrade now
  const respNow = await processTelegramCommand({ command: "/autotrade", symbol: "now" }, { paper, orders });
  assert.ok(respNow.includes("INSTANT AUTO-TRADE CYCLE EXECUTED"));

  // Process /autotrade off
  const respOff = await processTelegramCommand({ command: "/autotrade", symbol: "off" }, { paper, orders });
  assert.ok(respOff.includes("AUTONOMOUS AUTO-TRADING PAUSED"));
});

test("REST API endpoints /api/v100/autotrade/* respond with 200 OK", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET status
    const resStatus = await fetch(`${baseUrl}/api/v100/autotrade/status`);
    assert.equal(resStatus.status, 200);
    const dataStatus = await resStatus.json();
    assert.ok("isRunning" in dataStatus);
    assert.ok("watchSymbols" in dataStatus);

    // 2. POST start
    const resStart = await fetch(`${baseUrl}/api/v100/autotrade/start`, { method: "POST" });
    assert.equal(resStart.status, 200);
    const dataStart = await resStart.json();
    assert.equal(dataStart.isRunning, true);

    // 3. POST trigger-now
    const resTrigger = await fetch(`${baseUrl}/api/v100/autotrade/trigger-now`, { method: "POST" });
    assert.equal(resTrigger.status, 200);
    const dataTrigger = await resTrigger.json();
    assert.equal(dataTrigger.success, true);

    // 4. POST stop
    const resStop = await fetch(`${baseUrl}/api/v100/autotrade/stop`, { method: "POST" });
    assert.equal(resStop.status, 200);
    const dataStop = await resStop.json();
    assert.equal(dataStop.isRunning, false);
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
});
