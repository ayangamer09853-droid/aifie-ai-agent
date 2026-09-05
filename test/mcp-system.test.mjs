// test/mcp-system.test.mjs
// Comprehensive Model Context Protocol (MCP) Test Suite
// Verifies Protocol v2024-11-05, JSON-RPC 2.0, 6 Domain Servers, Hub, REST API, and Telegram/CLI

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  MCP_PROTOCOL_VERSION,
  JSONRPC_VERSION,
  MCP_ERROR_CODES,
  STANDARD_MCP_METHODS,
  parseJsonRpcMessage,
  createSuccessResponse,
  createErrorResponse
} from "../src/mcp/protocol.mjs";

import { McpServer } from "../src/mcp/mcp-server.mjs";
import { mcpHub } from "../src/mcp/mcp-hub.mjs";
import { McpStdioTransport } from "../src/mcp/transports/stdio-transport.mjs";
import { dispatchV1Route } from "../src/api/v1-router.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";

describe("Model Context Protocol (MCP) Architecture & Domain Servers", () => {

  describe("1. Protocol Primitives & JSON-RPC 2.0 Validation", () => {
    test("protocol version is strictly 2024-11-05", () => {
      assert.equal(MCP_PROTOCOL_VERSION, "2024-11-05");
      assert.equal(JSONRPC_VERSION, "2.0");
    });

    test("parseJsonRpcMessage parses valid request", () => {
      const parsed = parseJsonRpcMessage(JSON.stringify({
        jsonrpc: "2.0",
        id: 101,
        method: "tools/list",
        params: {}
      }));
      assert.equal(parsed.valid, true);
      assert.equal(parsed.message.id, 101);
      assert.equal(parsed.message.method, "tools/list");
      assert.equal(parsed.message.isNotification, false);
    });

    test("parseJsonRpcMessage recognizes notifications (missing id)", () => {
      const parsed = parseJsonRpcMessage({
        jsonrpc: "2.0",
        method: "notifications/initialized"
      });
      assert.equal(parsed.valid, true);
      assert.equal(parsed.message.isNotification, true);
      assert.equal(parsed.message.id, null);
    });

    test("parseJsonRpcMessage rejects invalid JSON syntax", () => {
      const parsed = parseJsonRpcMessage("{ broken json: ");
      assert.equal(parsed.valid, false);
      assert.equal(parsed.error.error.code, MCP_ERROR_CODES.PARSE_ERROR);
    });

    test("parseJsonRpcMessage rejects non-2.0 envelope", () => {
      const parsed = parseJsonRpcMessage({ jsonrpc: "1.0", method: "ping" });
      assert.equal(parsed.valid, false);
      assert.equal(parsed.error.error.code, MCP_ERROR_CODES.INVALID_REQUEST);
    });

    test("constructs standard success and error responses", () => {
      const success = createSuccessResponse(42, { test: true });
      assert.equal(success.jsonrpc, "2.0");
      assert.equal(success.id, 42);
      assert.equal(success.result.test, true);

      const err = createErrorResponse(42, MCP_ERROR_CODES.METHOD_NOT_FOUND, "Not found", { detail: "abc" });
      assert.equal(err.jsonrpc, "2.0");
      assert.equal(err.id, 42);
      assert.equal(err.error.code, MCP_ERROR_CODES.METHOD_NOT_FOUND);
      assert.equal(err.error.data.detail, "abc");
    });
  });

  describe("2. Base McpServer Class Lifecycle & Capability Negotiation", () => {
    test("initialize handshake negotiates capabilities", async () => {
      const s = new McpServer({ serverId: "test-server", name: "Test Server" });
      s.registerTool({
        name: "test_tool",
        description: "A test tool",
        handler: async ({ a }) => ({ result: a * 2 })
      });

      const initResponse = await s.handleMessage({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { clientInfo: { name: "Claude-Desktop", version: "1.0.0" } }
      });

      assert.equal(initResponse.id, 1);
      assert.equal(initResponse.result.protocolVersion, "2024-11-05");
      assert.equal(initResponse.result.serverInfo.name, "Test Server");
      assert.ok(initResponse.result.capabilities.tools);
    });

    test("ping method returns pong", async () => {
      const s = new McpServer({ serverId: "ping-server" });
      const res = await s.handleMessage({ jsonrpc: "2.0", id: 2, method: "ping" });
      assert.equal(res.result.status, "pong");
    });

    test("tools/list and tools/call on base server", async () => {
      const s = new McpServer({ serverId: "math-server" });
      s.registerTool({
        name: "square",
        description: "Squares a number",
        inputSchema: { type: "object", properties: { x: { type: "number" } } },
        handler: async ({ x }) => ({ squared: x * x })
      });

      const listRes = await s.handleMessage({ jsonrpc: "2.0", id: 3, method: "tools/list" });
      assert.equal(listRes.result.tools.length, 1);
      assert.equal(listRes.result.tools[0].name, "square");

      const callRes = await s.handleMessage({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "square", arguments: { x: 9 } }
      });
      assert.equal(callRes.result.isError, false);
      const parsedOutput = JSON.parse(callRes.result.content[0].text);
      assert.equal(parsedOutput.squared, 81);
    });

    test("handles unknown method with METHOD_NOT_FOUND error", async () => {
      const s = new McpServer();
      const res = await s.handleMessage({ jsonrpc: "2.0", id: 5, method: "non_existent_method" });
      assert.equal(res.error.code, MCP_ERROR_CODES.METHOD_NOT_FOUND);
    });
  });

  describe("3. Master McpHub & 6 Connected Domain Servers", () => {
    test("mcpHub registers all 6 required institutional domain servers", () => {
      const servers = mcpHub.listServers();
      assert.equal(servers.length, 6);

      const serverIds = servers.map(s => s.serverId);
      assert.ok(serverIds.includes("market-data-mcp"));
      assert.ok(serverIds.includes("execution-broker-mcp"));
      assert.ok(serverIds.includes("risk-sentinel-mcp"));
      assert.ok(serverIds.includes("quant-research-mcp"));
      assert.ok(serverIds.includes("system-diagnostics-mcp"));
      assert.ok(serverIds.includes("external-bridge-mcp"));

      for (const s of servers) {
        assert.equal(s.status, "CONNECTED");
        assert.ok(s.toolsCount > 0);
      }
    });

    test("mcpHub aggregates all tools and resources across servers", () => {
      const allTools = mcpHub.listAllTools();
      assert.ok(allTools.length >= 24, `Expected at least 24 tools, found ${allTools.length}`);

      const allResources = mcpHub.listAllResources();
      assert.ok(allResources.length >= 6, `Expected at least 6 resources, found ${allResources.length}`);

      const telemetry = mcpHub.getTelemetry();
      assert.equal(telemetry.status, "ONLINE");
      assert.equal(telemetry.connectedServers, 6);
      assert.equal(telemetry.totalTools, allTools.length);
      assert.equal(telemetry.totalResources, allResources.length);
    });

    test("Universal JSON-RPC 2.0 handshake on McpHub", async () => {
      const initRes = await mcpHub.handleMessage({
        jsonrpc: "2.0",
        id: "hub-init",
        method: "initialize",
        params: { clientInfo: { name: "Cursor-IDE" } }
      });
      assert.equal(initRes.id, "hub-init");
      assert.equal(initRes.result.protocolVersion, "2024-11-05");
      assert.equal(initRes.result.serverInfo.connectedServersCount, 6);
    });

    test("Universal JSON-RPC 2.0 tools/list on McpHub", async () => {
      const listRes = await mcpHub.handleMessage({
        jsonrpc: "2.0",
        id: "hub-tools",
        method: "tools/list"
      });
      assert.equal(listRes.id, "hub-tools");
      assert.ok(Array.isArray(listRes.result.tools));
      assert.ok(listRes.result.tools.length >= 24);
    });
  });

  describe("4. Tool Execution Across All 6 Domain MCP Servers", () => {
    // 1. Market Data MCP
    test("1. market-data-mcp: get_live_quote & feed_market_tick", async () => {
      const feedRes = await mcpHub.callTool("feed_market_tick", {
        symbol: "BTC/USDT",
        price: 68950.25,
        volume: 2.5,
        source: "TEST_SUITE"
      });
      assert.equal(feedRes.isError, false);

      const quoteRes = await mcpHub.callTool("get_live_quote", { symbol: "BTC/USDT" });
      assert.equal(quoteRes.isError, false);
      const quote = JSON.parse(quoteRes.content[0].text);
      assert.equal(quote.symbol, "BTC/USDT");
      assert.ok(quote.price > 0);
    });

    // 2. Execution Broker MCP
    test("2. execution-broker-mcp: get_account_balance & place_paper_order", async () => {
      const balRes = await mcpHub.callTool("get_account_balance", {});
      assert.equal(balRes.isError, false);
      const bal = JSON.parse(balRes.content[0].text);
      assert.ok(bal.cash !== undefined);

      const orderRes = await mcpHub.callTool("place_paper_order", {
        symbol: "BTC/USDT",
        side: "buy",
        quantity: 1,
        price: 68500
      });
      assert.equal(orderRes.isError, false);
      const orderData = JSON.parse(orderRes.content[0].text);
      assert.equal(orderData.success, true);
      assert.equal(orderData.fill.symbol, "BTC/USDT");
    });

    // 3. Risk Sentinel MCP
    test("3. risk-sentinel-mcp: audit_risk_limits & calculate_kelly_size", async () => {
      const auditRes = await mcpHub.callTool("audit_risk_limits", {});
      assert.equal(auditRes.isError, false);
      const audit = JSON.parse(auditRes.content[0].text);
      assert.ok(audit.maxDailyDrawdownCapPct > 0);

      const kellyRes = await mcpHub.callTool("calculate_kelly_size", {
        symbol: "BTC/USDT",
        winRate: 0.65,
        rewardRiskRatio: 1.8
      });
      assert.equal(kellyRes.isError, false);
      const kelly = JSON.parse(kellyRes.content[0].text);
      assert.ok(kelly.halfKellyFraction > 0);
      assert.ok(kelly.finalSovereignCappedFraction <= 0.15);
    });

    // 4. Quant Research MCP
    test("4. quant-research-mcp: run_monte_carlo_sim & run_tca_decomposition", async () => {
      const mcRes = await mcpHub.callTool("run_monte_carlo_sim", {
        paths: 1000,
        steps: 50,
        winRate: 0.60
      });
      assert.equal(mcRes.isError, false);
      const mc = JSON.parse(mcRes.content[0].text);
      assert.ok(mc.probabilityOfRuin !== undefined);

      const tcaRes = await mcpHub.callTool("run_tca_decomposition", {
        symbol: "BTC/USDT",
        side: "BUY",
        quantity: 1,
        arrivalPrice: 68500,
        fillPrice: 68502
      });
      assert.equal(tcaRes.isError, false);
      const tca = JSON.parse(tcaRes.content[0].text);
      assert.ok(tca.totalShortfallBps !== undefined);
      assert.equal(tca.isExecutionAcceptable, true);
    });

    // 5. System Diagnostics MCP
    test("5. system-diagnostics-mcp: get_8plane_diagnostics & query_event_journal", async () => {
      const diagRes = await mcpHub.callTool("get_8plane_diagnostics", {});
      assert.equal(diagRes.isError, false);
      const diag = JSON.parse(diagRes.content[0].text);
      assert.ok(diag.workingProcesses !== undefined || diag.planes !== undefined);
      const dataPlane = diag.workingProcesses?.DATA_PLANE || diag.planes?.DATA_PLANE;
      assert.ok(dataPlane !== undefined);

      const jRes = await mcpHub.callTool("query_event_journal", { limit: 10 });
      assert.equal(jRes.isError, false);
      const journal = JSON.parse(jRes.content[0].text);
      assert.ok(journal.stats !== undefined);
    });

    // 6. External Bridge MCP
    test("6. external-bridge-mcp: fetch_crypto_coingecko & feed_macro_news", async () => {
      const cgRes = await mcpHub.callTool("fetch_crypto_coingecko", { symbol: "BTC" });
      assert.equal(cgRes.isError, false);
      const cg = JSON.parse(cgRes.content[0].text);
      assert.equal(cg.symbol, "BTC");
      assert.ok(cg.price > 0);

      const newsRes = await mcpHub.callTool("feed_macro_news", {
        symbol: "GLOBAL",
        headline: "Fed maintains interest rate baseline amid steady liquidity",
        sentiment: 0.72
      });
      assert.equal(newsRes.isError, false);
    });
  });

  describe("5. Resource Streaming & Subscription Protocol", () => {
    test("resources/list returns catalog of active resources", async () => {
      const listRes = await mcpHub.handleMessage({
        jsonrpc: "2.0",
        id: "res-list",
        method: "resources/list"
      });
      assert.equal(listRes.id, "res-list");
      assert.ok(listRes.result.resources.length >= 6);

      const uris = listRes.result.resources.map(r => r.uri);
      assert.ok(uris.includes("market://quotes/active"));
      assert.ok(uris.includes("broker://account/snapshot"));
      assert.ok(uris.includes("risk://fortress/status"));
    });

    test("resources/read returns contents for valid URI", async () => {
      const readRes = await mcpHub.handleMessage({
        jsonrpc: "2.0",
        id: "res-read",
        method: "resources/read",
        params: { uri: "risk://fortress/status" }
      });
      assert.equal(readRes.id, "res-read");
      assert.ok(Array.isArray(readRes.result.contents));
      assert.equal(readRes.result.contents[0].uri, "risk://fortress/status");
    });

    test("resources/read returns RESOURCE_NOT_FOUND for invalid URI", async () => {
      const readRes = await mcpHub.handleMessage({
        jsonrpc: "2.0",
        id: "res-bad",
        method: "resources/read",
        params: { uri: "nonexistent://resource" }
      });
      assert.equal(readRes.error.code, MCP_ERROR_CODES.RESOURCE_NOT_FOUND);
    });
  });

  describe("6. REST API Gateway (/api/v1/mcp/*) Routing", () => {
    test("GET /api/v1/mcp/status returns telemetry envelope", () => {
      const res = dispatchV1Route("/api/v1/mcp/status", "GET");
      assert.equal(res.status, 200);
      assert.equal(res.success, true);
      assert.equal(res.plane, "OBSERVABILITY_PLANE");
      assert.equal(res.data.status, "ONLINE");
      assert.equal(res.data.connectedServers, 6);
    });

    test("GET /api/v1/mcp/servers returns all 6 servers", () => {
      const res = dispatchV1Route("/api/v1/mcp/servers", "GET");
      assert.equal(res.status, 200);
      assert.equal(res.data.servers.length, 6);
    });

    test("GET /api/v1/mcp/tools returns complete tools catalog", () => {
      const res = dispatchV1Route("/api/v1/mcp/tools", "GET");
      assert.equal(res.status, 200);
      assert.ok(res.data.tools.length >= 24);
    });

    test("POST /api/v1/mcp/tools/call executes tool and returns envelope", async () => {
      const resPromise = dispatchV1Route("/api/v1/mcp/tools/call", "POST", new URLSearchParams(), {
        name: "get_live_quote",
        arguments: { symbol: "BTC/USDT" }
      });
      const res = await Promise.resolve(resPromise);
      assert.equal(res.status, 200);
      assert.equal(res.plane, "OBSERVABILITY_PLANE");
      assert.equal(res.data.isError, false);
      assert.equal(res.data.tool, "get_live_quote");
    });
  });

  describe("7. Telegram Command Listener (/mcp) Integration", () => {
    test("parseTelegramCommand recognizes /mcp status, tools, servers, call", () => {
      assert.equal(parseTelegramCommand("/mcp").command, "/mcp");
      assert.equal(parseTelegramCommand("/mcp status").command, "/mcp");
      assert.equal(parseTelegramCommand("/mcp tools").command, "/mcp");
      assert.equal(parseTelegramCommand("/mcp servers").command, "/mcp");
      assert.equal(parseTelegramCommand("🔌 MCP Hub Status").command, "/mcp");
      assert.equal(parseTelegramCommand("🛠️ MCP Tool Runner").command, "/mcp");
    });

    test("processTelegramCommand /mcp status returns rich HTML and inline buttons", async () => {
      const parsed = parseTelegramCommand("/mcp status");
      const res = await processTelegramCommand(parsed);
      assert.ok(res.text.includes("AIFIE MODEL CONTEXT PROTOCOL"));
      assert.ok(res.text.includes("2024-11-05"));
      assert.ok(res.text.includes("Connected Servers:"));
      assert.ok(Array.isArray(res.replyMarkup?.inline_keyboard));
    });

    test("processTelegramCommand /mcp tools groups tools by server", async () => {
      const parsed = parseTelegramCommand("/mcp tools");
      const res = await processTelegramCommand(parsed);
      assert.ok(res.text.includes("AIFIE MCP REGISTERED TOOLS"));
      assert.ok(res.text.includes("market-data-mcp"));
      assert.ok(res.text.includes("risk-sentinel-mcp"));
      assert.ok(Array.isArray(res.replyMarkup?.inline_keyboard));
    });

    test("processTelegramCommand /mcp servers returns all domain cards", async () => {
      const parsed = parseTelegramCommand("/mcp servers");
      const res = await processTelegramCommand(parsed);
      assert.ok(res.text.includes("AIFIE CONNECTED MCP SERVERS"));
      assert.ok(res.text.includes("Aifie Sovereign Risk Fortress MCP Server"));
    });

    test("processTelegramCommand /mcp call executes tool and renders result", async () => {
      const parsed = parseTelegramCommand('/mcp call get_live_quote {"symbol":"ETH/USDT"}');
      const res = await processTelegramCommand(parsed);
      assert.ok(res.text.includes("MCP TOOL EXECUTION: <code>get_live_quote</code>"));
      assert.ok(res.text.includes("SUCCESS"));
    });
  });

  describe("8. McpStdioTransport Protocol Framing", () => {
    test("initializes McpStdioTransport with mcpHub", () => {
      const transport = new McpStdioTransport(mcpHub);
      assert.ok(transport);
      assert.equal(transport.running, false);
    });
  });
});
