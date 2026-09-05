// src/mcp/transports/stdio-transport.mjs
// Stdio Stream Transport for Model Context Protocol (MCP)
// Enables native integration with Claude Desktop, Cursor, Antigravity IDE & Terminal Agents

import readline from "node:readline";

export class McpStdioTransport {
  constructor(mcpHandler, options = {}) {
    this.handler = mcpHandler;
    this.stdin = options.stdin || process.stdin;
    this.stdout = options.stdout || process.stdout;
    this.stderr = options.stderr || process.stderr;
    this.rl = null;
    this.running = false;
  }

  /**
   * Start listening on stdio
   */
  start() {
    if (this.running) return;
    this.running = true;

    this.rl = readline.createInterface({
      input: this.stdin,
      output: null,
      terminal: false
    });

    this.rl.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const response = await this.handler.handleMessage(trimmed);
        if (response) {
          this.send(response);
        }
      } catch (err) {
        this.logError(`Stdio transport handler error: ${err.message}`);
      }
    });

    this.rl.on("close", () => {
      this.running = false;
    });
  }

  /**
   * Send JSON-RPC response to stdout followed by newline
   */
  send(message) {
    if (!this.stdout.writable) return;
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    this.stdout.write(payload + "\n");
  }

  /**
   * Safe logging to stderr so stdout JSON-RPC stream remains clean
   */
  log(msg) {
    this.stderr.write(`[MCP-STDIO] ${msg}\n`);
  }

  logError(msg) {
    this.stderr.write(`[MCP-STDIO ERROR] ${msg}\n`);
  }

  stop() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.running = false;
  }
}
