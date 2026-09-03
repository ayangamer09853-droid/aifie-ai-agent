import test from "node:test";
import assert from "node:assert/strict";
import { getTonSolanaBridgeStatus, swapTonToSolanaUsdt, bridgeTelegramStarsToSolana } from "../src/ton-solana-liquidity-bridge-engine.mjs";

test("getTonSolanaBridgeStatus reports active cross-chain bridge and pool reserves", () => {
  const status = getTonSolanaBridgeStatus();
  assert.equal(status.bridgeEngineStatus, "TON_SOLANA_CROSSCHAIN_BRIDGE_ONLINE");
  assert.equal(status.protocolVersion, "TON_SOLANA_WORMHOLE_V56");
  assert.equal(status.totalPoolReservesUSD, "$1,500,000.00");
  assert.ok(status.supportedChains.length >= 5);
});

test("swapTonToSolanaUsdt executes atomic cross-chain TON to Solana USDT swap", () => {
  const res = swapTonToSolanaUsdt({
    tonAmount: 100,
    targetSolanaAddress: "Solana7x9...B42F"
  });

  assert.equal(res.swapStatus, "TON_TO_SOLANA_SWAP_EXECUTED_SUCCESS");
  assert.equal(res.tonAmountSent, "100 TON");
  assert.equal(res.grossUsdValue, "$680.00 USD");
  assert.equal(res.netSolanaUsdtReceived, "679.32 USDT (SPL)");
  assert.ok(res.tonLockTxHash.startsWith("0xTON_LOCK_"));
  assert.ok(res.solanaMintTxHash.startsWith("0xSOL_MINT_"));
});

test("bridgeTelegramStarsToSolana bridges Telegram Stars directly to Solana SPL USDT", () => {
  const res = bridgeTelegramStarsToSolana({
    starAmount: 10000,
    targetSolanaAddress: "Solana7x9...B42F"
  });

  assert.equal(res.bridgeStatus, "TELEGRAM_STARS_BRIDGED_TO_SOLANA_SUCCESS");
  assert.equal(res.starsBridged, "⭐ 10,000 Stars");
  assert.equal(res.grossUsdValue, "$130.00 USD");
  assert.equal(res.netSolanaUsdt, "129.87 USDT");
  assert.ok(res.bridgeTxHash.startsWith("0xSTARS_SOL_BRIDGE_"));
});
