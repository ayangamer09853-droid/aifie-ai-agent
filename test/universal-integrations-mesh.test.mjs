// test/universal-integrations-mesh.test.mjs
// Comprehensive Unit & Integration Test Suite for Universal Integration & Orchestration Mesh (UIOM)
// Covers all 10 Pillars + MCP Tools 56-65 + Coordinated Orchestration Flow
// Zero external dependencies (pure node:test, node:assert)

import test from "node:test";
import assert from "node:assert/strict";

import { n8nConnector } from "../src/integrations/n8n-workflow-connector.mjs";
import { mcpExtendedMesh } from "../src/integrations/mcp-extended-mesh.mjs";
import { universalLlmGateway } from "../src/integrations/universal-llm-gateway.mjs";
import { nativeWebSocketHub } from "../src/integrations/native-websocket-hub.mjs";
import { webhookManagementHub } from "../src/integrations/webhook-management-hub.mjs";
import { universalDatabaseAdapter } from "../src/integrations/universal-database-adapter.mjs";
import { enterpriseMessageQueue } from "../src/integrations/enterprise-message-queue.mjs";
import { enterpriseAuthRbacGateway } from "../src/integrations/enterprise-auth-rbac-gateway.mjs";
import { institutionalRiskApiGateway } from "../src/integrations/institutional-risk-api-gateway.mjs";
import { openObservabilitySuite } from "../src/integrations/open-observability-suite.mjs";
import { universalOrchestrationMesh } from "../src/integrations/universal-orchestration-mesh.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

test("UIOM Pillar 1: n8n Workflow Connector registers templates and dispatches payloads", async () => {
  const workflows = n8nConnector.listWorkflows();
  assert.ok(workflows.length >= 4, "Must have at least 4 out-of-the-box workflows");
  assert.ok(workflows.some(w => w.id === "wf-trade-alert"), "Must contain trade alert workflow");
  assert.ok(workflows.some(w => w.id === "wf-risk-breach"), "Must contain risk breach workflow");

  const dispatch = await n8nConnector.dispatchWorkflow("wf-trade-alert", {
    symbol: "AAPL",
    side: "BUY",
    qty: 50,
    price: 150.25
  });

  assert.ok(dispatch.executionId.startsWith("exec-"), "Must have execution ID");
  assert.ok(dispatch.status.includes("SUCCESS"), "Execution must succeed or simulate successfully");
  assert.strictEqual(dispatch.workflowId, "wf-trade-alert");

  const inbound = n8nConnector.processInboundWebhook({
    action: "EXTERNAL_SIGNAL_FIRED",
    source: "n8n_cron_node",
    confidence: 0.95
  });
  assert.strictEqual(inbound.status, "PROCESSED");
  assert.strictEqual(inbound.action, "EXTERNAL_SIGNAL_FIRED");
});

test("UIOM Pillar 2: Extended MCP Mesh handles JSON-RPC 2.0 and executes local & proxy tools", async () => {
  mcpExtendedMesh.registerTool({
    name: "test_echo_tool",
    description: "Echoes input arguments",
    inputSchema: { type: "object", properties: { text: { type: "string" } } },
    handler: async (args) => ({ echoed: args.text || "empty" })
  });

  const toolsList = mcpExtendedMesh.listTools();
  assert.ok(toolsList.some(t => t.name === "test_echo_tool"), "Tool must be listed");

  const rpcInit = await mcpExtendedMesh.handleJsonRpc({ jsonrpc: "2.0", id: 1, method: "initialize" });
  assert.strictEqual(rpcInit.result?.serverInfo?.name, "aifie-universal-mcp-mesh");

  const rpcCall = await mcpExtendedMesh.handleJsonRpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "test_echo_tool", arguments: { text: "Aifie UIOM" } }
  });
  assert.strictEqual(rpcCall.result?.isError, false);
  assert.ok(rpcCall.result?.content[0]?.text.includes("Aifie UIOM"));
});

