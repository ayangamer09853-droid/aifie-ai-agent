import test from "node:test";
import assert from "node:assert/strict";

import {
  masterPlatform,
  masterRouter,
  documentProcessor,
  mobileGateway,
  humanApprovalGate,
  autonomousScheduler,
  selfImprovingLoop,
  internetImprovementSentry,
} from "../src/platform/master-platform-orchestrator.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

test("Platform Layer 1 & 4: Multi-Agent Router classifies intent and executes across 10 Specialists", async () => {
  const fleet = masterRouter.getFleetStatus();
  assert.equal(fleet.length, 10, "Fleet must contain exactly 10 specialized agent lanes");

  // Test Coding Agent routing
  const codeRoute = await masterRouter.routeAndExecute("Write a python script for Black-Scholes Greeks calculation");
  assert.equal(codeRoute.routing.selectedAgentId, "agent-coding");
  assert.equal(codeRoute.result.success, true);

  // Test Research Agent routing
  const researchRoute = await masterRouter.routeAndExecute("Research latest academic papers on LLM reasoning");
  assert.equal(researchRoute.routing.selectedAgentId, "agent-research");
  assert.equal(researchRoute.result.success, true);

  // Test Finance Agent routing
  const financeRoute = await masterRouter.routeAndExecute("Check stock price and calculate VaR for AAPL", { symbol: "AAPL" });
  assert.equal(financeRoute.routing.selectedAgentId, "agent-finance");
  assert.equal(financeRoute.result.success, true);
});

test("Platform Layer 6 & 7: Document Processing, TF-IDF Vector Embeddings and Semantic Search", async () => {
  const docContent = "Risk Management Policy: The maximum allowable single order notional is $50,000 USD. Daily loss circuit breaker stops execution at 3.0% drawdown.";
  const indexRes = documentProcessor.indexDocument("doc-risk-policy-1", "risk_policy.txt", docContent, { category: "RISK" });
  
  assert.equal(indexRes.success, true);
  assert.ok(indexRes.totalChunksIndexed >= 1);

  // Semantic Vector Search
  const searchResults = documentProcessor.searchSemantic("single order notional limit drawdown", 3);
  assert.ok(searchResults.length > 0, "Should return matching vector chunks");
  assert.equal(searchResults[0].docId, "doc-risk-policy-1");
  assert.ok(searchResults[0].score > 0.1);

  // Summarization
  const longDoc = "The multi-agent system orchestrates 10 specialized agents. Each agent handles distinct domains like coding, research, documents, and finance. The critic continuously evaluates output quality. The experience store retains lessons for future cycles.";
  const summary = documentProcessor.summarize(longDoc, 2);
  assert.ok(summary.length > 0);
});

test("Platform Layer 2: Mobile Gateway Authentication, Command Approvals & Emergency STOP", async () => {
  const auth = mobileGateway.authenticateMobileUser("trader_bob", "device-phone-99", "1234");
  assert.equal(auth.authenticated, true);
  assert.ok(auth.token);

  const sessionCheck = mobileGateway.validateMobileSession(auth.token);
  assert.equal(sessionCheck.valid, true);

  // Command Approval Workflow
  const approvalReq = mobileGateway.submitCommandForApproval("DEPLOY_CODE_CHANGE", { version: "v1.2.0" }, 30000);
  assert.equal(approvalReq.status, "PENDING");

  const pending = mobileGateway.getPendingApprovals();
  assert.ok(pending.some((p) => p.approvalId === approvalReq.approvalId));

  // Operator approves
  const approvalRes = mobileGateway.respondToApproval(approvalReq.approvalId, true, "trader_bob");
  assert.equal(approvalRes.success, true);
  assert.equal(approvalRes.approval.status, "APPROVED");

  // Emergency STOP
  const stopRes = mobileGateway.triggerEmergencyStop("trader_bob", "Unit test freeze");
  assert.equal(stopRes.emergencyStopActive, true);
  assert.equal(mobileGateway.emergencyStopActive, true);

  // Clear Emergency STOP
  const resumeRes = mobileGateway.resumeFromEmergencyStop("trader_bob");
  assert.equal(resumeRes.emergencyStopActive, false);
  assert.equal(mobileGateway.emergencyStopActive, false);
});

test("Platform Layer 9: Human Approval Gate evaluates Risk Tiers and enforces 2FA", async () => {
  // Tier 1: Auto allowed
  const readEmail = humanApprovalGate.evaluateActionPolicy("READ_EMAIL");
  assert.equal(readEmail.tier, "AUTO");
  assert.equal(readEmail.requiresApproval, false);

  // Tier 2: Approval required
  const sendEmail = humanApprovalGate.evaluateActionPolicy("SEND_EMAIL");
  assert.equal(sendEmail.tier, "APPROVAL_REQUIRED");
  assert.equal(sendEmail.requiresApproval, true);

  // Tier 3: Mandatory 2FA
  const trade = humanApprovalGate.evaluateActionPolicy("FINANCIAL_TRANSACTION");
  assert.equal(trade.tier, "MANDATORY_2FA");
  assert.equal(trade.requires2FA, true);

  // Create HMAC-signed approval request
  const req = humanApprovalGate.createApprovalRequest("FINANCIAL_TRANSACTION", { notionalUsd: 25000 });
  assert.ok(req.signature);
  assert.equal(req.status, "PENDING_APPROVAL");

  // Authorize with valid 2FA code
  const authRes = humanApprovalGate.authorizeRequest(req.requestId, "risk_officer", "849201");
  assert.equal(authRes.status, "APPROVED");

  // Audit log contains entry
  const audit = humanApprovalGate.getAuditLog(5);
  assert.ok(audit.length > 0);
});

