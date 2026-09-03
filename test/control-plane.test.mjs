import test from "node:test";
import assert from "node:assert/strict";
import { agentRegistry, delegateTask, requestReplica, runHeartbeat, setKillSwitch } from "../src/alfie-control-plane.mjs";

test("manager delegates a task to one matching specialist lane", () => {
  const task = delegateTask({ lane: "market_data", objective: "Validate AAPL price freshness" });
  assert.equal(task.status, "assigned");
  assert.match(task.assignedAgentId, /^market-data/);
});

test("heartbeat chooses wait when there is no new issue", () => {
  const heartbeat = runHeartbeat();
  assert.equal(heartbeat.actions.at(-1).type, "wait");
});

test("replicas are bounded and receive minimal local permissions", () => {
  const result = requestReplica({ templateId: "strategy-research", reason: "independent paper review" });
  assert.equal(result.replica.health, "validating");
  assert.deepEqual(result.replica.permissions, ["local_read"]);
  assert.ok(agentRegistry().agents.some(agent => agent.id === result.replica.id));
});

test("kill switch pauses replication", () => {
  setKillSwitch({ active: true, reason: "data integrity test" });
  assert.throws(() => requestReplica({ templateId: "signal", reason: "load" }), /paused/);
  setKillSwitch({ active: false });
});
