import test from "node:test";
import assert from "node:assert/strict";
import { calculateBollingerBands, calculateVWAP, generateTradingSignal } from "../src/technical-indicators.mjs";
import { generateAlgorithmProposal, getAllAlgorithms, runBacktestForStrategy, runMultiAlgoTournament } from "../src/algo-generator.mjs";

test("calculateBollingerBands returns upper, middle, and lower bands", () => {
  const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
  const bb = calculateBollingerBands(prices, 20, 2.0);
  assert.ok(bb);
  assert.ok(bb.upper > bb.middle);
  assert.ok(bb.middle > bb.lower);
  assert.ok(bb.bandwidth > 0);
});

test("calculateVWAP computes volume weighted average price", () => {
  const prices = [100, 102, 105, 103];
  const volumes = [10, 20, 30, 40];
  const vwap = calculateVWAP(prices, volumes);
  assert.ok(typeof vwap === "number");
  assert.ok(vwap >= 100 && vwap <= 105);
});

test("generateTradingSignal supports bollinger_bands, vwap_trend, and ml_ensemble", () => {
  const prices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120];
  
  const bbSignal = generateTradingSignal(prices, "bollinger_bands");
  assert.ok(["BUY", "SELL", "HOLD"].includes(bbSignal.signal));
  assert.ok(bbSignal.indicators.bollinger);

  const vwapSignal = generateTradingSignal(prices, "vwap_trend");
  assert.ok(["BUY", "SELL", "HOLD"].includes(vwapSignal.signal));
  assert.ok(vwapSignal.indicators.vwap);

  const mlSignal = generateTradingSignal(prices, "ml_ensemble");
  assert.ok(["BUY", "SELL", "HOLD"].includes(mlSignal.signal));
  assert.ok(mlSignal.confidence >= 0);
});

test("runMultiAlgoTournament backtests algorithms and selects a winner", () => {
  const result = runMultiAlgoTournament();
  assert.ok(result.tournamentId);
  assert.ok(result.totalAlgorithmsTested >= 5);
  assert.ok(result.winningAlgorithm);
  assert.ok(result.leaderboard.length >= 5);
});

test("generateAlgorithmProposal creates a new algorithm entry", () => {
  const algo = generateAlgorithmProposal(null, { name: "Custom Momentum Breakout", strategyType: "momentum" });
  assert.ok(algo.id);
  assert.equal(algo.name, "Custom Momentum Breakout");
  assert.equal(algo.status, "research");
});
