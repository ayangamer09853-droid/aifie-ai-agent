import test from "node:test";
import assert from "node:assert/strict";
import { getMarketRegime } from "../src/market-regime.mjs";
import { adjustConfidenceFromMemory, getTradeMemoryStats, saveTradeMemory } from "../src/trade-memory.mjs";
import { runDigitalTwinSimulation } from "../src/digital-twin.mjs";
import { getLiquidityMetrics } from "../src/liquidity-intelligence.mjs";
import { getAssetCorrelationMatrix } from "../src/portfolio-correlation.mjs";
import { checkBlackSwanCondition } from "../src/black-swan-shield.mjs";
import { getHedgeFundCommitteeStatus, runHedgeFundCycle } from "../src/hedge-fund-agents.mjs";
import { createPaperState } from "../src/paper-engine.mjs";

test("getMarketRegime classifies 6-state market conditions", () => {
  const regime1 = getMarketRegime([150, 150.5, 151.0, 151.8, 153.0]);
  assert.equal(regime1.regime, "BULL_TREND");

  const regimeCrisis = getMarketRegime([150, 140, 130], "HIGH");
  assert.equal(regimeCrisis.regime, "CRISIS_MODE");
  assert.equal(regimeCrisis.cashTargetPercent, 100);
});

test("saveTradeMemory and adjustConfidenceFromMemory record setup win rates", () => {
  saveTradeMemory({ symbol: "AAPL", action: "BUY", setupType: "BULL_TREND_SMA_CROSSOVER", fillPrice: 150 });
  const stats = getTradeMemoryStats();
  assert.ok(stats.totalRecordedMemories >= 1);

  const tuned = adjustConfidenceFromMemory("BULL_TREND_SMA_CROSSOVER", 80);
  assert.ok(typeof tuned === "number");
});

test("runDigitalTwinSimulation benchmarks policy alternatives", () => {
  const dt = runDigitalTwinSimulation("AAPL", 150);
  assert.equal(dt.twins.length, 3);
  assert.ok(dt.benchmarkInsight);
});

test("getLiquidityMetrics reports spread and order book imbalance", () => {
  const liq = getLiquidityMetrics("BTCUSDT");
  assert.equal(liq.liquidityStatus, "DEEP_LIQUIDITY_PASS");
});

test("getAssetCorrelationMatrix evaluates cross-asset correlations", () => {
  const matrix = getAssetCorrelationMatrix();
  assert.equal(matrix.assets.length, 6);
  assert.ok(matrix.correlationMatrix.BTC.NASDAQ > 0);
});

test("checkBlackSwanCondition triggers circuit breaker on flash crash", () => {
  const res = checkBlackSwanCondition([100, 96]); // 4% drop
  assert.equal(res.isBlackSwanTriggered, true);
  assert.equal(res.actionRequired, "TRIGGER_INSTANT_KILL_SWITCH");
});

test("runHedgeFundCycle enforces Parliament Voting and Absolute Risk Veto", async () => {
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100000 } });
  const orders = [];

  const status = await runHedgeFundCycle({ symbol: "AAPL", paper, orders });
  assert.ok(status.parliamentVoting);
  assert.equal(status.specialistReports.riskManagement.vetoPower, "ABSOLUTE_VETO_POWER");
  assert.ok(Array.isArray(status.ceoDecision.xaiRationale));
});
