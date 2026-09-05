import test from "node:test";
import assert from "node:assert/strict";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";
import { userTradingStore } from "../src/telegram-trading-suite.mjs";
import { createPaperState, setQuote, placePaperOrder } from "../src/paper-engine.mjs";

test("Telegram Trading Suite: /start displays account dashboard, wallets, and interactive buttons", async () => {
  const parsed = parseTelegramCommand("/start");
  assert.equal(parsed.command, "/start");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.equal(typeof res, "object");
  assert.match(res.text, /WELCOME TO AIFIE APEX TRADING TERMINAL/i);
  assert.match(res.text, /PRIMARY WALLET/i);
  assert.match(res.text, /Net Equity/i);
  assert.ok(Array.isArray(res.replyMarkup?.inline_keyboard));
  assert.ok(res.replyMarkup.inline_keyboard.length >= 4);
});

test("Telegram Trading Suite: /positions displays real-time open positions and PnL", async () => {
  const paper = createPaperState();
  setQuote(paper, { symbol: "SOL/USDT", price: 150 });
  placePaperOrder(paper, { symbol: "SOL/USDT", side: "buy", quantity: 10 });

  // Update price to $180 for profit
  setQuote(paper, { symbol: "SOL/USDT", price: 180 });

  const parsed = parseTelegramCommand("/positions");
  assert.equal(parsed.command, "/positions");

  const res = await processTelegramCommand(parsed, { paper, orders: [] });
  assert.match(res.text, /PORTFOLIO POSITIONS & P&L OVERVIEW/i);
  assert.match(res.text, /SOL\/USDT/i);
  assert.match(res.text, /PnL:/i);
  assert.ok(res.replyMarkup?.inline_keyboard.length >= 2);
});

test("Telegram Trading Suite: /deposit provides multi-chain deposit addresses (Solana + EVM)", async () => {
  const parsed = parseTelegramCommand("/deposit");
  assert.equal(parsed.command, "/deposit");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.match(res.text, /DEPOSIT ASSETS INTO YOUR TRADING WALLET/i);
  assert.match(res.text, /SOLANA NETWORK/i);
  assert.match(res.text, /EVM NETWORKS/i);
  assert.match(res.text, /Pump\.fun \/ Raydium/i);
});

test("Telegram Trading Suite: /bridge lists cross-chain routes and gas metrics", async () => {
  const parsed = parseTelegramCommand("/bridge");
  assert.equal(parsed.command, "/bridge");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.match(res.text, /CROSS-CHAIN LIQUIDITY BRIDGE/i);
  assert.match(res.text, /Base ➔ Solana/i);
  assert.match(res.text, /Relayer Gas Fee/i);
});

test("Telegram Trading Suite: /withdraw & /transfer handle USDC fund movement", async () => {
  // 1. Withdraw
  const wParsed = parseTelegramCommand("/withdraw 75");
  assert.equal(wParsed.command, "/withdraw");
  const wRes = await processTelegramCommand(wParsed, { paper: createPaperState(), orders: [] });
  assert.match(wRes.text, /WITHDRAW USDC TO EXTERNAL WALLET/i);
  assert.match(wRes.text, /75 USDC/i);

  // 2. Transfer
  const tParsed = parseTelegramCommand("/transfer 50 @trader_bob");
  assert.equal(tParsed.command, "/transfer");
  const tRes = await processTelegramCommand(tParsed, { paper: createPaperState(), orders: [] });
  assert.match(tRes.text, /INSTANT P2P \/ INTERNAL USDC TRANSFER/i);
  assert.match(tRes.text, /0% fees/i);
});

test("Telegram Trading Suite: /wallets lists multi-chain wallets and balances", async () => {
  const parsed = parseTelegramCommand("/wallets");
  assert.equal(parsed.command, "/wallets");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.match(res.text, /MULTI-CHAIN WALLET MANAGEMENT/i);
  assert.match(res.text, /Primary Trading Wallet/i);
  assert.match(res.text, /DCA Accumulation Vault/i);
});

