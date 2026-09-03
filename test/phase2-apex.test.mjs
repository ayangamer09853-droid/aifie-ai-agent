import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import { getWeb3DexRouterStatus, scanCrossVenueDexArbitrage, simulatePrivateMevBundle } from "../src/web3-dex-deep-router.mjs";
import { getRwaTreasuryStatus, sweepIdleCashToRwaYield, triggerTimelockCircuitBreaker, calculateRwaYieldProjection } from "../src/tokenized-rwa-treasury.mjs";

test("Web3 DEX deep router reports online status with multi-chain pools", () => {
  const status = getWeb3DexRouterStatus();
  assert.equal(status.status, "WEB3_DEX_DEEP_ROUTER_ONLINE");
  assert.ok(status.supportedChains.includes("Ethereum (EVM)"));
  assert.ok(status.supportedChains.includes("Solana (SVM)"));
  assert.ok(status.activePoolsCount >= 4);
});

test("cross-venue arbitrage scanner detects CeFi vs DeFi price delta and net profit", () => {
  const arb = scanCrossVenueDexArbitrage({ baseAsset: "BTC", tradeSizeUSD: 20000 });
  assert.equal(arb.scanStatus, "CROSS_VENUE_ARBITRAGE_SCANNED");
  assert.equal(arb.pair, "BTC/USDT");
  assert.ok(Number.isFinite(arb.venues.cefiPrice));
  assert.ok(Number.isFinite(arb.venues.defiPrice));
  assert.ok(arb.arbitrageVerdict);
  assert.ok(arb.recommendedRoute);
});

test("simulated private MEV bundle provides front-running and sandwich immunity", () => {
  const bundle = simulatePrivateMevBundle({ dexName: "Uniswap v3", symbol: "BTC/USDT", amountUSD: 25000 });
  assert.equal(bundle.status, "PRIVATE_MEV_BUNDLE_SIMULATED");
  assert.equal(bundle.mevProtectionFeatures.sandwichAttackRisk, "0.00%_IMMUNE");
  assert.ok(bundle.simulatedTxHash.startsWith("0x"));
});

test("tokenized RWA treasury enforces 0.00% Zero Idle Cash and calculates APY accrual", () => {
  const rwa = getRwaTreasuryStatus();
  assert.equal(rwa.status, "RWA_SOVEREIGN_TREASURY_ONLINE");
  assert.equal(rwa.treasuryMetrics.idleCashUSD, 0.00);
  assert.ok(rwa.treasuryMetrics.blendedAnnualApyPercent > 4.0);
  assert.ok(rwa.treasuryMetrics.dailyInterestAccrualUSD > 0);
  assert.ok(rwa.vaults.length >= 4);
});

test("sweepIdleCashToRwaYield sweeps unallocated cash into Ondo USDY", () => {
  const sweep = sweepIdleCashToRwaYield({ amountUSD: 3000 });
  assert.equal(sweep.success, true);
  assert.equal(sweep.amountSweptUSD, 3000);
  assert.equal(sweep.destinationVault, "RWA_ONDO_USDY");
  assert.equal(sweep.idleCashRemainingUSD, 0.00);
  assert.ok(sweep.simulatedOnChainTxHash.startsWith("0x"));
});

test("triggerTimelockCircuitBreaker engages multi-sig vault defense", () => {
  const tl = triggerTimelockCircuitBreaker({ reason: "VPIN_TOXICITY_SPIKE" });
  assert.equal(tl.circuitBreakerStatus, "TIMELOCK_VAULT_CIRCUIT_BREAKER_ENGAGED");
  assert.equal(tl.reason, "VPIN_TOXICITY_SPIKE");
  assert.equal(tl.timelockHours, 24);
  assert.equal(tl.multiSigRequired, "3-of-5_SOVEREIGN_NODES");
});

test("calculateRwaYieldProjection computes compound interest future value", () => {
  const proj = calculateRwaYieldProjection({ capitalUSD: 100000, days: 365, apyPercent: 5.2 });
  assert.ok(proj.futureValueUSD > 100000);
  assert.ok(proj.yieldEarnedUSD > 5000);
  assert.ok(proj.dailyAccrualUSD > 0);
});

test("Apex v100 Phase 2 HTTP endpoints serve DEX arbitrage, MEV bundle, and RWA treasury APIs", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const dexStatusRes = await fetch(`${baseUrl}/api/v100/dex/status`);
    assert.equal(dexStatusRes.status, 200);
    const dexStatus = await dexStatusRes.json();
    assert.equal(dexStatus.status, "WEB3_DEX_DEEP_ROUTER_ONLINE");

    const dexArbRes = await fetch(`${baseUrl}/api/v100/dex/arbitrage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseAsset: "ETH", tradeSizeUSD: 15000 })
    });
    assert.equal(dexArbRes.status, 200);
    const dexArb = await dexArbRes.json();
    assert.equal(dexArb.pair, "ETH/USDT");

    const mevRes = await fetch(`${baseUrl}/api/v100/dex/mev-bundle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dexName: "Uniswap v3", symbol: "ETH/USDT", amountUSD: 10000 })
    });
    assert.equal(mevRes.status, 200);
    const mevData = await mevRes.json();
    assert.equal(mevData.status, "PRIVATE_MEV_BUNDLE_SIMULATED");

    const rwaStatusRes = await fetch(`${baseUrl}/api/v100/rwa/status`);
    assert.equal(rwaStatusRes.status, 200);
    const rwaStatus = await rwaStatusRes.json();
    assert.equal(rwaStatus.status, "RWA_SOVEREIGN_TREASURY_ONLINE");

    const rwaSweepRes = await fetch(`${baseUrl}/api/v100/rwa/sweep`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountUSD: 2000 })
    });
    assert.equal(rwaSweepRes.status, 200);
    const rwaSweep = await rwaSweepRes.json();
    assert.equal(rwaSweep.success, true);

    const timelockRes = await fetch(`${baseUrl}/api/v100/rwa/timelock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "BLACK_SWAN_DEFENSE" })
    });
    assert.equal(timelockRes.status, 200);
    const timelockData = await timelockRes.json();
    assert.equal(timelockData.circuitBreakerStatus, "TIMELOCK_VAULT_CIRCUIT_BREAKER_ENGAGED");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
