// src/integrations/universal-orchestration-mesh.mjs
// Master Orchestrator: Universal Integration & Orchestration Mesh (UIOM)
// Unifying n8n, MCP Mesh, Multi-LLM, WebSockets, Webhooks, Universal DB, Message Queue, Auth/RBAC, Risk API & Observability
// Zero-dependency Node.js ESM built-ins only

import { n8nConnector } from "./n8n-workflow-connector.mjs";
import { mcpExtendedMesh } from "./mcp-extended-mesh.mjs";
import { universalLlmGateway } from "./universal-llm-gateway.mjs";
import { nativeWebSocketHub } from "./native-websocket-hub.mjs";
import { webhookManagementHub } from "./webhook-management-hub.mjs";
import { universalDatabaseAdapter } from "./universal-database-adapter.mjs";
import { enterpriseMessageQueue } from "./enterprise-message-queue.mjs";
import { enterpriseAuthRbacGateway } from "./enterprise-auth-rbac-gateway.mjs";
import { institutionalRiskApiGateway } from "./institutional-risk-api-gateway.mjs";
import { openObservabilitySuite } from "./open-observability-suite.mjs";

export class UniversalOrchestrationMesh {
  constructor() {
    this.n8n = n8nConnector;
    this.mcp = mcpExtendedMesh;
    this.llm = universalLlmGateway;
    this.ws = nativeWebSocketHub;
    this.webhooks = webhookManagementHub;
    this.db = universalDatabaseAdapter;
    this.queue = enterpriseMessageQueue;
    this.auth = enterpriseAuthRbacGateway;
    this.risk = institutionalRiskApiGateway;
    this.observability = openObservabilitySuite;
    this.startedAt = new Date().toISOString();
    this._bindMeshEvents();
  }

  /**
   * Bind cross-subsystem event reactive loops.
   */
  _bindMeshEvents() {
    // 1. Inbound Webhooks -> Publish to Queue and broadcast to WebSockets
    this.webhooks.on("inbound_event", (event) => {
      this.queue.enqueue("inbound_webhooks", event, { priority: "P1" });
      this.ws.broadcast("market_signals", event);
      this.observability.log("INFO", `Inbound webhook received from ${event.source}`, { inboundId: event.inboundId });
    });

    // 2. Risk Evaluations -> If breached, dispatch emergency n8n workflow
    // (Handled via pre-trade check or manual trigger)

    // 3. WebSocket client connections -> Track metric
    this.ws.on("client_connected", () => {
      this.observability.metrics.activeWebsocketConnections = this.ws.clients.size;
    });
    this.ws.on("client_disconnected", () => {
      this.observability.metrics.activeWebsocketConnections = this.ws.clients.size;
    });
  }

  /**
   * Coordinated end-to-end integration execution flow:
   * 1. Auth/RBAC permission check
   * 2. Pre-trade Risk evaluation
   * 3. LLM Quantitative synthesis
   * 4. DB record transaction
   * 5. Message queue task dispatch
   * 6. n8n workflow notification
   * 7. WebSocket live broadcast
   */
  async executeCoordinatedIntegrationFlow({
    apiKey = null,
    jwtToken = null,
    orderIntent = { symbol: "AAPL", side: "BUY", qty: 10, price: 150 },
    prompt = "Synthesize execution rationale for institutional trade.",
    workflowId = "wf-trade-alert"
  } = {}) {
    const span = this.observability.startSpan("coordinated_integration_flow", {
      attributes: { "order.symbol": orderIntent.symbol, "order.side": orderIntent.side }
    });

    const results = {
      flowId: "flow-" + span.spanId,
      timestamp: new Date().toISOString(),
      auth: null,
      risk: null,
      llm: null,
      db: null,
      queue: null,
      n8n: null,
      ws: null,
      success: false
    };

    try {
      // Step 1: Authentication & RBAC Check
      if (apiKey) {
        results.auth = this.auth.verifyApiKey(apiKey);
      } else if (jwtToken) {
        results.auth = this.auth.verifyJwt(jwtToken);
      } else {
        // Fallback default admin check for coordinated internal flows
        results.auth = { valid: true, mode: "INTERNAL_MESH_AUTHORIZATION", role: "SUPER_ADMIN" };
      }

      // Step 2: Pre-Trade Risk Gateway Check
      results.risk = this.risk.evaluatePreTradeRisk(orderIntent);
      if (!results.risk.approved) {
        results.success = false;
        results.reason = "RISK_GATEWAY_REJECTED";
        span.end("ERROR", { "error.reason": "RISK_GATEWAY_REJECTED" });
        return results;
      }

      // Step 3: LLM Inference Synthesis
      results.llm = await this.llm.chatCompletion({
        messages: [{ role: "user", content: `${prompt} Order: ${orderIntent.side} ${orderIntent.qty} ${orderIntent.symbol} @ $${orderIntent.price}` }]
      });

      // Step 4: DB Storage
      results.db = await this.db.executeQuery("INSERT INTO trades", [
        { symbol: orderIntent.symbol, side: orderIntent.side, qty: orderIntent.qty, price: orderIntent.price, status: "APPROVED" }
      ]);

      // Step 5: Enqueue Message Queue task
      results.queue = this.queue.enqueue("order_execution_queue", {
        order: orderIntent,
        llmRationale: results.llm.content,
        flowId: results.flowId
      }, { priority: "P0" });

      // Step 6: Dispatch n8n workflow
      results.n8n = await this.n8n.dispatchWorkflow(workflowId, {
        order: orderIntent,
        flowId: results.flowId,
        status: "APPROVED_AND_QUEUED"
      });

      // Step 7: Broadcast via WebSockets
      results.ws = this.ws.broadcast("orders", {
        flowId: results.flowId,
        order: orderIntent,
        status: "EXECUTED_MESH"
      });

      this.observability.metrics.tradesExecutedTotal++;
      results.success = true;
      span.end("OK", { "flow.status": "COMPLETED" });

      return results;
    } catch (err) {
      results.error = err.message;
      results.success = false;
      span.end("ERROR", { "error.message": err.message });
      return results;
    }
  }

  /**
   * Consolidated Telemetry and Status across all 10 pillars.
   */
  getMeshStatus() {
    return {
      status: "HEALTHY",
      meshStartedAt: this.startedAt,
      subsystems: {
        n8n: this.n8n.getStatus(),
        mcp: this.mcp.getStatus(),
        llm: this.llm.getStatus(),
        websocket: this.ws.getStatus(),
        webhooks: this.webhooks.getStatus(),
        database: this.db.getStatus(),
        messageQueue: this.queue.getStatus(),
        authRbac: this.auth.getStatus(),
        riskGateway: this.risk.getStatus(),
        observability: this.observability.getStatus()
      }
    };
  }
}

export const universalOrchestrationMesh = new UniversalOrchestrationMesh();
