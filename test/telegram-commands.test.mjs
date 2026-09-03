import test from "node:test";
import assert from "node:assert/strict";
import { parseTelegramCommand, processTelegramCommand, MOBILE_KEYBOARD } from "../src/telegram-command-listener.mjs";
import { createPaperState, setQuote } from "../src/paper-engine.mjs";

test("parseTelegramCommand handles text commands and mobile tap button aliases", () => {
  const parsed1 = parseTelegramCommand("/status");
  assert.equal(parsed1.command, "/status");

  const parsedTap1 = parseTelegramCommand("📊 Status");
  assert.equal(parsedTap1.command, "/status");

  const parsedTap2 = parseTelegramCommand("🎯 Opportunities");
  assert.equal(parsedTap2.command, "/opportunities");

  const parsedTap3 = parseTelegramCommand("🚨 Emergency Kill");
  assert.equal(parsedTap3.command, "/kill");
});

test("processTelegramCommand handles /status, /opportunities, /treasury, /regime, /scan, /buy, /sell, /report, /kill, /resume", async () => {
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100000 } });
  setQuote(paper, { symbol: "AAPL", price: 150.0 });
  const orders = [];

  const statusMsg = await processTelegramCommand({ command: "/status" }, { paper, orders });
  assert.ok(statusMsg.includes("STATUS REPORT"));

  const oppsMsg = await processTelegramCommand({ command: "/opportunities" }, { paper, orders });
  assert.ok(oppsMsg.includes("OPPORTUNITY RANKING MATRIX"));

  const treasuryMsg = await processTelegramCommand({ command: "/treasury" }, { paper, orders });
  assert.ok(treasuryMsg.includes("TREASURY CAPITAL BUCKETS"));

  const regimeMsg = await processTelegramCommand({ command: "/regime", symbol: "AAPL" }, { paper, orders });
  assert.ok(regimeMsg.includes("MARKET REGIME CLASSIFIER"));

  const scanMsg = await processTelegramCommand({ command: "/scan", symbol: "AAPL" }, { paper, orders });
  assert.ok(scanMsg.includes("24-SOURCE INTELLIGENCE SCAN"));

  const buyMsg = await processTelegramCommand({ command: "/buy", symbol: "AAPL", quantity: 2 }, { paper, orders });
  assert.ok(buyMsg.includes("ORDER EXECUTED VIA TELEGRAM"));
  assert.equal(orders.length, 1);

  const reportMsg = await processTelegramCommand({ command: "/report" }, { paper, orders });
  assert.ok(reportMsg.includes("DAILY P&L"));

  const killMsg = await processTelegramCommand({ command: "/kill" }, { paper, orders });
  assert.ok(killMsg.includes("EMERGENCY KILL SWITCH ACTIVATED"));

  const resumeMsg = await processTelegramCommand({ command: "/resume" }, { paper, orders });
  assert.ok(resumeMsg.includes("TRADING LOOPS RESUMED"));
});

test("MOBILE_KEYBOARD defines tap buttons for mobile screen", () => {
  assert.ok(Array.isArray(MOBILE_KEYBOARD.keyboard));
  assert.ok(MOBILE_KEYBOARD.keyboard.length >= 4);
});
