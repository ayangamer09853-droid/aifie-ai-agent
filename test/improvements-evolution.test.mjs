import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { calculateDynamicLotSize, evaluateMultiGenomeConsensus } from "../src/trading-bot.mjs";
import { createStateStore } from "../src/state-store.mjs";
import { processTelegramCommand, parseTelegramCommand } from "../src/telegram-command-listener.mjs";
import { app } from "../server.mjs";

test("Dynamic Half-Kelly position sizing scales lot size based on capital and price", () => {
  const sizing1 = calculateDynamicLotSize({
    symbol: "AAPL",
    cash: 100000,
    currentPrice: 200,
    winRate: 0.65,
    winLossRatio: 2.0
  });

  assert.equal(sizing1.symbol, "AAPL");
  assert.ok(sizing1.halfKellyFraction > 0);
  assert.ok(sizing1.calculatedLotSize >= 1);
  assert.ok(sizing1.calculatedLotSize <= sizing1.maxTradeQuantity);

  // When capital is very small, minimum lot size is safely 1
  const sizingSmall = calculateDynamicLotSize({
    symbol: "BTC",
    cash: 50,
    currentPrice: 65000
  });
  assert.equal(sizingSmall.calculatedLotSize, 1);
});

test("Multi-Genome Ensemble Consensus evaluates 3 champion genomes and yields vote split", () => {
  const quote = { symbol: "BTC", price: 65000 };
  const consensus = evaluateMultiGenomeConsensus("BTC", quote);

  assert.equal(consensus.symbol, "BTC");
  assert.ok(consensus.totalGenomesPolled >= 1);
  assert.ok(consensus.agreementRatePercent >= 0);
  assert.equal(typeof consensus.consensusPassed, "boolean");
  assert.ok(Array.isArray(consensus.votes));
});

test("State Store maintains rolling backup file on every persist write", () => {
  const tempPath = join(tmpdir(), `aifie-test-state-${Date.now()}.json`);
  const backupPath = `${tempPath.replace(/\.json$/, "")}.backup.json`;

  try {
    const store = createStateStore(tempPath);
    store.save({
      orders: [
        { id: "order-1", symbol: "AAPL", side: "buy", quantity: 2, status: "filled" }
      ],
      paper: { cash: 99000 }
    });

    assert.ok(existsSync(tempPath));

    // Second save should rotate the first save into backupPath
    store.save({
      orders: [
        { id: "order-1", symbol: "AAPL", side: "buy", quantity: 2, status: "filled" },
        { id: "order-2", symbol: "TSLA", side: "buy", quantity: 1, status: "filled" }
      ],
      paper: { cash: 98000 }
    });

    assert.ok(existsSync(backupPath), "Rolling backup file should exist");
    const loaded = store.load();
    assert.equal(loaded.orders.length, 2);
  } finally {
    try { unlinkSync(tempPath); } catch {}
    try { unlinkSync(backupPath); } catch {}
  }
});

test("Telegram /sizing and /consensus commands return rich telemetry", async () => {
  const parsed1 = parseTelegramCommand("⚖️ Half-Kelly Sizing");
  assert.equal(parsed1.command, "/sizing");

  const parsed2 = parseTelegramCommand("🗳️ Multi-Genome Consensus");
  assert.equal(parsed2.command, "/consensus");

  const sizingMsg = await processTelegramCommand({ command: "/sizing", symbol: "AAPL" });
  assert.ok(sizingMsg.includes("DYNAMIC HALF-KELLY POSITION SIZING"));
  assert.ok(sizingMsg.includes("Calculated Lot Size"));

  const consensusMsg = await processTelegramCommand({ command: "/consensus", symbol: "TSLA" });
  assert.ok(consensusMsg.includes("MULTI-GENOME ENSEMBLE CONSENSUS"));
  assert.ok(consensusMsg.includes("Vote Split"));
});

test("REST API endpoints /api/v100/bot/sizing and /api/v100/bot/consensus respond with 200 OK", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const sizingRes = await fetch(`http://127.0.0.1:${port}/api/v100/bot/sizing?symbol=NVDA&price=120`);
    assert.equal(sizingRes.status, 200);
    const sizingData = await sizingRes.json();
    assert.equal(sizingData.symbol, "NVDA");
    assert.ok(sizingData.calculatedLotSize >= 1);

    const conRes = await fetch(`http://127.0.0.1:${port}/api/v100/bot/consensus?symbol=ETH`);
    assert.equal(conRes.status, 200);
    const conData = await conRes.json();
    assert.equal(conData.symbol, "ETH");
    assert.ok(conData.agreementRatePercent !== undefined);
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
});
