import test from "node:test";
import assert from "node:assert/strict";
import { scanDarkPoolVolume } from "../src/dark-pool-scanner.mjs";
import { calculateGammaExposure } from "../src/options-gex-engine.mjs";
import { trackWhaleWallets } from "../src/whale-wallet-tracker.mjs";
import { runSelfHealingCheck } from "../src/self-healing-relay.mjs";
import { evaluatePpoPolicy } from "../src/rl-adaptive-policy.mjs";

test("scanDarkPoolVolume tracks off-exchange prints and block trades", () => {
  const dp = scanDarkPoolVolume("AAPL");
  assert.equal(dp.symbol, "AAPL");
  assert.ok(dp.darkPoolStatus);
  assert.ok(dp.lastBlockTradeVolume > 0);
});

test("calculateGammaExposure measures Net GEX and Call/Put volume ratios", () => {
  const gex = calculateGammaExposure("AAPL");
  assert.equal(gex.symbol, "AAPL");
  assert.ok(gex.gammaRegime);
  assert.ok(gex.callPutRatio > 0);
});

test("trackWhaleWallets tracks large crypto whale transfers", () => {
  const whales = trackWhaleWallets("BTC");
  assert.equal(whales.symbol, "BTC");
  assert.ok(whales.trackedWalletsCount > 0);
  assert.equal(whales.largeTransfers24h.length, 2);
});

test("runSelfHealingCheck verifies provider failover hooks and infrastructure health", () => {
  const health = runSelfHealingCheck();
  assert.equal(health.infrastructureHealthScore, 100);
  assert.equal(health.providersStatus.length, 4);
});

test("evaluatePpoPolicy adapts position sizing multiplier from state rewards", () => {
  const rlp = evaluatePpoPolicy({ stateReward: +2.4, winRate: 78.5 });
  assert.equal(rlp.algorithm, "PROXIMAL_POLICY_OPTIMIZATION_PPO");
  assert.equal(rlp.policyAction, "EXPAND_POSITION_SIZE");
  assert.equal(rlp.actionMultiplier, 1.15);
});
