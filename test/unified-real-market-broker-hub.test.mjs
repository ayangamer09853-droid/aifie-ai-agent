import test from 'node:test';
import assert from 'node:assert/strict';
import {
  unifiedRealMarketBrokerHub,
  DhanHQBrokerAdapter,
  ShoonyaFinvasiaAdapter,
  BinanceLiveDirectAdapter,
  YahooFinanceNativeProvider
} from '../src/broker/unified-real-market-broker-hub.mjs';
import { createQuantResearchMcpServer } from '../src/mcp/servers/quant-research-mcp.mjs';

process.env.ENABLE_LIVE_TRADING = 'true';
process.env.LIVE_TRADING_ENABLED = 'true';

test('Real Market Hub: DhanHQ Zero-Fee Indian Broker Adapter', async (t) => {
  const dhan = new DhanHQBrokerAdapter();
  const funds = await dhan.getFundLimits();
  assert.ok(funds.currency === 'INR', 'Dhan funds must be denominated in INR');
  assert.ok(typeof funds.configured === 'boolean', 'Configured flag must be boolean');

  // Simulated order placement
  const orderRes = await dhan.placeOrder({
    symbol: 'RELIANCE',
    side: 'BUY',
    quantity: 10,
    price: 2980.50
  });

  assert.equal(orderRes.success, true);
  assert.equal(orderRes.broker, 'DHAN_HQ');
  assert.equal(orderRes.symbol, 'RELIANCE');
  assert.ok(orderRes.orderId.startsWith('DHAN_'));
});

test('Real Market Hub: Shoonya Finvasia Zero-Brokerage Adapter', async (t) => {
  const shoonya = new ShoonyaFinvasiaAdapter();
  const limits = await shoonya.getLimits();
  assert.equal(limits.broker, 'SHOONYA_FINVASIA');
  assert.equal(limits.zeroBrokerageActive, true);
  assert.equal(limits.currency, 'INR');
});

test('Real Market Hub: Binance Live Crypto Adapter with HMAC Signature', async (t) => {
  const binance = new BinanceLiveDirectAdapter({
    apiKey: 'test_key',
    apiSecret: 'test_secret_12345'
  });

  const sig = binance.generateSignature('symbol=BTCUSDT&timestamp=1690000000');
  assert.ok(sig.length === 64, 'HMAC-SHA256 signature must be 64-char hex string');

  const balances = await binance.getAccountBalances();
  assert.ok(balances.balances.length > 0, 'Should return asset balances');
  assert.ok(balances.totalUsdEquivalent > 0, 'Total USD equivalent should be positive');

  // Place order
  const orderRes = await binance.placeOrder({
    symbol: 'BTCUSDT',
    side: 'BUY',
    quantity: 0.1,
    price: 87500
  });

  assert.equal(orderRes.success, true);
  assert.equal(orderRes.broker, 'BINANCE_LIVE');
  assert.equal(orderRes.status, 'FILLED');
});

test('Real Market Hub: Yahoo Finance Zero-Cost Global Market Data Feed', async (t) => {
  const yahoo = new YahooFinanceNativeProvider();

  // Test Indian Stock / Index
  const niftyQuote = await yahoo.fetchLiveQuote('NIFTY');
  assert.equal(niftyQuote.provider, 'YAHOO_FINANCE_FREE');
  assert.ok(niftyQuote.price > 20000, 'NIFTY price should be realistic');
  assert.equal(niftyQuote.cost, '100%_FREE');

  // Test Crypto
  const btcQuote = await yahoo.fetchLiveQuote('BTCUSDT');
  assert.ok(btcQuote.price > 50000, 'BTC price should be realistic');

  // Test US Tech Stock
  const nvdaQuote = await yahoo.fetchLiveQuote('NVDA');
  assert.ok(nvdaQuote.price > 100, 'NVDA price should be realistic');
});

test('Real Market Hub: Master Router Auto-Routing & Status', async (t) => {
  const status = unifiedRealMarketBrokerHub.getBrokersStatus();
  assert.equal(status.totalBrokers, 3);
  assert.equal(status.freeMarketDataAccess, '100%_ACTIVE_UNLIMITED');
  assert.ok(status.brokers.dhan_hq);
  assert.ok(status.brokers.binance);
  assert.ok(status.brokers.shoonya);

  // Auto-route Indian stock to Dhan
  const dhanOrder = await unifiedRealMarketBrokerHub.executeLiveOrder({
    venue: 'DHAN',
    symbol: 'RELIANCE',
    side: 'BUY',
    quantity: 5,
    price: 2950
  });
  assert.equal(dhanOrder.broker, 'DHAN_HQ');

  // Auto-route Crypto to Binance
  const btcOrder = await unifiedRealMarketBrokerHub.executeLiveOrder({
    venue: 'BINANCE',
    symbol: 'BTCUSDT',
    side: 'BUY',
    quantity: 0.05,
    price: 87000
  });
  assert.equal(btcOrder.broker, 'BINANCE_LIVE');
});

test('MCP Hub: Tools 77, 78, 79 Registration & Execution', async (t) => {
  const mcpServer = createQuantResearchMcpServer();
  assert.ok(mcpServer.tools.has('execute_live_market_order'), 'Tool 77 must be registered');
  assert.ok(mcpServer.tools.has('get_live_broker_accounts_status'), 'Tool 78 must be registered');
  assert.ok(mcpServer.tools.has('fetch_free_realtime_market_feed'), 'Tool 79 must be registered');

  // Call Tool 78
  const statusRes = await mcpServer.callTool('get_live_broker_accounts_status', {});
  assert.equal(statusRes.totalBrokers, 3);

  // Call Tool 79 (fetch_free_realtime_market_feed)
  const feedRes = await mcpServer.callTool('fetch_free_realtime_market_feed', { symbol: 'NIFTY' });
  assert.equal(feedRes.provider, 'YAHOO_FINANCE_FREE');
  assert.equal(feedRes.cost, '100%_FREE');
});
