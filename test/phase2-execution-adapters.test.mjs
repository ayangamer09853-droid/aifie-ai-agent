import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";

import {
  routeOptimalExecutionVenue,
  compareVenueQuotes,
  estimateMarketImpactSlippage,
  getSmartOrderRouterStatus
} from "../src/smart-order-router.mjs";

import {
  generateTwapSlices,
  generateVwapSlices,
  generateIcebergOrder,
  calculatePovParticipationRate,
  getSlicersEngineStatus
} from "../src/algo-execution-slicers.mjs";

import {
  buildSignedBinanceOrder,
  dispatchBinanceOrder,
  cancelBinanceOrder,
  fetchBinanceAccountBalances,
  getBinanceAdapterStatus
} from "../src/broker-adapter-binance.mjs";

import {
  buildAlpacaOrderPayload,
  dispatchAlpacaOrder,
  cancelAlpacaOrder,
  fetchAlpacaPositions,
  getAlpacaAdapterStatus
} from "../src/broker-adapter-alpaca.mjs";

import {
  validatePreTradeRisk,
  checkDrawdownBreach,
  assertExecutionAuthority,
  triggerEmergencyKillSwitch,
  resetSafetyFortress,
  getSafetyFortressStatus
} from "../src/execution-safety-fortress.mjs";

import {
  recordLedgerTransaction,
  matchFifoTrade,
  calculateUnrealizedPnL,
  getAccountingSummary,
  clearLedger
} from "../src/accounting-ledger.mjs";

let server;
let baseUrl;

test.before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
});

test("Phase 2: Smart Order Router compares venues, calculates market impact, and chooses optimal route", () => {
  const status = getSmartOrderRouterStatus();
  assert.equal(status.status, "SMART_ORDER_ROUTER_ONLINE");

  // Market impact square-root model
  const slippageSmall = estimateMarketImpactSlippage(10, 100, 1000000);
  const slippageLarge = estimateMarketImpactSlippage(10000, 100, 1000000);
  assert.ok(slippageLarge > slippageSmall);

  // Quote comparison
  const comparison = compareVenueQuotes({ symbol: "BTCUSDT", amountUSD: 5000, isCrypto: true });
  assert.ok(comparison.rankedVenues.length > 0);
  assert.ok(comparison.rankedVenues[0].totalCostBps <= comparison.rankedVenues[comparison.rankedVenues.length - 1].totalCostBps);

  // Route decision
  const route = routeOptimalExecutionVenue({ symbol: "BTCUSDT", side: "buy", quantity: 1, price: 87000 });
  assert.equal(route.symbol, "BTCUSDT");
  assert.equal(route.side, "buy");
  assert.ok(route.selectedVenue);
  assert.ok(route.executionStrategy);
  assert.ok(route.estimatedTotalCostBps > 0);
});

test("Phase 2: Algorithmic slicers generate verified TWAP, VWAP, Iceberg, and POV plans", () => {
  const slicerStatus = getSlicersEngineStatus();
  assert.equal(slicerStatus.status, "ALGO_SLICERS_ONLINE");

  // 1. TWAP Plan: Total quantity must match sum of slices
  const twap = generateTwapSlices({ symbol: "AAPL", side: "buy", totalQuantity: 100, durationMinutes: 20, slicesCount: 5 });
  assert.equal(twap.totalQuantity, 100);
  assert.equal(twap.slices.length, 5);
  const twapSum = twap.slices.reduce((acc, s) => acc + s.quantity, 0);
  assert.equal(twapSum, 100);

  // 2. VWAP Plan: Total quantity must match sum of slices
  const vwap = generateVwapSlices({ symbol: "NVDA", side: "buy", totalQuantity: 150 });
  assert.equal(vwap.totalQuantity, 150);
  const vwapSum = vwap.slices.reduce((acc, s) => acc + s.quantity, 0);
  assert.equal(vwapSum, 150);

  // 3. Iceberg Order: Tip vs Hidden Reserve
  const iceberg = generateIcebergOrder({ symbol: "SPY", side: "buy", totalQuantity: 500, visibleSize: 50, limitPrice: 560 });
  assert.equal(iceberg.totalQuantity, 500);
  assert.equal(iceberg.visibleSize, 50);
  assert.equal(iceberg.hiddenReserve, 450);
  assert.equal(iceberg.currentTipOrder.quantity, 50);

  // 4. POV Participation Rate
  const pov = calculatePovParticipationRate({ targetParticipationPercent: 10, marketIntervalVolume: 2000, remainingOrderQuantity: 500 });
  assert.equal(pov.scheduledSliceQuantity, 200); // 10% of 2000
  assert.equal(pov.remainingQuantity, 300);
});

