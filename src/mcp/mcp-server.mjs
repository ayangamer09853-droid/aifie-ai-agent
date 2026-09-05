// src/mcp/mcp-server.mjs
// Base Extensible Model Context Protocol (MCP) Server Class
// Pure Native ESM, Zero External Dependencies

import {
  MCP_PROTOCOL_VERSION,
  MCP_ERROR_CODES,
  STANDARD_MCP_METHODS,
  parseJsonRpcMessage,
  createSuccessResponse,
  createErrorResponse
} from "./protocol.mjs";

export class McpServer {
  constructor({
    serverId,
    name,
    version = "1.0.0",
    description = ""
  } = {}) {
    this.serverId = serverId || "aifie-mcp-server";
    this.name = name || "Aifie Sovereign MCP Server";
    this.version = version;
    this.description = description;

    this.tools = new Map(); // toolName -> { name, description, inputSchema, handler }
    this.resources = new Map(); // uri -> { uri, name, description, mimeType, handler }
    this.prompts = new Map(); // promptName -> { name, description, arguments, handler }

    this.initialized = false;
    this.clientInfo = null;
    this.telemetry = {
      requestsCount: 0,
      toolCallsCount: 0,
      resourceReadsCount: 0,
      errorsCount: 0,
      lastRequestAt: null
    };
  }

  /**
   * Register a callable tool
   */
  registerTool({ name, description, inputSchema = { type: "object", properties: {} }, handler }) {
    if (!name || typeof handler !== "function") {
      throw new Error(`Invalid tool registration for server ${this.serverId}: name and handler function required`);
    }
    this.tools.set(name, {
      name,
      description: description || `Tool ${name}`,
      inputSchema,
      handler
    });
    return this;
  }

