import test from "node:test";
import assert from "node:assert/strict";
import { getCcxtEngineStatus, fetchLiveExchangeTicker, executeCcxtOrder } from "../src/ccxt-live-exchange-engine.mjs";
import { getAlpacaStreamStatus, fetchAlpacaAccountMetrics, submitAlpacaOrder } from "../src/alpaca-live-stream-engine.mjs";
import { getSmartOrderRouterStatus, routeOptimalExecutionVenue, sliceTwapOrder } from "../src/institutional-smart-order-router.mjs";
import { recordLedgerTransaction, getLedgerSummary } from "../src/real-pnl-accounting-ledger.mjs";

test("CCXT Live Exchange Engine reports online and supports 100+ exchanges", async () => {
  const status = getCcxtEngineStatus();
  assert.equal(status.engineStatus, "CCXT_LIVE_EXCHANGE_ENGINE_ONLINE");
  assert.ok(status.supportedExchangesCount > 50);

  const ticker = await fetchLiveExchangeTicker({ exchange: "binance", symbol: "BTC/USDT" });
  assert.ok(ticker.lastPrice > 0);
  assert.ok(ticker.exchange, "binance");

  const simOrder = await executeCcxtOrder({ exchange: "binance", symbol: "BTC/USDT", amount: 0.05 });
  assert.ok(simOrder.orderId);
  assert.equal(simOrder.status, "FILLED_SIMULATED");
});

test("Alpaca Live Stream Engine reports metrics and order submission", async () => {
  const status = getAlpacaStreamStatus();
  assert.equal(status.streamEngineStatus, "ALPACA_LIVE_STREAM_ONLINE");

  const account = await fetchAlpacaAccountMetrics();
  assert.ok(account.equity >= 0);

  const order = await submitAlpacaOrder({ symbol: "AAPL", qty: 2 });
  assert.ok(order.id);
  assert.equal(order.status, "FILLED_SIMULATED");
});

test("Institutional Smart Order Router selects lowest cost venue and slices TWAP", () => {
  const sorStatus = getSmartOrderRouterStatus();
  assert.equal(sorStatus.sorStatus, "INSTITUTIONAL_SOR_ONLINE");

  const route = routeOptimalExecutionVenue({ symbol: "BTC", amountUSD: 50000 });
  assert.equal(route.routingDecision, "VENUE_SELECTED");
  assert.ok(route.recommendedVenue);
  assert.ok(route.estimatedTotalCostBps > 0);

  const twap = sliceTwapOrder({ symbol: "AAPL", totalQuantity: 60, durationMinutes: 30, slicesCount: 6 });
  assert.equal(twap.schedule.length, 6);
  assert.equal(twap.schedule[0].targetQuantity, 10);
});

test("Real-Time Ledger records transactions and computes realized PnL", () => {
  const tx = recordLedgerTransaction({ symbol: "AAPL", side: "BUY", quantity: 5, fillPrice: 150.00, feeUSD: 1.00, realizedPnLUSD: 25.00 });
  assert.equal(tx.status, "TRANSACTION_RECORDED");
  assert.ok(tx.cumulativeRealizedPnLUSD >= 25.00);

  const summary = getLedgerSummary();
  assert.equal(summary.ledgerStatus, "ACCOUNTING_LEDGER_ONLINE");
  assert.ok(summary.totalRecordedTransactions >= 1);
});
