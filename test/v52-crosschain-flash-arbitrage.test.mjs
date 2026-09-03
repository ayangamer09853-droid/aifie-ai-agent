import test from "node:test";
import assert from "node:assert/strict";
import { getCrossChainArbStatus, scanMultiChainMempoolOpportunities, executeAtomicFlashLoanArb } from "../src/crosschain-flash-arbitrage-engine.mjs";

test("getCrossChainArbStatus reports active cross-chain flash arbitrage engine", () => {
  const status = getCrossChainArbStatus();
  assert.equal(status.crossChainArbStatus, "AUTONOMOUS_CROSSCHAIN_FLASH_ARBITRAGE_ONLINE");
  assert.equal(status.mevProtectionMode, "FLASHBOTS_PRIVATE_RPC_BUNDLE_ENABLED");
  assert.equal(status.supportedNetworksCount, 6);
});

test("scanMultiChainMempoolOpportunities returns live mempool spread arbitrage opportunities", () => {
  const res = scanMultiChainMempoolOpportunities();
  assert.equal(res.scanStatus, "MULTI_CHAIN_MEMPOOL_SCAN_COMPLETED");
  assert.equal(res.scannedNetworksCount, 6);
  assert.ok(res.topOpportunity.spreadBps > 0);
  assert.ok(res.topOpportunity.estimatedProfitUSD > 0);
});

test("executeAtomicFlashLoanArb executes private Flashbots MEV protected flash loan", () => {
  const res = executeAtomicFlashLoanArb({
    borrowedAsset: "USDC",
    borrowedAmountUSD: 100000,
    buyDex: "Uniswap_V3",
    sellDex: "Camelot"
  });

  assert.equal(res.executionStatus, "ATOMIC_FLASH_LOAN_ARBITRAGE_EXECUTED_SUCCESS");
  assert.equal(res.mevSandwichProtected, true);
  assert.equal(res.reversionGuardTriggered, false);
  assert.ok(res.netProfitUSD > 0);
  assert.ok(res.txHash.startsWith("0xFLASH_ARB_"));
  assert.ok(res.flashbotsBundleHash.startsWith("0xBUNDLE_MEV_"));
});