  /**
   * Convenience programmatic invocation for tools
   */
  async callTool(name, args = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found on server ${this.serverId}`);
    }
    return tool.handler(args);
  }

  /**
   * Register a readable resource
   */
  registerResource({ uri, name, description, mimeType = "application/json", handler }) {
    if (!uri || typeof handler !== "function") {
      throw new Error(`Invalid resource registration for server ${this.serverId}: uri and handler function required`);
    }
    this.resources.set(uri, {
      uri,
      name: name || uri,
      description: description || `Resource ${uri}`,
      mimeType,
      handler
    });
    return this;
  }

  /**
   * Register a prompt template
   */
  registerPrompt({ name, description, args = [], handler }) {
    if (!name || typeof handler !== "function") {
      throw new Error(`Invalid prompt registration for server ${this.serverId}: name and handler function required`);
    }
    this.prompts.set(name, {
      name,
      description: description || `Prompt ${name}`,
      arguments: args,
      handler
    });
    return this;
  }

  /**
   * Get Server Metadata & Capabilities
   */
  getCapabilities() {
    return {
      tools: {
        listChanged: false
      },
      resources: {
        subscribe: false,
        listChanged: false
      },
      prompts: {
        listChanged: false
      },
      logging: {}
    };
  }

  /**
   * Dispatches and handles a single JSON-RPC 2.0 message
   */
  async handleMessage(rawMessage) {
    const parseResult = parseJsonRpcMessage(rawMessage);
    if (!parseResult.valid) {
      this.telemetry.errorsCount++;
      return parseResult.error;
    }

    const { id, method, params, isNotification } = parseResult.message;
    this.telemetry.requestsCount++;
    this.telemetry.lastRequestAt = Date.now();

    try {
      switch (method) {
        case STANDARD_MCP_METHODS.INITIALIZE: {
          this.initialized = true;
          this.clientInfo = params.clientInfo || {};
          const result = {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: this.getCapabilities(),
            serverInfo: {
              name: this.name,
              version: this.version,
              description: this.description,
              serverId: this.serverId
            }
          };
          return isNotification ? null : createSuccessResponse(id, result);
        }

        case STANDARD_MCP_METHODS.INITIALIZED: {
          return null; // Notification acknowledgment
        }

        case STANDARD_MCP_METHODS.PING: {
          return isNotification ? null : createSuccessResponse(id, { status: "pong", timestamp: Date.now() });
        }

        case STANDARD_MCP_METHODS.TOOLS_LIST: {
          const toolsList = Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }));
          return isNotification ? null : createSuccessResponse(id, { tools: toolsList });
        }

        case STANDARD_MCP_METHODS.TOOLS_CALL: {
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          const tool = this.tools.get(toolName);

          if (!tool) {
            this.telemetry.errorsCount++;
            return isNotification ? null : createErrorResponse(
              id,
              MCP_ERROR_CODES.METHOD_NOT_FOUND,
              `Tool '${toolName}' not found on server '${this.serverId}'`
            );
          }

          this.telemetry.toolCallsCount++;
          try {
            const output = await tool.handler(toolArgs, { server: this, id, params });
            const content = Array.isArray(output?.content) ? output.content : [
              {
                type: "text",
                text: typeof output === "string" ? output : JSON.stringify(output, null, 2)
              }
            ];
            return isNotification ? null : createSuccessResponse(id, {
              content,
              isError: Boolean(output?.isError)
            });
          } catch (execErr) {
            this.telemetry.errorsCount++;
            return isNotification ? null : createSuccessResponse(id, {
              content: [
                {
                  type: "text",
                  text: `Error executing tool '${toolName}': ${execErr.message}`
                }
              ],
              isError: true
            });
          }
        }

        case STANDARD_MCP_METHODS.RESOURCES_LIST: {
          const resourceList = Array.from(this.resources.values()).map(r => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType
          }));
          return isNotification ? null : createSuccessResponse(id, { resources: resourceList });
        }

        case STANDARD_MCP_METHODS.RESOURCES_READ: {
          const uri = params.uri;
          const resource = this.resources.get(uri);
          if (!resource) {
            this.telemetry.errorsCount++;
            return isNotification ? null : createErrorResponse(
              id,
              MCP_ERROR_CODES.RESOURCE_NOT_FOUND,
              `Resource '${uri}' not found on server '${this.serverId}'`
            );
          }

          this.telemetry.resourceReadsCount++;
          try {
            const data = await resource.handler({ server: this, uri, params });
            const contents = [
              {
                uri,
                mimeType: resource.mimeType,
                text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
              }
            ];
            return isNotification ? null : createSuccessResponse(id, { contents });
          } catch (resErr) {
            this.telemetry.errorsCount++;
            return isNotification ? null : createErrorResponse(
              id,
              MCP_ERROR_CODES.INTERNAL_ERROR,
              `Failed reading resource '${uri}': ${resErr.message}`
            );
          }
        }

        case STANDARD_MCP_METHODS.PROMPTS_LIST: {
          const promptList = Array.from(this.prompts.values()).map(p => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments
          }));
          return isNotification ? null : createSuccessResponse(id, { prompts: promptList });
        }

        case STANDARD_MCP_METHODS.PROMPTS_GET: {
          const promptName = params.name;
          const prompt = this.prompts.get(promptName);
          if (!prompt) {
            this.telemetry.errorsCount++;
            return isNotification ? null : createErrorResponse(
              id,
              MCP_ERROR_CODES.INVALID_PARAMS,
              `Prompt '${promptName}' not found on server '${this.serverId}'`
            );
          }

          try {
            const promptResult = await prompt.handler(params.arguments || {}, { server: this, params });
            return isNotification ? null : createSuccessResponse(id, promptResult);
          } catch (pErr) {
            this.telemetry.errorsCount++;
            return isNotification ? null : createErrorResponse(
              id,
              MCP_ERROR_CODES.INTERNAL_ERROR,
              `Prompt generation failed: ${pErr.message}`
            );
          }
        }

        default: {
          this.telemetry.errorsCount++;
          return isNotification ? null : createErrorResponse(
            id,
            MCP_ERROR_CODES.METHOD_NOT_FOUND,
            `Unknown or unsupported method '${method}'`
          );
        }
      }
    } catch (unexpectedErr) {
      this.telemetry.errorsCount++;
      return isNotification ? null : createErrorResponse(
        id,
        MCP_ERROR_CODES.INTERNAL_ERROR,
        `Unexpected server fault: ${unexpectedErr.message}`
      );
    }
  }
}
