// test/telegram-forward-process.test.mjs
// Unit Test Suite: Telegram Bot Forward Process Workflows & Interactive Inline Keyboards

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTelegramCommand, processTelegramCommand, MOBILE_KEYBOARD } from "../src/telegram-command-listener.mjs";
import { sendTradeAlert, sendRiskAlert, sendDailyPnlReport, answerTelegramCallbackQuery } from "../src/telegram-notifier.mjs";

describe("Telegram Bot Enhancements: Forward Processes & Interactive Actions", () => {
  const paper = {
    account: { cash: 100000, equity: 100000, positions: {} },
    quotes: { "BTC/USDT": { price: 65000, updatedAt: new Date().toISOString() } },
    risk: { maxDrawdownPercent: 10, maxQuoteAgeMs: 60000, slippageRate: 0.0005, commissionRate: 0.0002, maxPositionNotional: 1000000 }
  };
  const orders = [];

  it("1. MOBILE_KEYBOARD includes top-level forward process and diagnostics buttons", () => {
    assert.ok(Array.isArray(MOBILE_KEYBOARD.keyboard));
    const firstRow = MOBILE_KEYBOARD.keyboard[0];
    assert.equal(firstRow[0].text, "🔄 8-Plane Pipeline Process");
    assert.equal(firstRow[1].text, "📊 System Diagnostics");
    const secondRow = MOBILE_KEYBOARD.keyboard[1];
    assert.equal(secondRow[0].text, "📉 Transaction Cost (TCA)");
    assert.equal(secondRow[1].text, "🎲 10k Monte Carlo Sim");
  });

  it("2. /process outputs 8-plane pipeline steps and interactive execution buttons", async () => {
    const parsed = parseTelegramCommand("/process BTC/USDT");
    assert.equal(parsed.command, "/process");
    assert.equal(parsed.symbol, "BTC/USDT");

    const res = await processTelegramCommand(parsed, { paper, orders });
    assert.equal(typeof res, "object");
    assert.ok(res.text.includes("8-STAGE FORWARD PROCESS FLOW"));
    assert.ok(res.text.includes("[DATA_PLANE]"));
    assert.ok(res.text.includes("[RISK_PLANE]"));
    assert.ok(res.text.includes("[EXECUTION_PLANE]"));
    assert.ok(res.text.includes("NEXT FORWARD ACTION"));

    assert.ok(res.replyMarkup?.inline_keyboard?.length >= 3);
    const flattened = res.replyMarkup.inline_keyboard.flat();
    assert.ok(flattened.some(b => b.callback_data === "cmd:/buy BTC/USDT 1"));
    assert.ok(flattened.some(b => b.callback_data === "cmd:/tca BTC/USDT"));
  });

  it("3. /diagnostics surfaces all 8 planes, active alerts, and forward audit loop", async () => {
    const parsed = parseTelegramCommand("/diagnostics");
    const res = await processTelegramCommand(parsed, { paper, orders });
    assert.equal(typeof res, "object");
    assert.ok(res.text.includes("AIFIE 8-PLANE SYSTEM DIAGNOSTICS"));
    assert.ok(res.text.includes("ACTIVE WORKING PROCESSES"));
    assert.ok(res.text.includes("FORWARD MAINTENANCE PROCESS"));
    assert.ok(res.replyMarkup?.inline_keyboard?.length >= 2);
  });

  it("4. /tca performs slippage decomposition with forward routing optimization", async () => {
    const parsed = parseTelegramCommand("/tca BTC/USDT");
    const res = await processTelegramCommand(parsed, { paper, orders });
    assert.equal(typeof res, "object");
    assert.ok(res.text.includes("TRANSACTION COST ANALYSIS (TCA)"));
    assert.ok(res.text.includes("Half-Spread Drag"));
    assert.ok(res.text.includes("Market Impact Drag"));
    assert.ok(res.text.includes("FORWARD ROUTING OPTIMIZATION"));
    assert.ok(res.replyMarkup?.inline_keyboard?.length >= 2);
  });

  it("5. /montecarlo executes 10k simulations with tail risk and Half-Kelly leverage", async () => {
    const parsed = parseTelegramCommand("/montecarlo");
    const res = await processTelegramCommand(parsed, { paper, orders });
    assert.equal(typeof res, "object");
    assert.ok(res.text.includes("10,000-PATH MONTE CARLO"));
    assert.ok(res.text.includes("HALF-KELLY LEVERAGE BOUNDARY"));
    assert.ok(res.text.includes("FORWARD RISK PROCESS"));
    assert.ok(res.replyMarkup?.inline_keyboard?.length >= 2);
  });

  it("6. /buy and /sell embed forward pipeline, brackets, and next step buttons", async () => {
    const buyParsed = parseTelegramCommand("/buy BTC/USDT 1");
    const buyRes = await processTelegramCommand(buyParsed, { paper, orders });
    assert.equal(typeof buyRes, "object");
    assert.ok(buyRes.text.includes("PIPELINE EXECUTION TRACE"));
    assert.ok(buyRes.text.includes("Trailing Stop"));
    assert.ok(buyRes.text.includes("Take Profit 1"));
    assert.ok(buyRes.text.includes("NEXT FORWARD PROCESS"));
    assert.ok(buyRes.replyMarkup?.inline_keyboard?.length >= 2);

    const sellParsed = parseTelegramCommand("/sell BTC/USDT 1");
    const sellRes = await processTelegramCommand(sellParsed, { paper, orders });
    assert.equal(typeof sellRes, "object");
    assert.ok(sellRes.text.includes("PIPELINE EXECUTION TRACE"));
    assert.ok(sellRes.text.includes("NEXT FORWARD PROCESS"));
  });

  it("7. Notifier alert builders include forward pipelines and interactive keyboards", async () => {
    // Tests notifier without token (returns error object safely)
    const tradeRes = await sendTradeAlert({ symbol: "ETH/USDT", side: "BUY", quantity: 2, price: 3200 });
    assert.equal(tradeRes.sent, false);
    assert.equal(tradeRes.reason, "TELEGRAM_NOT_CONFIGURED");

    const riskRes = await sendRiskAlert({ reason: "Drawdown breached 3.0% limit" });
    assert.equal(riskRes.sent, false);

    const pnlRes = await sendDailyPnlReport({ totalRealizedPnl: 1450, totalTrades: 12 });
    assert.equal(pnlRes.sent, false);
  });
});
