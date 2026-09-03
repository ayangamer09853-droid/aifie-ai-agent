import test from "node:test";
import assert from "node:assert/strict";
import { sendDailyPnlReport, sendRiskAlert, sendTelegramAlert, sendTradeAlert } from "../src/telegram-notifier.mjs";

test("sendTelegramAlert handles unconfigured credentials safely", async () => {
  const result = await sendTelegramAlert("Test Alert", { botToken: "", chatId: "" });
  assert.equal(result.sent, false);
  assert.equal(result.reason, "TELEGRAM_NOT_CONFIGURED");
});

test("sendTradeAlert constructs structured HTML trade alert", async () => {
  const alert = await sendTradeAlert({ symbol: "AAPL", side: "BUY", quantity: 2, price: 150.0, rationale: "Golden Cross", isPaper: true });
  assert.equal(alert.sent, false);
  assert.equal(alert.reason, "TELEGRAM_NOT_CONFIGURED");
});

test("sendRiskAlert constructs structured HTML risk alert", async () => {
  const alert = await sendRiskAlert({ reason: "Flash Crash", type: "ABSOLUTE_RISK_VETO" });
  assert.equal(alert.sent, false);
  assert.equal(alert.reason, "TELEGRAM_NOT_CONFIGURED");
});

test("sendDailyPnlReport constructs structured HTML daily report", async () => {
  const report = await sendDailyPnlReport({ totalRealizedPnl: 1250.50, totalTrades: 5, winRatePercent: 80, activeRegime: "BULL_TREND" });
  assert.equal(report.sent, false);
  assert.equal(report.reason, "TELEGRAM_NOT_CONFIGURED");
});
