import test from "node:test";
import assert from "node:assert/strict";
import { getAutopilotStatus, startAutopilotOrchestrator, runAutonomousPerpetualLoop } from "../src/zero-command-autopilot-coordinator.mjs";

test("getAutopilotStatus reports Zero-Command Autopilot status and active 9 subsystems", () => {
  const status = getAutopilotStatus();
  assert.equal(status.isAutopilotRunning, true);
  assert.equal(status.mode, "ZERO_COMMAND_FULL_AUTOPILOT");
  assert.equal(status.activeAutopilotSubsystems.length, 9);
});

test("runAutonomousPerpetualLoop increments autonomous cycle count hands-free", () => {
  const initial = getAutopilotStatus().totalAutonomousCyclesCompleted;
  const loop = runAutonomousPerpetualLoop();
  assert.equal(loop.loopVerdict, "AUTOPILOT_PERPETUAL_CYCLE_EXECUTED");
  assert.equal(loop.totalCyclesCompleted, initial + 1);
});

test("startAutopilotOrchestrator initializes full hands-free self-driving empire", () => {
  const ap = startAutopilotOrchestrator();
  assert.equal(ap.zeroUserCommandGuarantee, "OPERATING_100%_HANDS_FREE_WITHOUT_USER_PROMPT");
});
