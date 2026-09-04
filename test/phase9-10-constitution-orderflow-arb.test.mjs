import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../server.mjs';
import { ConstitutionalConstraintsGuard, CONSTITUTIONAL_LIMITS } from '../src/constitutional-constraints-guard.mjs';
import { OrderFlowWhaleTracker } from '../src/order-flow-whale-tape.mjs';
import { CrossExchangeArbitrageEngine } from '../src/cross-exchange-arbitrage.mjs';

test('Constitutional Guard: Enforces Rule 1 (Daily Loss Ceiling) and Rule 2 (Drawdown Brake)', () => {
  const guard = new ConstitutionalConstraintsGuard();

  // Rule 1: Exceeded Daily Loss Limit ($1,000)
  const lossContext = {
    order: { symbol: 'AAPL', price: 150, qty: 10 },
    dailyStats: { realizedLoss: 800, unrealizedLoss: 300 }, // Total $1,100 > $1,000
    portfolio: { equity: 100000, totalExposure: 5000, drawdown: 0.05 }
  };
  const lossResult = guard.validateOrder(lossContext);
  assert.equal(lossResult.permitted, false);
  assert.equal(lossResult.rule, 'RULE_1_DAILY_LOSS_CEILING');

  // Rule 2: Exceeded Peak-to-Trough Drawdown (20%)
  const ddContext = {
    order: { symbol: 'AAPL', price: 150, qty: 10 },
    dailyStats: { realizedLoss: 100, unrealizedLoss: 100 },
    portfolio: { equity: 80000, totalExposure: 10000, drawdown: 0.22 } // 22% > 20%
  };
  const ddResult = guard.validateOrder(ddContext);
  assert.equal(ddResult.permitted, false);
  assert.equal(ddResult.rule, 'RULE_2_MAX_DRAWDOWN_EXCEEDED');
});

test('Constitutional Guard: Enforces Rule 3 (Leverage Cap), Rule 4 (Concentration), and Rule 8 (BFT Quorum)', () => {
  const guard = new ConstitutionalConstraintsGuard();

  // Rule 3: Leverage Cap (> 2.0x)
  const levContext = {
    order: { symbol: 'BTCUSDT', price: 60000, qty: 2 }, // $120k + $100k exposure = $220k on $100k equity = 2.2x
    portfolio: { equity: 100000, totalExposure: 100000, drawdown: 0.02, assetExposure: {} }
  };
  const levResult = guard.validateOrder(levContext);
  assert.equal(levResult.permitted, false);
  assert.equal(levResult.rule, 'RULE_3_LEVERAGE_CAP_EXCEEDED');

  // Rule 4: Concentration Cap (> 25%)
  const concContext = {
    order: { symbol: 'TSLA', price: 200, qty: 150 }, // $30,000 on $100,000 equity = 30% > 25%
    portfolio: { equity: 100000, totalExposure: 30000, drawdown: 0.01, assetExposure: { TSLA: 0 } }
  };
  const concResult = guard.validateOrder(concContext);
  assert.equal(concResult.permitted, false);
  assert.equal(concResult.rule, 'RULE_4_CONCENTRATION_CAP_EXCEEDED');

  // Rule 8: BFT Quorum Failure (< 3 approvals)
  const bftContext = {
    order: { symbol: 'AAPL', price: 150, qty: 10 },
    portfolio: { equity: 100000, totalExposure: 5000, drawdown: 0.02, assetExposure: {} },
    bftVotes: [
      { lane: 'RISK', approved: true },
      { lane: 'ALPHA', approved: true },
      { lane: 'SMC', approved: false },
      { lane: 'MICROSTRUCTURE', approved: false },
      { lane: 'PORTFOLIO', approved: false }
    ] // Only 2 of 5
  };
  const bftResult = guard.validateOrder(bftContext);
  assert.equal(bftResult.permitted, false);
  assert.equal(bftResult.rule, 'RULE_8_BFT_QUORUM_FAILED');

  // Approved trade satisfying all invariants
  const approvedContext = {
    order: { symbol: 'MSFT', price: 400, qty: 10 }, // $4,000 notional (4%)
    portfolio: { equity: 100000, totalExposure: 10000, drawdown: 0.01, assetExposure: {} },
    bftVotes: [
      { lane: 'RISK', approved: true },
      { lane: 'ALPHA', approved: true },
      { lane: 'SMC', approved: true },
      { lane: 'MICROSTRUCTURE', approved: true },
      { lane: 'PORTFOLIO', approved: false }
    ] // 4 of 5
  };
  const approved = guard.validateOrder(approvedContext);
  assert.equal(approved.permitted, true);
  assert.equal(approved.code, 'CONSTITUTIONAL_APPROVAL');
});

test('Constitutional Guard: Rule 7 Sovereign Profit Sweep (20% above $10k)', () => {
  const guard = new ConstitutionalConstraintsGuard();

  // $5,000 profit -> no sweep
  const sweepNo = guard.evaluateProfitSweep(5000);
  assert.equal(sweepNo.sweepTriggered, false);

  // $15,000 profit -> 20% sweep = $3,000 swept
  const sweepYes = guard.evaluateProfitSweep(15000);
  assert.equal(sweepYes.sweepTriggered, true);
  assert.equal(sweepYes.sweepAmount, 3000);
  assert.equal(sweepYes.remainingTradingProfit, 12000);
});