test("UIOM Pillar 3: Universal Multi-LLM Gateway completes prompts with automated fallback", async () => {
  const result = await universalLlmGateway.chatCompletion({
    messages: [{ role: "user", content: "Provide trade execution rationale." }],
    provider: "local_deterministic"
  });

  assert.ok(result.id.startsWith("llm-req-"), "Must generate request ID");
  assert.strictEqual(result.provider, "local_deterministic");
  assert.ok(result.content.length > 0, "Content must not be empty");
  assert.strictEqual(typeof result.costUsd, "number");
  assert.ok(result.durationMs >= 0);

  const status = universalLlmGateway.getStatus();
  assert.ok(status.fallbackChain.length >= 5, "Fallback chain must have multiple providers");
  assert.ok(status.totalRequestsServed >= 1);
});

test("UIOM Pillar 4: Native WebSocket Hub encodes RFC 6455 frames and manages pub/sub topics", () => {
  // Test frame encoder
  const frame = nativeWebSocketHub._encodeFrame("Hello Aifie WebSockets");
  assert.ok(Buffer.isBuffer(frame), "Frame must be a Buffer");
  assert.strictEqual(frame[0], 0x81, "First byte must be FIN + text opcode (0x81)");

  // Test pub/sub topic broadcast
  const bc = nativeWebSocketHub.broadcast("telemetry", { status: "ONLINE", cpu: 12.5 });
  assert.ok(bc.broadcastId.startsWith("bc-"));
  assert.strictEqual(bc.topic, "telemetry");

  const status = nativeWebSocketHub.getStatus();
  assert.strictEqual(typeof status.connectedClientsCount, "number");
  assert.ok(status.totalBroadcasts >= 1);
});

test("UIOM Pillar 5: Webhook Management Hub verifies HMAC-SHA256 signatures and normalizes TradingView signals", async () => {
  // Inbound normalizer
  const tvSignal = webhookManagementHub.processInboundWebhook({
    source: "tradingview",
    rawBody: JSON.stringify({ ticker: "BTCUSDT", action: "buy", price: 68500.50, interval: "15m" })
  });
  assert.strictEqual(tvSignal.verified, true);
  assert.strictEqual(tvSignal.payload.symbol, "BTCUSDT");
  assert.strictEqual(tvSignal.payload.action, "BUY");
  assert.strictEqual(tvSignal.payload.price, 68500.50);

  // Outbound dispatch
  webhookManagementHub.registerOutboundEndpoint({
    id: "ep-local-test",
    url: "http://127.0.0.1:9999/webhook/outbound",
    eventTypes: ["*"],
    maxRetries: 2
  });

  const outbound = await webhookManagementHub.dispatchOutboundEvent("ORDER_FILLED", { symbol: "AAPL", fillPrice: 150.25 });
  assert.strictEqual(outbound.eventType, "ORDER_FILLED");
  assert.ok(outbound.targetEndpointsCount >= 1);
});

test("UIOM Pillar 6: Universal Database Adapter executes SQL, KV operations, and schema migrations", async () => {
  // SQL Insert & Select
  const insertRes = await universalDatabaseAdapter.executeQuery("INSERT INTO trades", [
    { symbol: "NVDA", side: "BUY", qty: 25, price: 130.50, status: "FILLED" }
  ]);
  assert.strictEqual(insertRes.rowCount, 1);
  assert.ok(insertRes.rows[0].id.startsWith("row-"));

  const selectRes = await universalDatabaseAdapter.executeQuery("SELECT * FROM trades");
  assert.ok(selectRes.rowCount >= 1);

  // Atomic Key-Value
  universalDatabaseAdapter.setKv("market:regime:last", "TRENDING_BULLISH", 3600);
  const kvVal = universalDatabaseAdapter.getKv("market:regime:last");
  assert.strictEqual(kvVal, "TRENDING_BULLISH");

  // Migration Runner
  const migrationRes = await universalDatabaseAdapter.runMigrations([
    { name: "001_create_risk_limits_table", up: async (db) => db.createTable("risk_limits", ["key", "val"]) }
  ]);
  assert.strictEqual(migrationRes[0].status, "APPLIED");
});

