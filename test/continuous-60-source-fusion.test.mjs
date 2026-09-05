import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceFusionEngine,
  getLive60SourceAlphaMatrix
} from "../src/continuous-60-source-fusion.mjs";

test("Continuous 60-Source Fusion Engine runs cycle across multi-asset watchlist", () => {
  sourceFusionEngine.runCycle();
  const matrix = getLive60SourceAlphaMatrix();

  assert.equal(matrix.totalSourcesQueried, 60);
  assert.equal(matrix.totalAssetsTracked, 8);
  assert.ok(matrix.cycleCount >= 1);
  assert.ok(matrix.lastScanTimestamp);

  // Check tracked assets in the live matrix
  const assets = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "NVDA", "AAPL", "MSFT", "TSLA", "SPY"];
  for (const sym of assets) {
    const item = matrix.matrix[sym];
    assert.ok(item, `Expected ${sym} in live alpha matrix`);
    assert.equal(item.symbol, sym);
    assert.ok(typeof item.alphaScore === "number");
    assert.ok(item.verdict);
    assert.ok(item.subEngines);
    assert.equal(item.subEngines.afmlFractionalD, 0.4);
    assert.ok(typeof item.subEngines.optionsDelta === "number");
    assert.ok(typeof item.subEngines.pmmSpreadBps === "number");
    assert.ok(typeof item.subEngines.dupontRoePercent === "number");
    assert.ok(typeof item.subEngines.geopoliticalIndex === "number");
    assert.ok(["BUY", "HOLD", "SELL"].includes(item.subEngines.rlAction));
  }
});

test("Continuous 60-Source Fusion Engine captures high conviction confluences", () => {
  const matrix = getLive60SourceAlphaMatrix();
  assert.ok(Array.isArray(matrix.recentAlerts));
});
