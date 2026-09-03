import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import { getMultiBrokerSandboxStatus, executeSandboxBrokerOrder, getSandboxOrdersHistory } from "../src/institutional-multi-broker-sandbox-gateway.mjs";
import { runStrategyHyperOptimization, getStrategyOptimizationRankings } from "../src/strategy-hyper-optimizer.mjs";

test("multi-broker sandbox gateway provides fail-closed security and 5 supported venues", () => {
  const status = getMultiBrokerSandboxStatus();
  assert.equal(status.status, "SANDBOX_GATEWAY_ACTIVE");
  assert.equal(status.securityBoundary.liveOrderAuthority, false);
  assert.equal(status.totalSupportedVenuesCount, 5);
  assert.ok(status.connectedSandboxVenues.some(v => v.venue === "BINANCE_TESTNET"));
  assert.ok(status.connectedSandboxVenues.some(v => v.venue === "ALPACA_PAPER"));
  assert.ok(status.connectedSandboxVenues.some(v => v.venue === "BYBIT_TESTNET"));
});

test("executeSandboxBrokerOrder routes testnet order and rejects over-leveraged notional", () => {
  const orderRes = executeSandboxBrokerOrder({
    venue: "binanceTestnet",
    symbol: "BTC/USDT",
    side: "BUY",
    quantity: 0.1,
    price: 88000
  });
  assert.equal(orderRes.success, true);
  assert.equal(orderRes.order.status, "FILLED_IN_SANDBOX");
  assert.equal(orderRes.order.symbol, "BTC/USDT");

  const oversized = executeSandboxBrokerOrder({
    quantity: 50,
    price: 88000 // $4.4M > $250k cap
  });
  assert.equal(oversized.success, false);
  assert.equal(oversized.error, "ORDER_REJECTED_EXCEEDS_SANDBOX_NOTIONAL_CAP");
});

test("strategy hyper-optimizer ranks top 5 alpha strategies with Kelly position sizing", () => {
  const opt = runStrategyHyperOptimization({ targetTimeframe: "15m" });
  assert.equal(opt.engine, "AIFIE_APEX_STRATEGY_HYPER_OPTIMIZER_V100");
  assert.equal(opt.topRankedAlphaStrategies.length, 5);
  assert.ok(opt.topRankedAlphaStrategies[0].metrics.sharpeRatio >= 2.0);
  assert.ok(opt.topRankedAlphaStrategies[0].metrics.recommendedKellyAllocationPercent);
});

test("Apex v100 sandbox and hyper-optimizer HTTP endpoints respond with 200 OK", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const sbxRes = await fetch(`${baseUrl}/api/v100/broker-sandbox/status`);
    assert.equal(sbxRes.status, 200);
    const sbxData = await sbxRes.json();
    assert.equal(sbxData.status, "SANDBOX_GATEWAY_ACTIVE");

    const orderRes = await fetch(`${baseUrl}/api/v100/broker-sandbox/order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venue: "alpacaPaper", symbol: "AAPL", side: "BUY", quantity: 5, price: 230 })
    });
    assert.equal(orderRes.status, 200);
    const orderData = await orderRes.json();
    assert.equal(orderData.success, true);

    const optRes = await fetch(`${baseUrl}/api/v100/optimizer/rankings`);
    assert.equal(optRes.status, 200);
    const optData = await optRes.json();
    assert.equal(optData.topRankedAlphaStrategies.length, 5);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
