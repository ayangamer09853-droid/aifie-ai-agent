// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { telegramCommandRouter } from "../src/telegram/telegram-command-router.mjs";
import { parseTelegramCommand } from "../src/telegram-command-listener.mjs";

test("Telegram Router handles /graph with task graph and causality metrics", async () => {
  const res = await telegramCommandRouter.routeCommand({
    command: "/graph",
    chatId: "no_rate_limit"
  });

  assert.equal(res.handled, true);
  assert.ok(res.response?.text.includes("AIFIE GRAPH ENGINEERING & TOPOLOGY SYSTEM"));
  assert.ok(res.response?.text.includes("Task / Agent Graph"));
  assert.ok(res.response?.text.includes("TradingGraph_momentum-v3"));
  assert.ok(res.response?.replyMarkup?.inline_keyboard?.length > 0);
});

test("Telegram Router handles /shadow with counterfactual portfolio metrics", async () => {
  const res = await telegramCommandRouter.routeCommand({
    command: "/shadow",
    chatId: "no_rate_limit"
  });

  assert.equal(res.handled, true);
  assert.ok(res.response?.text.includes("AIFIE SHADOW TRADING ENGINE"));
  assert.ok(res.response?.text.includes("Cash Balance:"));
  assert.ok(res.response?.text.includes("Net Equity:"));
  assert.ok(res.response?.text.includes("Slippage Modeled (0.05%):"));
});

test("Telegram Router handles /critic and returns adversarial falsification report", async () => {
  const res = await telegramCommandRouter.routeCommand({
    command: "/critic",
    symbol: "BTCUSDT",
    fullText: "/critic BTCUSDT",
    chatId: "no_rate_limit"
  });

  assert.equal(res.handled, true);
  assert.ok(res.response?.text.includes("AIFIE ADVERSARIAL CRITIC AGENT"));
  assert.ok(res.response?.text.includes("Adversarial Stress-Test on BTCUSDT"));
  assert.ok(res.response?.text.includes("Specialist ID:"));
});

test("Telegram Router handles /leaderboard and formats ASCII strategy matrix", async () => {
  const res = await telegramCommandRouter.routeCommand({
    command: "/leaderboard",
    chatId: "no_rate_limit"
  });

  assert.equal(res.handled, true);
  assert.ok(res.response?.text.includes("AIFIE QUANT STRATEGY LEADERBOARD"));
  assert.ok(res.response?.text.includes("Momentum v3"));
  assert.ok(res.response?.text.includes("Active Strategies:"));
});

test("parseTelegramCommand correctly normalizes shortcuts into slash commands", () => {
  assert.equal(parseTelegramCommand("🕸️ Graph Engine").command, "/graph");
  assert.equal(parseTelegramCommand("👤 Shadow Mode").command, "/shadow");
  assert.equal(parseTelegramCommand("🧐 Critic Agent").command, "/critic");
  assert.equal(parseTelegramCommand("🏆 Strategy Leaderboard").command, "/leaderboard");
});
