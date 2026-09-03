import test from "node:test";
import assert from "node:assert/strict";
import { getTokenFactoryStatus, deployAutonomousCryptoToken, initializeDexLiquidityPool } from "../src/crypto-token-factory-engine.mjs";

test("getTokenFactoryStatus reports active factory status and deployed tokens", () => {
  const status = getTokenFactoryStatus();
  assert.equal(status.factoryEngineStatus, "AUTONOMOUS_CRYPTO_TOKEN_FACTORY_ONLINE");
  assert.equal(status.securityAuditGate, "AUTOMATED_REENTRANCY_OVERFLOW_HONEYPOT_AUDITOR");
  assert.ok(status.totalTokensDeployedCount >= 1);
});

test("deployAutonomousCryptoToken mints and deploys new custom crypto tokens", () => {
  const res = deployAutonomousCryptoToken({
    name: "Aifie Autonomous Coin",
    symbol: "AAC",
    network: "POLYGON",
    totalSupply: 100000000
  });

  assert.equal(res.deploymentStatus, "AUTONOMOUS_CRYPTO_TOKEN_DEPLOYED_SUCCESS");
  assert.equal(res.name, "Aifie Autonomous Coin");
  assert.equal(res.symbol, "AAC");
  assert.equal(res.contractCodeVerified, true);
  assert.ok(res.tokenAddress.startsWith("0xTOKEN_"));
  assert.ok(res.deploymentTxHash.startsWith("0xTX_DEPLOY_"));
});

test("initializeDexLiquidityPool initializes Uniswap V3 pool and locks LP tokens", () => {
  const res = initializeDexLiquidityPool({
    tokenAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    pairingCoin: "USDT",
    tokenAmount: 1000000,
    pairingAmountUSDT: 10000
  });

  assert.equal(res.liquidityStatus, "DEX_LIQUIDITY_POOL_INITIALIZED_AND_LOCKED");
  assert.equal(res.pairingCoin, "USDT");
  assert.equal(res.lpLockPeriodDays, 365);
  assert.ok(res.poolAddress.startsWith("0xPOOL_"));
  assert.ok(res.lpTokenLockTx.startsWith("0xLOCK_"));
});
