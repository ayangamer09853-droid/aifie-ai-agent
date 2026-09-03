import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateHierarchicalRiskParityWeights,
  calculateBlackLittermanAllocation,
  calculateMarkowitzEfficientFrontier
} from "../src/convex-portfolio-optimizer.mjs";
import {
  createTradeSignalAlert,
  handleTelegramSignalCallback,
  getPendingSignalsList
} from "../src/telegram-signal-confirmation-gate.mjs";

test("Hierarchical Risk Parity (HRP) calculates tree clustered portfolio weights summing to 1.0", () => {
  const hrp = calculateHierarchicalRiskParityWeights();
  assert.equal(hrp.method, "HIERARCHICAL_RISK_PARITY_HRP");
  assert.equal(hrp.assetsCount, 6);

  const sum = Object.values(hrp.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 0.01);
  assert.ok(hrp.stabilityScore > 90);
});

test("Black-Litterman and Markowitz Efficient Frontier compute optimal allocations", () => {
  const bl = calculateBlackLittermanAllocation();
  assert.equal(bl.method, "BLACK_LITTERMAN_BAYESIAN");
  assert.equal(typeof bl.posteriorWeights.BTC, "number");

  const frontier = calculateMarkowitzEfficientFrontier();
  assert.equal(frontier.engineStatus, "EFFICIENT_FRONTIER_SOLVED");
  assert.ok(frontier.tangencyPortfolio.maxSharpeRatio > 2.0);
  assert.ok(frontier.frontierCurve.length >= 10);
});

test("Telegram 1-Tap Signal Confirmation Gate creates alert and executes order on callback tap", () => {
  const alert = createTradeSignalAlert({
    symbol: "AAPL",
    side: "BUY",
    quantity: 5,
    convictionScore: 95
  });

  assert.ok(alert.signalId.startsWith("SIG_"));
  assert.equal(alert.signal.symbol, "AAPL");
  assert.equal(alert.replyMarkup.inline_keyboard.length, 1);

  const pending = getPendingSignalsList();
  assert.ok(pending.some(s => s.signalId === alert.signalId));

  const callbackRes = handleTelegramSignalCallback({ callbackData: `EXEC_${alert.signalId}` });
  assert.equal(callbackRes.status, "ORDER_EXECUTED_VIA_TELEGRAM_TAP");
  assert.equal(callbackRes.symbol, "AAPL");
  assert.equal(callbackRes.quantity, 5);
});
