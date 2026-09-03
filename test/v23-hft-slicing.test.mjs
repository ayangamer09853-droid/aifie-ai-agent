import test from "node:test";
import assert from "node:assert/strict";
import { getHftExecutionStatus, calculateImplementationShortfall, executePovSlicingOrder } from "../src/hft-order-slicing-router.mjs";

test("getHftExecutionStatus reports HFT POV active status and rebate capture rate", () => {
  const status = getHftExecutionStatus();
  assert.equal(status.hftStatus, "HFT_POV_SLICING_ACTIVE");
  assert.equal(status.executionVenuesConnected, 12);
});

test("calculateImplementationShortfall computes execution drag in bps", () => {
  const is = calculateImplementationShortfall(150.0, 150.02, 100);
  assert.equal(is.shortfallCostUSD, 2);
  assert.equal(is.shortfallBps, 1.33);
  assert.equal(is.qualityRating, "EXCELLENT_INSTITUTIONAL_FILL");
});

test("executePovSlicingOrder slices large orders to fit tape volume participation", () => {
  const slice = executePovSlicingOrder({ symbol: "AAPL", side: "BUY", totalQuantity: 10, currentPrice: 150.0, targetPovPercent: 2.0 });
  assert.equal(slice.executionStatus, "POV_HFT_ORDER_SLICED_EXECUTED");
  assert.equal(slice.symbol, "AAPL");
  assert.ok(slice.slicesCount >= 2);
  assert.equal(slice.stealthVenue, "Alpaca_SOR_DarkPool_Gateway");
});
