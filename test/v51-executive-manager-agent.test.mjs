import test from "node:test";
import assert from "node:assert/strict";
import { getExecutiveManagerStatus, delegateManagerTask, run247ManagementAuditCycle } from "../src/executive-manager-agent-engine.mjs";

test("getExecutiveManagerStatus reports active 24/7 manager AI agent and 50 supervised subsystems", () => {
  const status = getExecutiveManagerStatus();
  assert.equal(status.managerAgentStatus, "EXECUTIVE_MANAGER_AI_AGENT_ONLINE_247");
  assert.equal(status.managementRole, "MASTER_CHIEF_OPERATING_OFFICER_AI");
  assert.equal(status.totalSupervisedSubsystemsCount, 50);
  assert.ok(status.activeTasksCount >= 5);
});

test("delegateManagerTask assigns new operational tasks to specific sub-agents", () => {
  const res = delegateManagerTask({
    targetSubsystem: "QUANT_HFT_ENGINE",
    taskDescription: "Optimize sub-millisecond liquidity routing",
    priorityLevel: "HIGH"
  });

  assert.equal(res.delegationStatus, "TASK_DELEGATED_TO_SUB_AGENT_SUCCESS");
  assert.equal(res.targetSubsystem, "QUANT_HFT_ENGINE");
  assert.equal(res.priorityLevel, "HIGH");
  assert.ok(res.taskId.startsWith("TASK_MGR_"));
  assert.ok(res.delegationTxHash.startsWith("0xDELEGATE_"));
});

test("run247ManagementAuditCycle verifies 100% synergy across all 50 engine subsystems", () => {
  const res = run247ManagementAuditCycle();

  assert.equal(res.auditStatus, "247_MANAGEMENT_AUDIT_CYCLE_COMPLETED");
  assert.equal(res.auditedSubsystemsCount, 50);
  assert.equal(res.systemSynergyScore, "100.0%");
  assert.equal(res.constitutionalRiskVerdict, "PASSED_ZERO_BREACH");
  assert.ok(res.auditReportHash.startsWith("0xAUDIT_MGR_"));
});