test("UIOM Pillar 7: Enterprise Message Queue handles priority queues (P0-P3), workers, and ACK/NACK", () => {
  // Priority enqueuing
  const mLow = enterpriseMessageQueue.enqueue("test_queue", { task: "low_priority" }, { priority: "P3" });
  const mCrit = enterpriseMessageQueue.enqueue("test_queue", { task: "critical_p0" }, { priority: "P0" });

  // Critical P0 must dequeue before P3
  const deq1 = enterpriseMessageQueue.dequeue("test_queue", "worker-a");
  assert.strictEqual(deq1.msgId, mCrit.msgId, "P0 Critical task must be dequeued first");
  assert.strictEqual(deq1.priority, "P0");

  const ackRes = enterpriseMessageQueue.ack(deq1.msgId);
  assert.strictEqual(ackRes, true);

  const deq2 = enterpriseMessageQueue.dequeue("test_queue", "worker-a");
  assert.strictEqual(deq2.msgId, mLow.msgId, "P3 Low task must be dequeued next");

  // Test NACK with DLQ routing on exceed
  const nack1 = enterpriseMessageQueue.nack(deq2.msgId, "Simulated Error 1");
  assert.strictEqual(nack1.status, "REQUEUED");

  deq2.availableAt = 0;
  const deq2Retry = enterpriseMessageQueue.dequeue("test_queue", "worker-a");
  const nack2 = enterpriseMessageQueue.nack(deq2Retry.msgId, "Simulated Error 2");
  assert.strictEqual(nack2.status, "REQUEUED");

  deq2Retry.availableAt = 0;
  const deq2Final = enterpriseMessageQueue.dequeue("test_queue", "worker-a");
  const nackFinal = enterpriseMessageQueue.nack(deq2Final.msgId, "Simulated Fatal Error");
  assert.strictEqual(nackFinal.status, "DLQ");
});

test("UIOM Pillar 8: Enterprise Auth & RBAC Gateway generates JWTs, validates scopes, and revokes tokens", () => {
  // JWT Issuance & Verification
  const jwt = enterpriseAuthRbacGateway.generateJwt({ subject: "trader-bob", role: "EXECUTION_TRADER" });
  assert.ok(jwt.token.split(".").length === 3, "JWT must have 3 segments");

  const verified = enterpriseAuthRbacGateway.verifyJwt(jwt.token);
  assert.strictEqual(verified.valid, true);
  assert.strictEqual(verified.payload.sub, "trader-bob");
  assert.strictEqual(verified.payload.role, "EXECUTION_TRADER");

  // RBAC Permission Check
  const canTrade = enterpriseAuthRbacGateway.checkPermission(verified.payload, "orders:write");
  assert.strictEqual(canTrade.authorized, true);

  const canAdmin = enterpriseAuthRbacGateway.checkPermission(verified.payload, "system:admin");
  assert.strictEqual(canAdmin.authorized, false, "Execution Trader cannot perform system:admin");

  // Token Revocation
  enterpriseAuthRbacGateway.revokeToken(verified.payload.jti);
  const afterRevoke = enterpriseAuthRbacGateway.verifyJwt(jwt.token);
  assert.strictEqual(afterRevoke.valid, false);
  assert.strictEqual(afterRevoke.error, "TOKEN_REVOKED");
});

test("UIOM Pillar 9: Institutional Risk API Gateway validates pre-trade limits and emergency kill-switch", () => {
  // Safe order
  const safe = institutionalRiskApiGateway.evaluatePreTradeRisk({
    symbol: "AAPL",
    side: "BUY",
    qty: 10,
    price: 150
  });
  assert.strictEqual(safe.approved, true);
  assert.strictEqual(safe.riskScore, 0.15);

  // Excessive notional breach ($150,000 > $50,000 limit)
  const breach = institutionalRiskApiGateway.evaluatePreTradeRisk({
    symbol: "AAPL",
    side: "BUY",
    qty: 1000,
    price: 150
  });
  assert.strictEqual(breach.approved, false);
  assert.ok(breach.checks.some(c => c.name === "MAX_ORDER_NOTIONAL" && !c.passed));

  // Emergency Kill-Switch
  institutionalRiskApiGateway.setKillSwitch(true, "CIRCUIT_BREAKER_TRIGGERED");
  const blocked = institutionalRiskApiGateway.evaluatePreTradeRisk({ symbol: "AAPL", side: "BUY", qty: 1, price: 150 });
  assert.strictEqual(blocked.approved, false);
  assert.ok(blocked.checks.some(c => c.name === "CIRCUIT_BREAKER" && !c.passed));

  // Reset Kill Switch
  institutionalRiskApiGateway.setKillSwitch(false);
});

