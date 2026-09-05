// src/security/security-authorization-gate.mjs
// Security: API Authentication, Telegram RBAC Authorization & Secret Masking Sentry
// Pure Native Node.js ESM built-ins only

export class SecurityAuthorizationGate {
  constructor({
    apiKey = process.env.AIFIE_API_KEY || null,
    adminChatId = process.env.ADMIN_CHAT_ID || null,
    authorizedTelegramUsers = process.env.TELEGRAM_AUTHORIZED_USERS ? process.env.TELEGRAM_AUTHORIZED_USERS.split(",").map(u => u.trim()) : []
  } = {}) {
    this.apiKey = apiKey;
    this.adminChatId = adminChatId ? String(adminChatId) : null;
    this.authorizedUsers = new Set(authorizedTelegramUsers.map(String));
    if (this.adminChatId) this.authorizedUsers.add(this.adminChatId);
  }

  /**
   * Verify HTTP Bearer Authorization header for mutating REST endpoints.
   */
  authenticateHttpRequest(request) {
    if (!this.apiKey) {
      // If no API key configured, pass through in local development mode
      return { authenticated: true, mode: "LOCAL_DEV_UNRESTRICTED" };
    }

    const authHeader = request.headers?.["authorization"] || request.headers?.["Authorization"] || "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { authenticated: false, status: 401, error: "UNAUTHORIZED_MISSING_BEARER_TOKEN" };
    }

    const token = authHeader.slice(7).trim();
    if (token !== this.apiKey) {
      return { authenticated: false, status: 403, error: "FORBIDDEN_INVALID_API_KEY" };
    }

    return { authenticated: true, mode: "BEARER_TOKEN_AUTHENTICATED" };
  }

  /**
   * Check if Telegram chat / user is authorized to execute sensitive commands.
   */
  authorizeTelegramUser(chatId, command = "/status") {
    const cid = String(chatId);
    // Public non-mutating information commands
    const publicCommands = ["/start", "/help", "/docs", "/support", "/language"];
    const isPublic = publicCommands.some(cmd => command.toLowerCase().startsWith(cmd));

    if (isPublic) {
      return { authorized: true, role: "PUBLIC_GUEST" };
    }

    // If whitelist configured, verify membership
    if (this.authorizedUsers.size > 0) {
      if (this.authorizedUsers.has(cid)) {
        return { authorized: true, role: cid === this.adminChatId ? "SUPER_ADMIN" : "AUTHORIZED_TRADER" };
      }
      return {
        authorized: false,
        role: "UNAUTHORIZED",
        reason: "CHAT_ID_NOT_IN_SECURITY_WHITELIST",
        chatId: cid
      };
    }

    // Default open access if no whitelist specified
    return { authorized: true, role: "DEFAULT_OPERATOR" };
  }

  /**
   * Redact sensitive secrets from log lines or outgoing messages.
   */
  maskSecrets(text) {
    if (!text || typeof text !== "string") return text;

    let sanitized = text;
    // Mask Telegram bot tokens: 123456789:ABCdefGHI...
    sanitized = sanitized.replace(/\b\d{9,10}:[A-Za-z0-9_-]{35}\b/g, "[REDACTED_TELEGRAM_TOKEN]");
    // Mask Hex private keys (64 hex characters)
    sanitized = sanitized.replace(/\b[a-fA-F0-9]{64}\b/g, "[REDACTED_PRIVATE_KEY]");
    // Mask Alpaca keys: PK... or AK...
    sanitized = sanitized.replace(/\b(PK[A-Za-z0-9]{18}|AK[A-Za-z0-9]{18})\b/g, "[REDACTED_BROKER_KEY]");

    return sanitized;
  }
}

export const securityAuthorizationGate = new SecurityAuthorizationGate();
