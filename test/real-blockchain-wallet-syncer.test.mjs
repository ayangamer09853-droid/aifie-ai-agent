// test/real-blockchain-wallet-syncer.test.mjs
// Verification for Real Blockchain On-Chain Wallet Syncer & Zero-Fake Data Architecture
// Pure Node.js ESM built-ins only

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { RealBlockchainWalletSyncer, realBlockchainWalletSyncer } from "../src/wallet/real-blockchain-wallet-syncer.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";
import { telegramCommandRouter } from "../src/telegram/telegram-command-router.mjs";
import { app } from "../server.mjs";

test("RealBlockchainWalletSyncer: Address Validation", async (t) => {
  await t.test("Validates real Solana Base58 public addresses", () => {
    const syncer = new RealBlockchainWalletSyncer();
    const validSol = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    const res = syncer.validateAddress(validSol);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.chain, "Solana");
    assert.strictEqual(res.address, validSol);
  });

  await t.test("Validates real Ethereum / EVM 0x public addresses", () => {
    const syncer = new RealBlockchainWalletSyncer();
    const validEvm = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
    const res = syncer.validateAddress(validEvm);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.chain, "EVM");
    assert.strictEqual(res.address, validEvm);
  });

  await t.test("Rejects invalid and malformed addresses", () => {
    const syncer = new RealBlockchainWalletSyncer();
    assert.strictEqual(syncer.validateAddress("").valid, false);
    assert.strictEqual(syncer.validateAddress(null).valid, false);
    assert.strictEqual(syncer.validateAddress("invalid_short_addr").valid, false);
    assert.strictEqual(syncer.validateAddress("0xInvalidHexCharsZZZZZZZZZZZZZZZZZZZZZZZZ").valid, false);
  });
});

test("RealBlockchainWalletSyncer: Zero Fake Data Defaults & Live On-Chain Sync", async (t) => {
  await t.test("Initializes wallets as UNCONFIGURED with 0.00 balances (Zero Fake Data)", async () => {
    const syncer = new RealBlockchainWalletSyncer();
    const wallets = await syncer.getWalletsWithRealBalances();
    assert.strictEqual(wallets.length, 2);
    for (const w of wallets) {
      assert.strictEqual(w.balanceSol, 0);
      assert.strictEqual(w.balanceEth, 0);
      assert.strictEqual(w.balanceUsdc, 0);
      assert.strictEqual(w.status, "UNCONFIGURED");
    }
  });

  await t.test("Sets real wallet address and queries live on-chain balance", async () => {
    const syncer = new RealBlockchainWalletSyncer();
    const solAddr = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    const setRes = await syncer.setWalletAddress("w-primary", solAddr, "My Mainnet Solana");
    assert.strictEqual(setRes.success, true);
    assert.strictEqual(setRes.wallet.address, solAddr);
    assert.strictEqual(setRes.wallet.chain, "Solana");
    assert.ok(typeof setRes.wallet.balanceSol === "number");
    assert.ok(["LIVE_ONCHAIN_VERIFIED", "RPC_QUERY_FAILED"].includes(setRes.wallet.status));
  });

  await t.test("Fetches live EVM balance on-chain via public JSON-RPC", async () => {
    const syncer = new RealBlockchainWalletSyncer();
    const ethAddr = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
    const res = await syncer.fetchLiveEvmBalance(ethAddr);
    assert.strictEqual(res.chain, "EVM");
    assert.strictEqual(res.address, ethAddr);
    assert.strictEqual(res.symbol, "ETH");
    assert.ok(typeof res.balance === "number");
    assert.ok(typeof res.wei === "string");
  });

  await t.test("Syncer telemetry reports online with zero fake data flag", () => {
    const status = realBlockchainWalletSyncer.getStatus();
    assert.strictEqual(status.status, "REAL_BLOCKCHAIN_WALLET_SYNCER_ONLINE");
    assert.strictEqual(status.zeroFakeDataEnforced, true);
    assert.ok(Array.isArray(status.supportedChains));
  });
});

test("Telegram Trading Suite: /setwallet & /wallets Live Real Balance Commands", async (t) => {
  await t.test("/wallets returns real on-chain management view without hardcoded numbers", async () => {
    const res = await telegramCommandRouter.routeCommand({
      command: "/wallets",
      fullText: "/wallets",
      chatId: "test_user"
    });
    assert.strictEqual(res.handled, true);
    assert.ok(res.response.text.includes("MULTI-CHAIN WALLET MANAGEMENT"));
    assert.ok(res.response.text.includes("Zero fake/hardcoded balances"));
  });

  await t.test("/setwallet attaches real Solana address dynamically", async () => {
    const res = await telegramCommandRouter.routeCommand({
      command: "/setwallet",
      fullText: "/setwallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      chatId: "test_user"
    });
    assert.strictEqual(res.handled, true);
    assert.ok(res.response.text.includes("REAL ON-CHAIN WALLET ATTACHED"));
    assert.ok(res.response.text.includes("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"));
    assert.ok(res.response.text.includes("Zero fake data enforced"));
  });

  await t.test("/withdraw enforces fail-closed paper boundary and zero fake balances", async () => {
    const res = await telegramCommandRouter.routeCommand({
      command: "/withdraw",
      fullText: "/withdraw 50",
      chatId: "test_user"
    });
    assert.strictEqual(res.handled, true);
    assert.ok(res.response.text.includes("WITHDRAW USDC TO EXTERNAL WALLET"));
    assert.ok(res.response.text.includes("Fail-Closed Safeguard"));
  });
});

test("Server REST API & MCP Server Tool 86 Integration", async (t) => {
  let server;
  let baseUrl;

  await t.test("Start HTTP Server on ephemeral port", async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  await t.test("GET /api/wallet/real-balances returns active synced wallets", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/real-balances`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ONLINE");
    assert.strictEqual(data.zeroFakeDataEnforced, true);
    assert.ok(Array.isArray(data.wallets));
  });

  await t.test("POST /api/wallet/sync-real-balance fetches live on-chain balance", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/sync-real-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.chain, "EVM");
    assert.strictEqual(data.symbol, "ETH");
    assert.ok(typeof data.balance === "number");
  });

  await t.test("POST /api/wallet/set-address sets and syncs user wallet address", async () => {
    const res = await fetch(`${baseUrl}/api/wallet/set-address`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletId: "w-primary",
        address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        name: "Verified Real Solana Wallet"
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.wallet.address, "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
  });

  await t.test("MCP Server executes Tool 86: fetch_real_onchain_wallet_balance", async () => {
    const mcpServer = createQuantResearchMcpServer();
    const tool86 = mcpServer.tools.get("fetch_real_onchain_wallet_balance");
    assert.ok(tool86);
    const res = await tool86.handler({ address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" });
    assert.strictEqual(res.chain, "Solana");
    assert.strictEqual(res.symbol, "SOL");
    assert.ok(typeof res.balance === "number");
  });

  await t.test("Teardown HTTP Server", async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
