import test from "node:test";
import assert from "node:assert/strict";
import { configureBot, getBotStatus, runBotCycle, startBot, stopBot } from "../src/trading-bot.mjs";
import { createPaperState, setQuote } from "../src/paper-engine.mjs";
import { createStrategyState } from "../src/strategy-lab.mjs";
import { setKillSwitch } from "../src/alfie-control-plane.mjs";

test("configureBot updates watch symbols and strategy settings", () => {
  configureBot({
    watchSymbols: ["aapl", "tsla"],
    activeStrategyId: "rsi_mean_reversion",
    stopLossPercent: 2.5,
    takeProfitPercent: 5.0
  });

  const status = getBotStatus();
  assert.deepEqual(status.watchSymbols, ["AAPL", "TSLA"]);
  assert.equal(status.activeStrategyId, "rsi_mean_reversion");
  assert.equal(status.stopLossPercent, 2.5);
  assert.equal(status.takeProfitPercent, 5.0);
});

test("runBotCycle pauses execution when kill switch is active", async () => {
  setKillSwitch({ active: true, reason: "Test safety switch" });
  const paper = createPaperState();
  const strategyLab = createStrategyState();
  const orders = [];

  const res = await runBotCycle({ paper, strategyLab, orders });
  assert.equal(res.status, "paused_by_kill_switch");

  // Restore kill switch
  setKillSwitch({ active: false });
});

test("runBotCycle triggers automated stop-loss exit on loss threshold", async () => {
  setKillSwitch({ active: false });
  configureBot({ stopLossPercent: 3.0, watchSymbols: [], activeStrategyId: "baseline-wait-v1" });

  const paper = createPaperState({
    account: {
      startingCash: 100000,
      cash: 99000,
      peakEquity: 100000,
      positions: {
        AAPL: { quantity: 10, averagePrice: 100 }
      }
    }
  });
  
  // Set market quote to 90 (10% drop, exceeding 3% stop-loss)
  setQuote(paper, { symbol: "AAPL", price: 90, source: "test" });
  
  const strategyLab = createStrategyState();
  const orders = [];

  const res = await runBotCycle({ paper, strategyLab, orders });
  assert.equal(res.status, "success");
  
  // Check that stop loss executed and AAPL position was sold
  assert.equal(paper.account.positions.AAPL, undefined);
  assert.ok(orders.some(o => o.side === "sell" && o.audit.source === "bot_risk_gate"));
});

test("startBot and stopBot control automated loop state", () => {
  const status1 = startBot({ paper: createPaperState(), strategyLab: createStrategyState(), orders: [] });
  assert.equal(status1.isRunning, true);

  const status2 = stopBot();
  assert.equal(status2.isRunning, false);
});
