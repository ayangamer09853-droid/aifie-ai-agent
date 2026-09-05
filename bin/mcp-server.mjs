#!/usr/bin/env node
// bin/mcp-server.mjs
// Standalone Stdio Model Context Protocol (MCP) Server for Aifie AI Agent
// Compatible with Claude Desktop, Cursor, Antigravity IDE & Terminal LLM Hosts
// Pure Native ESM, Zero External Dependencies

import { mcpHub } from "../src/mcp/mcp-hub.mjs";
import { McpStdioTransport } from "../src/mcp/transports/stdio-transport.mjs";

const transport = new McpStdioTransport(mcpHub);

process.stderr.write(`[AIFIE-MCP] Sovereign MCP Server Online. Protocol: 2024-11-05\n`);
process.stderr.write(`[AIFIE-MCP] Connected Servers: ${mcpHub.servers.size} | Tools: ${mcpHub.listAllTools().length} | Resources: ${mcpHub.listAllResources().length}\n`);

transport.start();

process.on("SIGINT", () => {
  transport.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  transport.stop();
  process.exit(0);
});