test("Telegram Trading Suite: /profiles switches user trading archetype", async () => {
  const parsed = parseTelegramCommand("/profiles Quant Swing Trader");
  assert.equal(parsed.command, "/profiles");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.match(res.text, /TRADING PROFILE SELECTION/i);
  assert.match(res.text, /Quant Swing Trader/i);
  assert.equal(userTradingStore.get().profile, "Quant Swing Trader");
});

test("Telegram Trading Suite: /orders displays limit orders and order history", async () => {
  const dummyOrders = [
    { id: "ord-test-1", symbol: "BTCUSDT", side: "buy", quantity: 1, status: "simulated", requestedAt: new Date().toISOString() }
  ];

  const parsed = parseTelegramCommand("/orders");
  assert.equal(parsed.command, "/orders");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: dummyOrders });
  assert.match(res.text, /ACTIVE LIMIT & RESTING ORDERS/i);
  assert.match(res.text, /BTCUSDT/i);
});

test("Telegram Trading Suite: /dca creates and displays DCA ladders from one message", async () => {
  const parsed = parseTelegramCommand("/dca ETH 30 Weekly");
  assert.equal(parsed.command, "/dca");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.match(res.text, /DOLLAR-COST AVERAGING \(DCA\) LADDER BUILDER/i);
  assert.match(res.text, /ETH Ladder/i);

  const ladders = userTradingStore.get().dcaLadders;
  assert.ok(ladders.some(l => l.symbol === "ETH" && l.amountUSD === 30 && l.frequency === "Weekly"));
});

test("Telegram Trading Suite: /alerts manages price triggers", async () => {
  const parsed = parseTelegramCommand("/alerts JUP 1.25 ABOVE");
  assert.equal(parsed.command, "/alerts");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.match(res.text, /TOKEN PRICE ALERTS MANAGER/i);
  assert.match(res.text, /JUP/i);

  const alerts = userTradingStore.get().alerts;
  assert.ok(alerts.some(a => a.symbol === "JUP" && a.targetPrice === 1.25));
});

test("Telegram Trading Suite: /export generates downloadable RFC-4180 CSV", async () => {
  const parsed = parseTelegramCommand("/export");
  assert.equal(parsed.command, "/export");

  const res = await processTelegramCommand(parsed, { paper: createPaperState(), orders: [] });
  assert.match(res.text, /EXPORT TRADE HISTORY CSV/i);
  assert.match(res.text, /OrderID,Symbol,Side,Quantity/i);
});

test("Telegram Trading Suite: /settings, /slippage, /trade_panel_settings, /autobuy, /language configure preferences", async () => {
  // 1. Settings
  const sRes = await processTelegramCommand(parseTelegramCommand("/settings"));
  assert.match(sRes.text, /GLOBAL TRADING PREFERENCES/i);

  // 2. Slippage
  const slipRes = await processTelegramCommand(parseTelegramCommand("/slippage 2.5"));
  assert.match(slipRes.text, /SLIPPAGE TOLERANCE CONFIGURATION/i);
  assert.equal(userTradingStore.get().slippage, 2.5);

  // 3. Trade Panel Settings
  const panelRes = await processTelegramCommand(parseTelegramCommand("/trade_panel_settings"));
  assert.match(panelRes.text, /TELEGRAM TRADE PANEL SETTINGS/i);

  // 4. Auto-Buy on paste
  const autoBuyRes = await processTelegramCommand(parseTelegramCommand("/autobuy on 100"));
  assert.match(autoBuyRes.text, /AUTO-BUY ON PASTE/i);
  assert.equal(userTradingStore.get().autobuy, true);
  assert.equal(userTradingStore.get().autobuyAmountUSD, 100);

  // 5. Language
  const langRes = await processTelegramCommand(parseTelegramCommand("/language zh"));
  assert.match(langRes.text, /SELECT LANGUAGE/i);
  assert.equal(userTradingStore.get().language, "zh");
});

