// src/mcp/mcp-hub.mjs
// Master MCP Hub & Dynamic Tool Dispatcher
// Manages all connected domain MCP servers, tools discovery, resource streaming & protocol routing
// Pure Native ESM, Zero External Dependencies

import {
  MCP_PROTOCOL_VERSION,
  MCP_ERROR_CODES,
  STANDARD_MCP_METHODS,
  parseJsonRpcMessage,
  createSuccessResponse,
  createErrorResponse
} from "./protocol.mjs";

import { createMarketDataMcpServer } from "./servers/market-data-mcp.mjs";
import { createExecutionBrokerMcpServer } from "./servers/execution-broker-mcp.mjs";
import { createRiskSentinelMcpServer } from "./servers/risk-sentinel-mcp.mjs";
import { createQuantResearchMcpServer } from "./servers/quant-research-mcp.mjs";
import { createSystemDiagnosticsMcpServer } from "./servers/system-diagnostics-mcp.mjs";
import { createExternalBridgeMcpServer } from "./servers/external-bridge-mcp.mjs";

export class McpHub {
  constructor() {
    this.servers = new Map(); // serverId -> McpServer
    this.toolsIndex = new Map(); // toolName -> { serverId, server, tool }
    this.resourcesIndex = new Map(); // uri -> { serverId, server, resource }

    this.telemetry = {
      totalRequests: 0,
      totalToolCalls: 0,
      totalErrors: 0,
      connectedAt: Date.now()
    };

    // Auto-register the 6 required institutional MCP servers
    this._initializeDefaultServers();
  }

  _initializeDefaultServers() {
    this.registerServer(createMarketDataMcpServer());
    this.registerServer(createExecutionBrokerMcpServer());
    this.registerServer(createRiskSentinelMcpServer());
    this.registerServer(createQuantResearchMcpServer());
    this.registerServer(createSystemDiagnosticsMcpServer());
    this.registerServer(createExternalBridgeMcpServer());
  }

  /**
   * Register an MCP Server instance into the Hub
   */
  registerServer(server) {
    if (!server || !server.serverId) {
      throw new Error("Invalid MCP server instance");
    }

    this.servers.set(server.serverId, server);

    // Rebuild unified indexes
    this._rebuildIndexes();
    return this;
  }

  _rebuildIndexes() {
    this.toolsIndex.clear();
    this.resourcesIndex.clear();

    for (const [serverId, server] of this.servers.entries()) {
      // Index tools
      for (const [toolName, tool] of server.tools.entries()) {
        const qualifiedName = `${serverId}:${toolName}`;
        const entry = { serverId, server, tool };
        this.toolsIndex.set(qualifiedName, entry);

        // Also register unqualified alias if not conflicting
        if (!this.toolsIndex.has(toolName)) {
          this.toolsIndex.set(toolName, entry);
        }
      }

      // Index resources
      for (const [uri, resource] of server.resources.entries()) {
        this.resourcesIndex.set(uri, { serverId, server, resource });
      }
    }
  }

  /**
   * List all registered and active MCP servers
   */
  listServers() {
    return Array.from(this.servers.values()).map(s => ({
      id: s.serverId,
      serverId: s.serverId,
      name: s.name,
      version: s.version,
      description: s.description,
      status: "CONNECTED",
      toolsCount: s.tools.size,
      resourcesCount: s.resources.size,
      invocations: s.telemetry.toolCallsCount,
      requestsCount: s.telemetry.requestsCount,
      errorsCount: s.telemetry.errorsCount
    }));
  }

  /**
   * List all available tools across all connected servers
   */
  listAllTools() {
    const list = [];
    for (const [serverId, server] of this.servers.entries()) {
      for (const tool of server.tools.values()) {
        list.push({
          name: tool.name,
          qualifiedName: `${serverId}:${tool.name}`,
          serverId,
          description: tool.description,
          inputSchema: tool.inputSchema
        });
      }
    }
    return list;
  }

  /**
   * List all available resources across all connected servers
   */
  listAllResources() {
    const list = [];
    for (const [serverId, server] of this.servers.entries()) {
      for (const res of server.resources.values()) {
        list.push({
          uri: res.uri,
          name: res.name,
          serverId,
          description: res.description,
          mimeType: res.mimeType
        });
      }
    }
    return list;
  }

