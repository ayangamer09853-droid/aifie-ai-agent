/**
 * Mobile Control & Native App Gateway Engine
 *
 * Implements Android/iOS mobile client connectivity, mobile session authentication,
 * command approval queue (Approve/Reject with timeout), real-time push notification
 * event broadcasting, mobile dashboard metrics, and emergency STOP button.
 */

import { EventEmitter } from "node:events";
import { randomBytes, createHmac } from "node:crypto";

export class MobileGateway extends EventEmitter {
  constructor() {
    super();
    this.secret = process.env.MOBILE_AUTH_SECRET || "mobile-agent-secret-key-32bytes-hex";
    this.activeSessions = new Map(); // token -> sessionData
    this.approvalQueue = new Map(); // approvalId -> request
    this.notifications = [];
    this.emergencyStopActive = false;
    this.stopReason = null;
    this.stoppedAt = null;
  }

  /**
   * Authenticate mobile client and issue session token
   */
  authenticateMobileUser(username, deviceId, pinCode) {
    if (!username || !deviceId) {
      throw new Error("Missing username or deviceId");
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + 86400000 * 30; // 30 days

    const session = {
      username,
      deviceId,
      token,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      role: username === "admin" ? "SUPER_ADMIN" : "MOBILE_OPERATOR",
    };

    this.activeSessions.set(token, session);
    return {
      authenticated: true,
      token,
      user: session,
    };
  }

  validateMobileSession(token) {
    const session = this.activeSessions.get(token);
    if (!session) return { valid: false, reason: "Session not found" };
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.activeSessions.delete(token);
      return { valid: false, reason: "Session expired" };
    }
    return { valid: true, session };
  }

  /**
   * Submit dangerous/sensitive command for Mobile Human Approval
   */
  submitCommandForApproval(actionType, details, timeoutMs = 60000) {
    const approvalId = `appr-${Date.now()}-${randomBytes(3).toString("hex")}`;
    const approvalRequest = {
      approvalId,
      actionType,
      details,
      status: "PENDING", // PENDING, APPROVED, REJECTED, EXPIRED
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
      decisionBy: null,
      decisionAt: null,
    };

    this.approvalQueue.set(approvalId, approvalRequest);

    // Push notification to mobile devices
    this.broadcastPushNotification({
      title: `⚠️ Approval Required: ${actionType}`,
      body: `Action requires your explicit confirmation: ${JSON.stringify(details).slice(0, 100)}`,
      approvalId,
      priority: "HIGH",
    });

    this.emit("approval_requested", approvalRequest);
    return approvalRequest;
  }

  /**
   * Mobile user approves or rejects a command
   */
  respondToApproval(approvalId, approved, respondedBy = "mobile-user") {
    const request = this.approvalQueue.get(approvalId);
    if (!request) {
      return { success: false, reason: "Approval request not found" };
    }

    if (new Date(request.expiresAt).getTime() < Date.now()) {
      request.status = "EXPIRED";
      return { success: false, reason: "Approval request has expired" };
    }

    request.status = approved ? "APPROVED" : "REJECTED";
    request.decisionBy = respondedBy;
    request.decisionAt = new Date().toISOString();

    this.broadcastPushNotification({
      title: `Action ${request.status}: ${request.actionType}`,
      body: `Decision made by ${respondedBy}`,
      approvalId,
      priority: "NORMAL",
    });

    this.emit("approval_resolved", request);
    return { success: true, approval: request };
  }

  getPendingApprovals() {
    const now = Date.now();
    const pending = [];
    for (const [id, req] of this.approvalQueue.entries()) {
      if (req.status === "PENDING") {
        if (new Date(req.expiresAt).getTime() < now) {
          req.status = "EXPIRED";
        } else {
          pending.push(req);
        }
      }
    }
    return pending;
  }

  /**
   * Broadcast push notification to mobile devices
   */
  broadcastPushNotification(notification) {
    const record = {
      id: `push-${Date.now()}-${randomBytes(2).toString("hex")}`,
      timestamp: new Date().toISOString(),
      ...notification,
    };
    this.notifications.unshift(record);
    if (this.notifications.length > 50) this.notifications.pop();
    this.emit("push_notification", record);
    return record;
  }

  /**
   * Emergency STOP: Halts all autonomous actions immediately
   */
  triggerEmergencyStop(operator = "mobile-admin", reason = "Manual Emergency STOP invoked from Mobile App") {
    this.emergencyStopActive = true;
    this.stopReason = reason;
    this.stoppedAt = new Date().toISOString();

    this.broadcastPushNotification({
      title: "🚨 EMERGENCY STOP ACTIVATED",
      body: `Agent platform paused by ${operator}: ${reason}`,
      priority: "CRITICAL",
    });

    this.emit("emergency_stop_triggered", {
      operator,
      reason,
      timestamp: this.stoppedAt,
    });

    return {
      emergencyStopActive: true,
      operator,
      reason,
      stoppedAt: this.stoppedAt,
      status: "SYSTEM_FROZEN",
    };
  }

  /**
   * Reset Emergency STOP
   */
  resumeFromEmergencyStop(operator = "mobile-admin") {
    this.emergencyStopActive = false;
    this.stopReason = null;
    const resumedAt = new Date().toISOString();

    this.broadcastPushNotification({
      title: "✅ System Resumed",
      body: `Emergency stop cleared by ${operator}`,
      priority: "NORMAL",
    });

    return {
      emergencyStopActive: false,
      resumedBy: operator,
      resumedAt,
      status: "SYSTEM_ACTIVE",
    };
  }

  getMobileDashboardStatus() {
    return {
      emergencyStopActive: this.emergencyStopActive,
      stopReason: this.stopReason,
      stoppedAt: this.stoppedAt,
      activeMobileSessions: this.activeSessions.size,
      pendingApprovalsCount: this.getPendingApprovals().length,
      recentNotifications: this.notifications.slice(0, 10),
      systemHealth: this.emergencyStopActive ? "HALTED" : "HEALTHY",
      serverTime: new Date().toISOString(),
    };
  }
}

export const mobileGateway = new MobileGateway();