test("Telegram Trading Suite: /bots, /docs, /support, /help provide referral, documentation & commands directory", async () => {
  // 1. Bots / Referral
  const botsRes = await processTelegramCommand(parseTelegramCommand("/bots"));
  assert.match(botsRes.text, /OFFICIAL AIFIE BOT HANDLES/i);
  assert.match(botsRes.text, /REFER AND EARN/i);

  // 2. Docs
  const docsRes = await processTelegramCommand(parseTelegramCommand("/docs"));
  assert.match(docsRes.text, /AIFIE INSTITUTIONAL DOCUMENTATION/i);

  // 3. Support
  const supRes = await processTelegramCommand(parseTelegramCommand("/support"));
  assert.match(supRes.text, /24\/7 INSTITUTIONAL CUSTOMER SUPPORT/i);

  // 4. Help
  const helpRes = await processTelegramCommand(parseTelegramCommand("/help"));
  assert.match(helpRes.text, /AIFIE INSTITUTIONAL MOBILE COMMAND DIRECTORY/i);
  assert.match(helpRes.text, /\/positions/);
  assert.match(helpRes.text, /\/deposit/);
  assert.match(helpRes.text, /\/bridge/);
  assert.match(helpRes.text, /\/withdraw/);
  assert.match(helpRes.text, /\/transfer/);
  assert.match(helpRes.text, /\/wallets/);
  assert.match(helpRes.text, /\/profiles/);
  assert.match(helpRes.text, /\/orders/);
  assert.match(helpRes.text, /\/dca/);
  assert.match(helpRes.text, /\/alerts/);
  assert.match(helpRes.text, /\/export/);
  assert.match(helpRes.text, /\/settings/);
  assert.match(helpRes.text, /\/slippage/);
  assert.match(helpRes.text, /\/trade_panel_settings/);
  assert.match(helpRes.text, /\/autobuy/);
  assert.match(helpRes.text, /\/language/);
  assert.match(helpRes.text, /\/bots/);
  assert.match(helpRes.text, /\/docs/);
  assert.match(helpRes.text, /\/support/);
  assert.match(helpRes.text, /\/sources/);
  assert.match(helpRes.text, /\/scan/);
  assert.ok(helpRes.replyMarkup?.inline_keyboard.length >= 5);
});

test("Telegram Trading Suite: /sources and /scan unleash 60-source institutional intelligence", async () => {
  // 1. /sources catalog
  const sourcesRes = await processTelegramCommand(parseTelegramCommand("/sources"));
  assert.match(sourcesRes.text, /60-SOURCE INSTITUTIONAL UNIVERSE CATALOG/i);
  assert.match(sourcesRes.text, /PILLAR 1: QUANT & EXECUTION/i);
  assert.match(sourcesRes.text, /PILLAR 2: FINANCIAL ML & RL/i);
  assert.match(sourcesRes.text, /PILLAR 3: VALUATION & FUNDAMENTALS/i);
  assert.match(sourcesRes.text, /PILLAR 4: MACRO & GEOPOLITICS/i);
  assert.ok(sourcesRes.replyMarkup?.inline_keyboard.length >= 3);

  // 2. /scan NVDA across all 60 sources
  const scanRes = await processTelegramCommand(parseTelegramCommand("/scan NVDA"));
  assert.match(scanRes.text, /360° QUANTITATIVE INTELLIGENCE SCAN: NVDA/i);
  assert.match(scanRes.text, /COMPOSITE ALPHA SCORE:/i);
  assert.match(scanRes.text, /AFML Memory Preservation/i);
  assert.match(scanRes.text, /Black-Scholes Options/i);
  assert.match(scanRes.text, /Avellaneda-Stoikov PMM/i);
  assert.match(scanRes.text, /Dupont & Solvency/i);
  assert.match(scanRes.text, /DCF Intrinsic Value/i);
  assert.match(scanRes.text, /Geopolitical Threat Index/i);
  assert.match(scanRes.text, /Reinforcement Learning Policy/i);
  assert.ok(scanRes.replyMarkup?.inline_keyboard.length >= 2);
});

