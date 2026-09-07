/**
 * Master Autonomous AI Agent Platform Orchestrator
 *
 * Central orchestrator combining:
 * 1. AI Core & LLM Gateway
 * 2. Mobile Control & Approval Screen
 * 3. Backend Task Queue & Scheduler
 * 4. 10-Agent Specialist Fleet
 * 5. Tools & IoT Integrations
 * 6. Multi-Modal Database & Vector Knowledge Base
 * 7. Multi-Format Document Intelligence Engine
 * 8. Autonomous Scheduler & Website Sentry
 * 9. Security Fortress & Human Approval Gate
 * 10. 7-System Controlled Self-Improvement & Internet Evolution Sentry
 */

import { masterRouter } from "./multi-agent-router.mjs";
import { documentProcessor } from "./document-processor.mjs";
import { mobileGateway } from "./mobile-gateway.mjs";
import { humanApprovalGate } from "./human-approval-gate.mjs";
import { autonomousScheduler } from "./autonomous-scheduler-workflows.mjs";
import { selfImprovingLoop } from "./self-improving-feedback-loop.mjs";
import { internetImprovementSentry } from "./internet-self-improvement-sentry.mjs";
import { universalOrchestrationMesh } from "../integrations/universal-orchestration-mesh.mjs";

export class MasterPlatformOrchestrator {
  constructor() {
    this.name = "Aifie Universal Autonomous AI Agent Platform";
    this.version = "v3.0.0-ENTERPRISE";
    this.bootstrappedAt = new Date().toISOString();
  }

  /**
   * Execute an end-to-end intelligent command with security checks, routing, and self-learning
   */
  async processUserCommand(prompt, context = {}) {
    // 1. Emergency Stop Check
    if (mobileGateway.emergencyStopActive) {
      throw new Error(`Platform is currently HALTED by Emergency STOP (${mobileGateway.stopReason})`);
    }

    // 2. Classify Risk & Human Approval Gate
    const riskCheck = humanApprovalGate.evaluateActionPolicy(context.actionType || "INFORMATIONAL_COMMAND", context);
    if (riskCheck.requiresApproval && !context.approved) {
      const approvalReq = mobileGateway.submitCommandForApproval(riskCheck.actionName, {
        prompt,
        context,
      });
      return {
        status: "WAITING_FOR_HUMAN_APPROVAL",
        approvalId: approvalReq.approvalId,
        message: "Command intercepted by Human Approval Gate. Please confirm from Mobile App or Dashboard.",
      };
    }

    // 3. Multi-Agent Fleet Routing & Execution
    const routeResult = await masterRouter.routeAndExecute(prompt, context);

    // 4. Evaluator / Critic Evaluation
    const plan = [prompt];
    const evalResult = selfImprovingLoop.evaluateTaskExecution(prompt, plan, routeResult.result);

    // 5. Record Experience in Self-Learning Memory
    const trace = selfImprovingLoop.recordExperience({
      goal: prompt,
      plan,
      actions: [routeResult.routing.selectedAgentName],
      result: routeResult.result,
      success: evalResult.success,
      score: evalResult.score,
      mistakes: evalResult.deductions,
      lesson: `Handled by ${routeResult.routing.selectedAgentName} with confidence ${routeResult.routing.confidence}`,
    });

    return {
      success: true,
      prompt,
      routing: routeResult.routing,
      execution: routeResult.result,
      evaluation: evalResult,
      experienceId: trace.experienceId,
      platformStatus: "NOMINAL",
    };
  }

  getSystemStatus() {
    return {
      platform: this.name,
      version: this.version,
      bootstrappedAt: this.bootstrappedAt,
      emergencyStopActive: mobileGateway.emergencyStopActive,
      fleet: masterRouter.getFleetStatus(),
      documents: documentProcessor.getStatus(),
      mobile: mobileGateway.getMobileDashboardStatus(),
      scheduler: autonomousScheduler.getSchedulerStatus(),
      selfImprovement: selfImprovingLoop.getStatus(),
      internetEvolution: internetImprovementSentry.getStatus(),
      meshIntegration: universalOrchestrationMesh.getMeshStatus(),
    };
  }
}

export const masterPlatform = new MasterPlatformOrchestrator();
export {
  masterRouter,
  documentProcessor,
  mobileGateway,
  humanApprovalGate,
  autonomousScheduler,
  selfImprovingLoop,
  internetImprovementSentry,
};