test("Phase 2: Binance Broker Adapter generates signed payloads and handles dry-run dispatch", async () => {
  const status = getBinanceAdapterStatus();
  assert.equal(status.status, "READY");

  const orderPayload = buildSignedBinanceOrder({ symbol: "BTCUSDT", side: "BUY", quantity: 0.05, type: "MARKET" });
  assert.equal(orderPayload.symbol, "BTCUSDT");
  assert.equal(orderPayload.side, "BUY");
  assert.ok(orderPayload.signature);
  assert.ok(orderPayload.dryRunUrl.includes("/api/v3/order/test"));

  const dispatch = await dispatchBinanceOrder({ symbol: "BTCUSDT", side: "BUY", quantity: 0.01 }, { dryRun: true });
  assert.equal(dispatch.success, true);
  assert.equal(dispatch.dryRun, true);
  assert.ok(dispatch.orderId);

  const cancel = await cancelBinanceOrder({ symbol: "BTCUSDT", orderId: dispatch.orderId });
  assert.equal(cancel.success, true);

  const balances = await fetchBinanceAccountBalances();
  assert.ok(Array.isArray(balances.balances));
});

test("Phase 2: Alpaca Broker Adapter validates order types, dispatches paper orders, and fetches positions", async () => {
  const status = getAlpacaAdapterStatus();
  assert.equal(status.status, "READY");

  // Market order payload
  const mkt = buildAlpacaOrderPayload({ symbol: "AAPL", side: "buy", quantity: 10, type: "market" });
  assert.equal(mkt.symbol, "AAPL");
  assert.equal(mkt.type, "market");

  // Limit order payload requires limit_price
  assert.throws(() => buildAlpacaOrderPayload({ symbol: "AAPL", type: "limit" }));
  const lmt = buildAlpacaOrderPayload({ symbol: "AAPL", type: "limit", limitPrice: 225 });
  assert.equal(lmt.limit_price, "225");

  // Paper dispatch
  const dispatch = await dispatchAlpacaOrder({ symbol: "AAPL", side: "buy", quantity: 5 }, { isPaper: true });
  assert.equal(dispatch.success, true);
  assert.equal(dispatch.isPaper, true);
  assert.ok(dispatch.orderId);

  const cancel = await cancelAlpacaOrder(dispatch.orderId);
  assert.equal(cancel.success, true);

  const positions = await fetchAlpacaPositions();
  assert.equal(positions.success, true);
  assert.ok(Array.isArray(positions.positions));
});

test("Phase 2: Execution Safety Fortress enforces notional limits, buying power, concentration, and drawdown circuit breaker", () => {
  resetSafetyFortress();
  const status = getSafetyFortressStatus();
  assert.equal(status.status, "SAFETY_FORTRESS_ONLINE");
  assert.equal(status.emergencyHaltActive, false);

  const account = { cash: 50000, equity: 100000 };

  // Valid order approved
  const valid = validatePreTradeRisk({ symbol: "AAPL", quantity: 10, price: 150 }, account);
  assert.equal(valid.approved, true);

  // Exceeds max notional ($50k)
  const huge = validatePreTradeRisk({ symbol: "AAPL", quantity: 1000, price: 100 }, account); // $100k
  assert.equal(huge.approved, false);
  assert.equal(huge.reason, "MAX_NOTIONAL_EXCEEDED");

  // Insufficient buying power
  const poor = validatePreTradeRisk({ symbol: "AAPL", quantity: 100, price: 150 }, { cash: 1000, equity: 100000 });
  assert.equal(poor.approved, false);
  assert.equal(poor.reason, "INSUFFICIENT_BUYING_POWER");

  // Concentration cap (> 25% of equity)
  const concentrated = validatePreTradeRisk({ symbol: "AAPL", quantity: 200, price: 150 }, { cash: 50000, equity: 100000 }); // $30k > 25k
  assert.equal(concentrated.approved, false);
  assert.equal(concentrated.reason, "PORTFOLIO_CONCENTRATION_EXCEEDED");

  // Drawdown circuit breaker trip at >= 3.0%
  const normalDrawdown = checkDrawdownBreach(98000, 100000, 3.0); // 2% drawdown
  assert.equal(normalDrawdown.isBreached, false);

  const severeDrawdown = checkDrawdownBreach(96000, 100000, 3.0); // 4% drawdown
  assert.equal(severeDrawdown.isBreached, true);
  assert.equal(getSafetyFortressStatus().emergencyHaltActive, true);

  // While emergency halt is active, any trade is rejected
  const blocked = validatePreTradeRisk({ symbol: "AAPL", quantity: 1, price: 100 }, account);
  assert.equal(blocked.approved, false);
  assert.ok(blocked.reason.includes("EMERGENCY_HALT_ACTIVE"));

  // Authority gatekeeper
  resetSafetyFortress();
  assert.throws(() => assertExecutionAuthority("live", false));
});

