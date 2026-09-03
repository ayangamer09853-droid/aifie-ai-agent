import test from "node:test";
import assert from "node:assert/strict";
import { configureLiveBroker, disableLiveTrading, enableLiveTrading, getLiveBrokerStatus, placeLiveOrder } from "../src/live-broker.mjs";

test("getLiveBrokerStatus reports initial locked state", () => {
  disableLiveTrading();
  const status = getLiveBrokerStatus();
  assert.equal(status.isLiveModeUnlocked, false);
});

test("enableLiveTrading requires explicit user confirmation", () => {
  disableLiveTrading();
  assert.throws(() => enableLiveTrading(false), /explicit user confirmation/);
  const status = enableLiveTrading(true);
  assert.equal(status.isLiveModeUnlocked, true);
  disableLiveTrading();
});

test("placeLiveOrder rejects execution when live mode is locked", () => {
  disableLiveTrading();
  assert.throws(
    () => placeLiveOrder({ symbol: "AAPL", side: "buy", quantity: 1, price: 150 }),
    /Live execution locked/
  );
});

test("placeLiveOrder rejects orders exceeding maximum notional safety gate", () => {
  disableLiveTrading();
  enableLiveTrading(true);
  configureLiveBroker({ maxNotionalPerOrder: 500 });
  assert.throws(
    () => placeLiveOrder({ symbol: "AAPL", side: "buy", quantity: 10, price: 100 }), // $1000 > $500
    /exceeds maximum allowed notional/
  );
  disableLiveTrading();
});

test("placeLiveOrder executes successfully when live mode is unlocked within safety limits", () => {
  disableLiveTrading();
  enableLiveTrading(true);
  configureLiveBroker({ maxNotionalPerOrder: 2000 });
  const fill = placeLiveOrder({ symbol: "AAPL", side: "buy", quantity: 1, price: 150 });
  assert.equal(fill.symbol, "AAPL");
  assert.equal(fill.side, "buy");
  assert.equal(fill.status, "FILLED");
  assert.equal(fill.executedPrice, 150);
  disableLiveTrading();
});