test("Platform Layer 8: Autonomous Scheduler and Website Content Change Sentry", async () => {
  const job = autonomousScheduler.scheduleJob("hourly-portfolio-health", "INTERVAL", { intervalMs: 3600000 }, async () => {
    return { status: "OK", timestamp: Date.now() };
  });
  assert.equal(job.status, "ACTIVE");

  const runRes = await autonomousScheduler.runJob(job.jobId);
  assert.equal(runRes.status, "SUCCESS");

  // Website Sentry
  const sentry = autonomousScheduler.registerWebsiteSentry("https://sec.gov/edgar/filings", 60000);
  const snap1 = autonomousScheduler.evaluateWebsiteSnapshot(sentry.sentryId, "<html><body>Initial State</body></html>");
  assert.equal(snap1.hasChanged, false);

  const snap2 = autonomousScheduler.evaluateWebsiteSnapshot(sentry.sentryId, "<html><body>New 13F Filing Added!</body></html>");
  assert.equal(snap2.hasChanged, true);
});

test("Platform Layer 10 (Part 1): 7-System Controlled Self-Improvement Feedback Loop", async () => {
  // Record experience
  const trace = selfImprovingLoop.recordExperience({
    goal: "Execute VWAP trade for TSLA",
    plan: ["Route to SOR", "Slice 5 tranches"],
    result: { filled: 50, avgPrice: 210.4 },
    success: true,
    score: 0.94,
    mistakes: [],
    lesson: "VWAP slice minimized impact",
  });
  assert.ok(trace.experienceId);
  assert.equal(trace.score, 0.94);

  // Evaluator / Critic
  const crit = selfImprovingLoop.evaluateTaskExecution("Test task", ["step1"], { output: "OK" });
  assert.ok(crit.score >= 0.7);
  assert.equal(crit.success, true);

  // Candidate Benchmark Tournament
  const candidate = selfImprovingLoop.proposeCandidateVersion("Enhanced routing heuristics");
  const tournament = selfImprovingLoop.runBenchmarkTournament(candidate);
  assert.ok(tournament.candidateScore > 0);
  assert.ok(["DEPLOY_CANDIDATE", "ROLLBACK_DISCARD"].includes(tournament.decision));
});

test("Platform Layer 10 (Part 2): 4-Loop Internet Continuous Evolution Sentry", async () => {
  // Loop 1: Internet Research
  const research = await internetImprovementSentry.performInternetResearch("Fast zero-shot vector retrieval");
  assert.ok(research.researchId);
  assert.ok(research.sourcesScanned.length > 0);

  // Full 4-Loop Evolution Cycle
  const cycle = await internetImprovementSentry.runFullSelfImprovementCycle();
  assert.ok(cycle.cycleIndex >= 1);
  assert.ok(cycle.candidateVersion);
  assert.ok(cycle.benchmarkScore > 0);
});

test("Master Platform Orchestrator: End-to-End Command Processing", async () => {
  const cmd = await masterPlatform.processUserCommand("Summarize document requirements and check risk limits");
  assert.equal(cmd.success, true);
  assert.ok(cmd.routing.selectedAgentName);
  assert.ok(cmd.evaluation.score > 0);
  assert.ok(cmd.experienceId);

  const status = masterPlatform.getSystemStatus();
  assert.equal(status.platform, "Aifie Universal Autonomous AI Agent Platform");
  assert.equal(status.fleet.length, 10);
});

test("MCP Hub: MCP Server registers and executes Tools 66 through 75", async () => {
  const mcpServer = createQuantResearchMcpServer();
  assert.ok(mcpServer.tools.has("route_multi_agent_command"), "Tool 66 must be registered");
  assert.ok(mcpServer.tools.has("process_document_knowledge"), "Tool 67 must be registered");
  assert.ok(mcpServer.tools.has("manage_mobile_command_approval"), "Tool 68 must be registered");
  assert.ok(mcpServer.tools.has("record_task_experience_learning"), "Tool 69 must be registered");
  assert.ok(mcpServer.tools.has("run_self_improvement_benchmark"), "Tool 70 must be registered");
  assert.ok(mcpServer.tools.has("trigger_internet_improvement_research"), "Tool 71 must be registered");
  assert.ok(mcpServer.tools.has("request_human_action_approval"), "Tool 72 must be registered");
  assert.ok(mcpServer.tools.has("schedule_automation_workflow"), "Tool 73 must be registered");
  assert.ok(mcpServer.tools.has("query_semantic_vector_store"), "Tool 74 must be registered");
  assert.ok(mcpServer.tools.has("get_autonomous_platform_status"), "Tool 75 must be registered");

  // Call Tool 66 (route_multi_agent_command)
  const routeToolRes = await mcpServer.callTool("route_multi_agent_command", { prompt: "Analyze options chain for AAPL" });
  assert.equal(routeToolRes.result.success, true);

  // Call Tool 75 (get_autonomous_platform_status)
  const statusToolRes = await mcpServer.callTool("get_autonomous_platform_status", {});
  assert.equal(statusToolRes.platform, "Aifie Universal Autonomous AI Agent Platform");
});
