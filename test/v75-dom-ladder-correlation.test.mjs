import test from "node:test";
import assert from "node:assert/strict";
import { getDepthOfMarketLadder } from "../src/dom-ladder-market-depth-engine.mjs";
import { getCrossAssetCorrelationMatrix } from "../src/cross-asset-correlation-regime.mjs";

test("DOM Ladder calculates 20 depth levels, volume bars, and detects liquidity walls", () => {
  const dom = getDepthOfMarketLadder({ symbol: "BTC/USDT", centerPrice: 87500.00, tickSize: 10, depthLevels: 10 });
  assert.equal(dom.domStatus, "DOM_LADDER_ACTIVE");
  assert.equal(dom.bids.length, 10);
  assert.equal(dom.asks.length, 10);
  assert.ok(dom.totalBidVolume > 0);
  assert.ok(dom.totalAskVolume > 0);
  assert.ok(dom.bids.some(b => b.isLiquidityWall));
});

test("Cross-Asset Correlation Matrix computes 6-asset matrix and detects high correlation pairs", () => {
  const corr = getCrossAssetCorrelationMatrix();
  assert.equal(corr.matrixStatus, "CORRELATION_MATRIX_ONLINE");
  assert.equal(corr.trackedAssets.length, 6);
  assert.equal(corr.matrix.BTC.BTC, 1.00);
  assert.ok(corr.matrix.BTC.ETH > 0.75);
  assert.ok(corr.highCorrelations.length >= 1);
});
