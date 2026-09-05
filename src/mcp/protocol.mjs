// src/mcp/protocol.mjs
// Official Model Context Protocol (MCP) v2024-11-05 Specifications & JSON-RPC 2.0 Primitives
// Pure Native ESM, Zero External Dependencies

export const MCP_PROTOCOL_VERSION = "2024-11-05";
export const JSONRPC_VERSION = "2.0";

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TOOL_EXECUTION_ERROR: -32000,
  RESOURCE_NOT_FOUND: -32001,
  ACCESS_DENIED: -32002
};

export const STANDARD_MCP_METHODS = {
  INITIALIZE: "initialize",
  INITIALIZED: "notifications/initialized",
  PING: "ping",
  TOOLS_LIST: "tools/list",
  TOOLS_CALL: "tools/call",
  RESOURCES_LIST: "resources/list",
  RESOURCES_READ: "resources/read",
  RESOURCES_SUBSCRIBE: "resources/subscribe",
  PROMPTS_LIST: "prompts/list",
  PROMPTS_GET: "prompts/get",
  LOGGING_SET_LEVEL: "logging/setLevel"
};

/**
 * Validates and parses a raw string or object into a JSON-RPC 2.0 message envelope
 */
export function parseJsonRpcMessage(raw) {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return {
        valid: false,
        error: createErrorResponse(null, MCP_ERROR_CODES.PARSE_ERROR, "Invalid JSON received by MCP parser", err.message)
      };
    }
  }

  if (!parsed || typeof parsed !== "object" || parsed.jsonrpc !== JSONRPC_VERSION) {
    return {
      valid: false,
      error: createErrorResponse(parsed?.id ?? null, MCP_ERROR_CODES.INVALID_REQUEST, "Invalid JSON-RPC 2.0 request envelope")
    };
  }

  return {
    valid: true,
    message: {
      id: parsed.id !== undefined ? parsed.id : null,
      method: typeof parsed.method === "string" ? parsed.method.trim() : "",
      params: parsed.params && typeof parsed.params === "object" ? parsed.params : {},
      isNotification: parsed.id === undefined
    }
  };
}

/**
 * Constructs a JSON-RPC 2.0 Success Response
 */
export function createSuccessResponse(id, result) {
  return {
    jsonrpc: JSONRPC_VERSION,
    id: id !== undefined ? id : null,
    result: result || {}
  };
}

/**
 * Constructs a JSON-RPC 2.0 Error Response
 */
export function createErrorResponse(id, code, message, data = null) {
  const response = {
    jsonrpc: JSONRPC_VERSION,
    id: id !== undefined ? id : null,
    error: {
      code,
      message
    }
  };
  if (data !== null && data !== undefined) {
    response.error.data = data;
  }
  return response;
}

/**
 * Standard MCP Error wrapper class
 */
export class McpError extends Error {
  constructor(code, message, data = null) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.data = data;
  }
}

/**
 * Constructs an MCP Tool Execution Result conforming to standard protocol
 */
export function createToolResult(data, isError = false) {
  let text = "";
  if (typeof data === "string") {
    text = data;
  } else {
    try {
      text = JSON.stringify(data, null, 2);
    } catch (_) {
      text = String(data);
    }
  }

  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError: Boolean(isError)
  };
}