test('Phase 9: Order Flow Engine tracks Trade Ticks, CVD, and detects Whales', () => {
  const tracker = new OrderFlowWhaleTracker({ whaleThresholdNotional: 250000 });

  // Normal trades
  tracker.processTradeTick({ price: 65000, size: 1.5, side: 'buy', symbol: 'BTCUSDT' });
  tracker.processTradeTick({ price: 65000, size: 0.8, side: 'sell', symbol: 'BTCUSDT' });

  // Whale trade (> $250k: 5 BTC * $65,000 = $325,000)
  const whaleTick = tracker.processTradeTick({ price: 65000, size: 5, side: 'buy', symbol: 'BTCUSDT' });
  assert.equal(whaleTick.notional, 325000);

  const status = tracker.getStatus();
  assert.equal(status.recentWhalesCount, 1);
  assert.equal(status.lastWhaleEvent.notional, 325000);

  // Order Book Whale Walls
  const bids = [
    ['64900', '1.0'],
    ['64500', '10.0'] // $645,000 notional -> Whale Bid Wall
  ];
  const asks = [
    ['65100', '0.5'],
    ['65200', '1.2']
  ];
  const walls = tracker.detectWhaleWalls(bids, asks);
  assert.equal(walls.whaleBidWalls.length, 1);
  assert.equal(walls.dominantSide, 'BIDS_DOMINANT');

  // Iceberg detection (10 BTC executed vs 1.5 BTC visible)
  const executed = [{ size: 3 }, { size: 3 }, { size: 4 }];
  const iceberg = tracker.detectIceberg(65000, 1.5, executed);
  assert.equal(iceberg.isIceberg, true);
  assert.ok(iceberg.hiddenReloadRatio >= 2.5);

  // CVD Analytics
  const cvdAnalytics = tracker.getCvdAnalytics(50);
  assert.ok(cvdAnalytics.buyerVolume > 0);
  assert.ok(cvdAnalytics.runningCvd > 0);
});

test('Phase 10: Cross-Exchange Arbitrage calculates Spatial Spreads and Triangular Loops', () => {
  const arbEngine = new CrossExchangeArbitrageEngine({ minNetProfitPercent: 0.10 });

  // 1. Spatial Arbitrage
  const venueQuotes = {
    binance: { bid: 65000, ask: 65020 },
    kraken: { bid: 65250, ask: 65280 }, // Buy on Binance at $65,020, Sell on Kraken at $65,250 ($230 spread = 0.35%)
    coinbase: { bid: 65100, ask: 65150 }
  };
  const spatial = arbEngine.scanSpatialArbitrage('BTCUSDT', venueQuotes);
  assert.equal(spatial.opportunityFound !== false, true);
  assert.equal(spatial.buyVenue, 'binance');
  assert.equal(spatial.sellVenue, 'kraken');
  assert.equal(spatial.isProfitable, true);
  assert.ok(spatial.netProfitPercent > 0.10);

  // 2. Triangular Arbitrage (USD -> BTC -> ETH -> USD)
  const loopConfig = {
    startCurrency: 'USD',
    leg1: { pair: 'BTC/USD', side: 'BUY', rate: 60000 },
    leg2: { pair: 'ETH/BTC', side: 'BUY', rate: 0.045 },
    leg3: { pair: 'ETH/USD', side: 'SELL', rate: 2750 } // Synthetic synthetic cross profit
  };
  const triangular = arbEngine.scanTriangularArbitrage(loopConfig);
  assert.ok(triangular.legs.length === 3);
  assert.ok(typeof triangular.netProfitUsd === 'number');
});

test('Server Integration: Mounts Constitutional, Order Flow, and Arbitrage REST Endpoints', async () => {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/constitution/status
    const constStatusRes = await fetch(`${baseUrl}/api/constitution/status`);
    assert.equal(constStatusRes.status, 200);
    const constStatus = await constStatusRes.json();
    assert.equal(constStatus.success, true);
    assert.ok(constStatus.invariantsEnforced.includes('DAILY_LOSS_CEILING_1000'));

    // 2. POST /api/constitution/validate-order (valid)
    const valRes = await fetch(`${baseUrl}/api/constitution/validate-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: { symbol: 'AAPL', price: 150, qty: 5 },
        portfolio: { equity: 100000, totalExposure: 5000, drawdown: 0.02 }
      })
    });
    assert.equal(valRes.status, 200);
    const valData = await valRes.json();
    assert.equal(valData.permitted, true);

    // 3. POST /api/orderflow/trade-tick
    const tickRes = await fetch(`${baseUrl}/api/orderflow/trade-tick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 65000, size: 2.0, side: 'buy', symbol: 'BTCUSDT' })
    });
    assert.equal(tickRes.status, 200);
    const tickData = await tickRes.json();
    assert.equal(tickData.success, true);

    // 4. GET /api/orderflow/cvd
    const cvdRes = await fetch(`${baseUrl}/api/orderflow/cvd?window=50`);
    assert.equal(cvdRes.status, 200);
    const cvdData = await cvdRes.json();
    assert.equal(cvdData.success, true);

    // 5. POST /api/arbitrage/scan-spatial
    const arbRes = await fetch(`${baseUrl}/api/arbitrage/scan-spatial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        venues: {
          binance: { bid: 65000, ask: 65010 },
          kraken: { bid: 65400, ask: 65420 } // $390 spread = 0.60% > 0.25% costs -> net ~0.35% > 0.15%
        }
      })
    });
    assert.equal(arbRes.status, 200);
    const arbData = await arbRes.json();
    assert.equal(arbData.success, true);
    assert.equal(arbData.isProfitable, true);

    // 6. GET /api/arbitrage/status
    const arbStatRes = await fetch(`${baseUrl}/api/arbitrage/status`);
    assert.equal(arbStatRes.status, 200);
    const arbStatData = await arbStatRes.json();
    assert.equal(arbStatData.success, true);
    assert.equal(arbStatData.engine, 'PHASE_10_CROSS_EXCHANGE_ARBITRAGE');
  } finally {
    server.close();
  }
});
