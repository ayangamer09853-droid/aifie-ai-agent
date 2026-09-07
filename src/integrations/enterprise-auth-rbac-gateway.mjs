// src/integrations/enterprise-auth-rbac-gateway.mjs
// Pillar 8: Enterprise Authentication & Granular RBAC Gateway
// Zero-dependency Node.js ESM built-ins only (pure node:crypto)

import crypto from "node:crypto";

export class EnterpriseAuthRbacGateway {
  constructor({
    jwtSecret = process.env.JWT_SECRET || "aifie_institutional_jwt_master_secret_2026",
    tokenExpirySeconds = 86400 // 24 hours
  } = {}) {
    this.jwtSecret = jwtSecret;
    this.tokenExpirySeconds = tokenExpirySeconds;
    this.apiKeys = new Map(); // apiKeyHash -> { keyId, name, role, scopes, active, createdAt }
    this.revokedTokens = new Set(); // JWT jti or signature hash
    this.rolePermissions = new Map();
    this.auditLog = [];
    this.maxAuditLog = 500;
    this._initRoles();
    this._initDefaultApiKeys();
  }

  /**
   * Initialize Role-Based Access Control permissions matrix.
   */
  _initRoles() {
    this.rolePermissions.set("SUPER_ADMIN", new Set([
      "orders:write", "orders:cancel", "risk:override", "risk:read",
      "models:execute", "models:modify", "database:read", "database:write",
      "system:admin", "metrics:read", "integrations:manage"
    ]));

    this.rolePermissions.set("EXECUTION_TRADER", new Set([
      "orders:write", "orders:cancel", "risk:read", "models:execute",
      "metrics:read", "database:read"
    ]));

    this.rolePermissions.set("QUANT_ANALYST", new Set([
      "models:execute", "models:modify", "metrics:read", "database:read", "risk:read"
    ]));

    this.rolePermissions.set("AUDITOR", new Set([
      "metrics:read", "risk:read", "database:read", "audit:read"
    ]));

    this.rolePermissions.set("READ_ONLY_VIEWER", new Set([
      "metrics:read", "models:read"
    ]));
  }

  _initDefaultApiKeys() {
    // Register default local development API key if present
    const envKey = process.env.AIFIE_API_KEY || "aifie_admin_secret_key_2026";
    this.registerApiKey({
      key: envKey,
      name: "Master Admin Key",
      role: "SUPER_ADMIN",
      scopes: ["*"]
    });
  }

  /**
   * Register a new API Key with assigned role and scopes.
   */
  registerApiKey({ key, name = "API Key", role = "EXECUTION_TRADER", scopes = [] }) {
    const rawKey = key || "ak_" + crypto.randomBytes(24).toString("hex");
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyId = "key-" + crypto.randomUUID().slice(0, 8);

    const keyRecord = {
      keyId,
      name,
      role,
      scopes: scopes.includes("*") ? Array.from(this.rolePermissions.get(role) || []) : scopes,
      active: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: null
    };

    this.apiKeys.set(keyHash, keyRecord);
    return { ...keyRecord, rawKey };
  }

  /**
   * Generate an RFC 7519 HMAC-SHA256 Signed JWT Token.
   */
  generateJwt({ subject, role = "EXECUTION_TRADER", customScopes = [] }) {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const allowedScopes = customScopes.length > 0 
      ? customScopes 
      : Array.from(this.rolePermissions.get(role) || []);

    const payload = {
      iss: "aifie-auth-gateway",
      sub: subject || "user-1",
      role,
      scopes: allowedScopes,
      iat: now,
      exp: now + this.tokenExpirySeconds,
      jti
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.jwtSecret)
      .update(`${b64Header}.${b64Payload}`)
      .digest("base64url");

    return {
      token: `${b64Header}.${b64Payload}.${signature}`,
      expiresIn: this.tokenExpirySeconds,
      tokenType: "Bearer",
      payload
    };
  }

  /**
   * Verify and decode a JWT Token.
   */
  verifyJwt(token) {
    if (!token || typeof token !== "string") {
      return { valid: false, error: "MISSING_TOKEN" };
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "INVALID_JWT_STRUCTURE" };
    }

    const [b64Header, b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", this.jwtSecret)
      .update(`${b64Header}.${b64Payload}`)
      .digest("base64url");

    if (signature !== expectedSig) {
      return { valid: false, error: "INVALID_SIGNATURE" };
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf8"));
    } catch {
      return { valid: false, error: "MALFORMED_PAYLOAD" };
    }

    if (payload.jti && this.revokedTokens.has(payload.jti)) {
      return { valid: false, error: "TOKEN_REVOKED" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "TOKEN_EXPIRED" };
    }

    return { valid: true, payload };
  }

  /**
   * Verify an incoming API Key.
   */
  verifyApiKey(rawKey) {
    if (!rawKey) return { valid: false, error: "MISSING_API_KEY" };
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const record = this.apiKeys.get(keyHash);

    if (!record || !record.active) {
      return { valid: false, error: "INVALID_OR_REVOKED_API_KEY" };
    }

    record.lastUsedAt = new Date().toISOString();
    return { valid: true, record };
  }

  /**
   * Verify if user/token has permission for a specific scope action.
   */
  checkPermission(principal, requiredScope) {
    const role = principal.role || "READ_ONLY_VIEWER";
    const scopes = principal.scopes || Array.from(this.rolePermissions.get(role) || []);

    const hasPermission = scopes.includes("*") || scopes.includes(requiredScope);
    
    // Log security check
    this._logAudit({
      actor: principal.sub || principal.name || "anonymous",
      role,
      action: "PERMISSION_CHECK",
      resource: requiredScope,
      authorized: hasPermission
    });

    return {
      authorized: hasPermission,
      role,
      requiredScope
    };
  }

  /**
   * Revoke a token by JTI.
   */
  revokeToken(jti) {
    this.revokedTokens.add(jti);
    return { revoked: true, jti };
  }

  _logAudit(entry) {
    this.auditLog.unshift({
      id: "audit-" + crypto.randomUUID().slice(0, 8),
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (this.auditLog.length > this.maxAuditLog) this.auditLog.pop();
  }

  /**
   * Telemetry status report.
   */
  getStatus() {
    return {
      registeredApiKeysCount: this.apiKeys.size,
      definedRolesCount: this.rolePermissions.size,
      roles: Array.from(this.rolePermissions.keys()),
      revokedTokensCount: this.revokedTokens.size,
      totalAuditEvents: this.auditLog.length,
      recentAuditEvents: this.auditLog.slice(0, 10)
    };
  }
}

export const enterpriseAuthRbacGateway = new EnterpriseAuthRbacGateway();