  /**
   * Call any registered MCP tool by name
   */
  async callTool(name, args = {}, targetServerId = null) {
    this.telemetry.totalToolCalls++;

    // 1. Direct qualified lookup
    let entry = this.toolsIndex.get(name);

    // 2. Lookup with serverId prefix
    if (!entry && targetServerId) {
      entry = this.toolsIndex.get(`${targetServerId}:${name}`);
    }

    if (!entry) {
      this.telemetry.totalErrors++;
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Tool '${name}' not found on any connected MCP server.`
          }
        ]
      };
    }

    try {
      const output = await entry.tool.handler(args, { hub: this, server: entry.server });
      const content = Array.isArray(output?.content) ? output.content : [
        {
          type: "text",
          text: typeof output === "string" ? output : JSON.stringify(output, null, 2)
        }
      ];
      return {
        content,
        isError: Boolean(output?.isError),
        serverId: entry.serverId,
        tool: entry.tool.name
      };
    } catch (err) {
      this.telemetry.totalErrors++;
      return {
        isError: true,
        serverId: entry.serverId,
        tool: entry.tool.name,
        content: [
          {
            type: "text",
            text: `Tool execution failed: ${err.message}`
          }
        ]
      };
    }
  }

  /**
   * Read any registered MCP resource by URI
   */
  async readResource(uri) {
    const entry = this.resourcesIndex.get(uri);
    if (!entry) {
      throw new Error(`Resource '${uri}' not found on any connected MCP server.`);
    }

    const data = await entry.resource.handler({ hub: this, server: entry.server, uri });
    return {
      uri,
      serverId: entry.serverId,
      mimeType: entry.resource.mimeType,
      data
    };
  }

  /**
   * Universal Unified JSON-RPC 2.0 message handler for Stdio, SSE, or HTTP
   */
  async handleMessage(rawMessage) {
    this.telemetry.totalRequests++;

    const parseResult = parseJsonRpcMessage(rawMessage);
    if (!parseResult.valid) {
      this.telemetry.totalErrors++;
      return parseResult.error;
    }

    const { id, method, params, isNotification } = parseResult.message;

    try {
      switch (method) {
        case STANDARD_MCP_METHODS.INITIALIZE: {
          const result = {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
              logging: {}
            },
            serverInfo: {
              name: "Aifie Sovereign Unified MCP Hub",
              version: "1.0.0",
              description: "Unified Hub connecting 6 Institutional Trading & Quantitative MCP Servers",
              connectedServersCount: this.servers.size,
              totalToolsAvailable: this.listAllTools().length
            }
          };
          return isNotification ? null : createSuccessResponse(id, result);
        }

        case STANDARD_MCP_METHODS.INITIALIZED: {
          return null;
        }

        case STANDARD_MCP_METHODS.PING: {
          return isNotification ? null : createSuccessResponse(id, { status: "pong", timestamp: Date.now() });
        }

        case STANDARD_MCP_METHODS.TOOLS_LIST: {
          const tools = this.listAllTools().map(t => ({
            name: t.name,
            description: `[${t.serverId}] ${t.description}`,
            inputSchema: t.inputSchema
          }));
          return isNotification ? null : createSuccessResponse(id, { tools });
        }

        case STANDARD_MCP_METHODS.TOOLS_CALL: {
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          const result = await this.callTool(toolName, toolArgs);
          return isNotification ? null : createSuccessResponse(id, result);
        }

        case STANDARD_MCP_METHODS.RESOURCES_LIST: {
          const resources = this.listAllResources().map(r => ({
            uri: r.uri,
            name: `[${r.serverId}] ${r.name}`,
            description: r.description,
            mimeType: r.mimeType
          }));
          return isNotification ? null : createSuccessResponse(id, { resources });
        }

        case STANDARD_MCP_METHODS.RESOURCES_READ: {
          const uri = params.uri;
          try {
            const resourceResult = await this.readResource(uri);
            const contents = [
              {
                uri,
                mimeType: resourceResult.mimeType,
                text: typeof resourceResult.data === "string" ? resourceResult.data : JSON.stringify(resourceResult.data, null, 2)
              }
            ];
            return isNotification ? null : createSuccessResponse(id, { contents });
          } catch (err) {
            this.telemetry.totalErrors++;
            return isNotification ? null : createErrorResponse(
              id,
              MCP_ERROR_CODES.RESOURCE_NOT_FOUND,
              err.message
            );
          }
        }

        default: {
          this.telemetry.totalErrors++;
          return isNotification ? null : createErrorResponse(
            id,
            MCP_ERROR_CODES.METHOD_NOT_FOUND,
            `Method '${method}' not supported by Aifie Unified MCP Hub`
          );
        }
      }
    } catch (err) {
      this.telemetry.totalErrors++;
      return isNotification ? null : createErrorResponse(
        id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        `Internal Hub Error: ${err.message}`
      );
    }
  }

  /**
   * Get Master Telemetry Snapshot
   */
  getTelemetry() {
    const tools = this.listAllTools().map(t => ({
      name: t.name,
      server: t.serverId,
      serverId: t.serverId,
      qualifiedName: t.qualifiedName,
      description: t.description,
      inputSchema: t.inputSchema
    }));
    const resources = this.listAllResources().map(r => ({
      uri: r.uri,
      name: r.name,
      server: r.serverId,
      serverId: r.serverId,
      description: r.description,
      mimeType: r.mimeType
    }));
    const servers = this.listServers();

    return {
      status: "ONLINE",
      protocolVersion: MCP_PROTOCOL_VERSION,
      connectedServers: this.servers.size,
      connectedServersCount: this.servers.size,
      totalTools: tools.length,
      totalToolsCount: tools.length,
      totalResources: resources.length,
      totalResourcesCount: resources.length,
      totalInvocations: this.telemetry.totalToolCalls,
      totalToolCalls: this.telemetry.totalToolCalls,
      totalRequests: this.telemetry.totalRequests,
      totalErrors: this.telemetry.totalErrors,
      servers,
      tools,
      resources
    };
  }
}

// Global Singleton MCP Hub
export const mcpHub = new McpHub();
