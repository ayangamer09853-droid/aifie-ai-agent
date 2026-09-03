import test from "node:test";
import assert from "node:assert/strict";
import {
  startContinuous247AgentSwarmDaemon,
  getContinuous247AgentSwarmStatus,
  executeSwarmTickCycle,
  stopContinuous247AgentSwarmDaemon
} from "../src/continuous-247-agent-swarm-daemon.mjs";

test("Continuous 24/7 Agent Swarm Daemon initializes and runs all 10 agents", () => {
  const start = startContinuous247AgentSwarmDaemon({ tickIntervalMs: 1000 });
  assert.ok(start.status === "SWARM_DAEMON_ACTIVATED" || start.status === "ALREADY_ACTIVE");
  assert.equal(start.totalRunningAgents || start.totalAgents, 10);

  const status = getContinuous247AgentSwarmStatus();
  assert.equal(status.swarmDaemonStatus, "CONTINUOUS_24_7_ONLINE");
  assert.equal(status.totalAgentsCount, 10);
  assert.equal(status.runningAgentsCount, 10);
  assert.ok(status.aggregateWorkCyclesCompleted > 0);
});

test("Swarm Tick Cycle increments cycles completed across all 10 agents", () => {
  const initial = getContinuous247AgentSwarmStatus().aggregateWorkCyclesCompleted;
  const cycle = executeSwarmTickCycle();
  assert.equal(cycle.totalActiveAgents, 10);
  assert.equal(cycle.allAgentsOnline, true);

  const after = getContinuous247AgentSwarmStatus().aggregateWorkCyclesCompleted;
  assert.equal(after, initial + 10);

  const stop = stopContinuous247AgentSwarmDaemon();
  assert.equal(stop.status, "SWARM_DAEMON_STOPPED");
});