test("Phase 2: Double-entry accounting ledger accurately tracks transactions, fees, and FIFO realized PnL", () => {
  clearLedger();

  // Buy 10 AAPL @ $100
  const buy1 = recordLedgerTransaction({ symbol: "AAPL", side: "BUY", quantity: 10, price: 100, fee: 1.0 });
  assert.equal(buy1.status, "TRANSACTION_COMMITTED");
  assert.equal(buy1.cumulativeRealizedPnL, 0);

  // Buy 10 AAPL @ $110
  recordLedgerTransaction({ symbol: "AAPL", side: "BUY", quantity: 10, price: 110, fee: 1.0 });

  // Sell 15 AAPL @ $120
  // FIFO matching:
  // First 10 shares matched against Lot 1 ($100): profit = (120 - 100) * 10 = +$200
  // Next 5 shares matched against Lot 2 ($110): profit = (120 - 110) * 5 = +$50
  // Total Realized PnL = $250
  const sell1 = recordLedgerTransaction({ symbol: "AAPL", side: "SELL", quantity: 15, price: 120, fee: 2.0 });
  assert.equal(sell1.entry.realizedPnL, 250);
  assert.equal(sell1.cumulativeRealizedPnL, 250);
  assert.equal(sell1.cumulativeFeesPaid, 4.0); // 1 + 1 + 2
  assert.equal(sell1.netProfitUSD, 246.0); // 250 - 4

  const summary = getAccountingSummary({ AAPL: 130 });
  assert.equal(summary.cumulativeRealizedPnLUSD, 250);
  assert.equal(summary.netRealizedProfitUSD, 246);
  // Remaining 5 shares of AAPL @ $110 cost basis. At current price $130, unrealized PnL = (130 - 110) * 5 = +$100
  assert.equal(summary.totalUnrealizedPnLUSD, 100);
  assert.equal(summary.netPortfolioPnLUSD, 346); // 246 net realized + 100 unrealized
});

test("Phase 2: Server exposes execution endpoints (route, twap, vwap, iceberg, dispatch, ledger, status)", async () => {
  resetSafetyFortress();

  // 1. SOR Route endpoint
  const routeRes = await fetch(`${baseUrl}/api/execution/route`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "BTCUSDT", side: "buy", quantity: 0.5, price: 87000 })
  });
  assert.equal(routeRes.status, 200);
  const routeData = await routeRes.json();
  assert.equal(routeData.success, true);
  assert.ok(routeData.route.selectedVenue);

  // 2. TWAP endpoint
  const twapRes = await fetch(`${baseUrl}/api/execution/twap`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "AAPL", side: "buy", totalQuantity: 60, slicesCount: 3 })
  });
  assert.equal(twapRes.status, 200);
  const twapData = await twapRes.json();
  assert.equal(twapData.success, true);
  assert.equal(twapData.plan.slices.length, 3);

  // 3. Iceberg endpoint
  const iceRes = await fetch(`${baseUrl}/api/execution/iceberg`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "SPY", side: "buy", totalQuantity: 300, visibleSize: 50, limitPrice: 560 })
  });
  assert.equal(iceRes.status, 200);
  const iceData = await iceRes.json();
  assert.equal(iceData.success, true);
  assert.equal(iceData.plan.visibleSize, 50);

  // 4. Dispatch endpoint (fails closed on unconfirmed live mode)
  const unauthRes = await fetch(`${baseUrl}/api/execution/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 1, mode: "live", confirm: false })
  });
  assert.equal(unauthRes.status, 400);

  // 5. Dispatch endpoint (succeeds in paper mode)
  const paperRes = await fetch(`${baseUrl}/api/execution/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "AAPL", side: "buy", quantity: 5, price: 150, mode: "paper" })
  });
  assert.equal(paperRes.status, 200);
  const paperData = await paperRes.json();
  assert.equal(paperData.success, true);
  assert.ok(paperData.dispatch);
  assert.ok(paperData.ledger);

  // 6. Ledger endpoint
  const lRes = await fetch(`${baseUrl}/api/execution/ledger`);
  assert.equal(lRes.status, 200);
  const lData = await lRes.json();
  assert.equal(lData.success, true);
  assert.ok(lData.ledger);

  // 7. Status endpoint
  const sRes = await fetch(`${baseUrl}/api/execution/status`);
  assert.equal(sRes.status, 200);
  const sData = await sRes.json();
  assert.equal(sData.success, true);
  assert.equal(sData.phase, "PHASE_2_EXECUTION_ENGINE");
  assert.ok(sData.sor);
  assert.ok(sData.slicers);
  assert.ok(sData.safety);
  assert.ok(sData.adapters);
});