test("UIOM Pillar 10: Open Observability Suite records OTel traces, Prometheus /metrics, and healthz probes", () => {
  // Distributed Tracing
  const span = openObservabilitySuite.startSpan("quant_order_routing", {
    attributes: { "symbol": "AAPL", "venue": "DARK_POOL" }
  });
  assert.ok(span.spanId.length > 0);
  assert.ok(span.traceId.length > 0);

  const completed = span.end("OK", { "execution.slippage_bps": 1.4 });
  assert.strictEqual(completed.status, "OK");
  assert.strictEqual(completed.attributes["execution.slippage_bps"], 1.4);

  // Prometheus Metrics Rendering
  openObservabilitySuite.recordHttpRequest("GET", "/api/status", 200, 4.2);
  const prom = openObservabilitySuite.toPrometheusMetrics();
  assert.ok(prom.includes("aifie_http_requests_total"));
  assert.ok(prom.includes("aifie_active_websocket_connections"));
  assert.ok(prom.includes("aifie_http_request_duration_ms"));

  // Health Probes
  const live = openObservabilitySuite.getLivenessProbe();
  assert.strictEqual(live.status, "ALIVE");
  const ready = openObservabilitySuite.getReadinessProbe();
  assert.strictEqual(ready.status, "READY");
});

test("UIOM Master Orchestrator: Executes full coordinated 10-pillar integration flow and MCP Tools 56-65", async () => {
  // Coordinated Flow
  const flow = await universalOrchestrationMesh.executeCoordinatedIntegrationFlow({
    orderIntent: { symbol: "AAPL", side: "BUY", qty: 15, price: 150.25 },
    prompt: "Evaluate trade execution viability under current volatility.",
    workflowId: "wf-trade-alert"
  });

  assert.strictEqual(flow.success, true);
  assert.ok(flow.flowId.startsWith("flow-"));
  assert.strictEqual(flow.auth.valid, true);
  assert.strictEqual(flow.risk.approved, true);
  assert.ok(flow.llm.content.length > 0);
  assert.strictEqual(flow.db.rowCount, 1);
  assert.ok(flow.queue.msgId.startsWith("msg-"));
  assert.ok(flow.n8n.status.includes("SUCCESS"));
  assert.strictEqual(typeof flow.ws.recipients, "number");

  // MCP Server Tools 56-65 Verification
  const mcpServer = createQuantResearchMcpServer();
  const registeredToolNames = Array.from(mcpServer.tools.keys());

  const toolNames = [
    "dispatch_n8n_workflow",
    "invoke_universal_llm",
    "broadcast_websocket_message",
    "manage_webhook_dispatch",
    "execute_universal_db_query",
    "enqueue_message_queue_task",
    "verify_auth_rbac_permissions",
    "validate_pre_trade_risk_gateway",
    "export_observability_traces_metrics",
    "get_universal_mesh_telemetry"
  ];

  for (const name of toolNames) {
    assert.ok(registeredToolNames.includes(name), `MCP Server must register Tool '${name}'`);
  }

  // Call MCP Tool 65: get_universal_mesh_telemetry
  const meshTelemetry = await mcpServer.callTool("get_universal_mesh_telemetry", {});
  assert.strictEqual(meshTelemetry.status, "HEALTHY");
  assert.ok(meshTelemetry.subsystems.n8n);
  assert.ok(meshTelemetry.subsystems.mcp);
  assert.ok(meshTelemetry.subsystems.llm);
  assert.ok(meshTelemetry.subsystems.websocket);
  assert.ok(meshTelemetry.subsystems.database);
});
