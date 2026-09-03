import test from "node:test";
import assert from "node:assert/strict";
import { getSelfEvolvingStatus, profileHotExecutionPaths, runAutonomousCodeRefactorCycle } from "../src/self-evolving-code-refactor-engine.mjs";

test("getSelfEvolvingStatus reports active code evolver and synergy score", () => {
  const status = getSelfEvolvingStatus();
  assert.equal(status.evolverEngineStatus, "SELF_EVOLVING_CODE_REFACTOR_ENGINE_ONLINE");
  assert.equal(status.protocolVersion, "AUTONOMOUS_AST_REFACTOR_V58");
  assert.ok(status.totalRefactorCyclesCount > 0);
  assert.equal(status.systemSynergyScorePercent, "99.99%");
});

test("profileHotExecutionPaths profiles subsystem hot execution paths", () => {
  const profile = profileHotExecutionPaths({ targetSubsystem: "ALL_SUBSYSTEMS" });
  assert.equal(profile.profilingStatus, "HOT_EXECUTION_PATHS_PROFILED_SUCCESS");
  assert.equal(profile.profiledHotPathsCount, 5);
  assert.ok(profile.profileHash.startsWith("0xPROFILE_"));
});

test("runAutonomousCodeRefactorCycle applies AST patches and updates synergy score", () => {
  const refactor = runAutonomousCodeRefactorCycle({ focusArea: "PERFORMANCE_AND_MEMORY_OPTIMIZATION" });
  assert.equal(refactor.refactorStatus, "AUTONOMOUS_CODE_REFACTOR_CYCLE_COMPLETED");
  assert.equal(refactor.patchesApplied, 3);
  assert.equal(refactor.newSynergyScorePercent, "100.00%");
  assert.ok(refactor.patchTxHash.startsWith("0xPATCH_"));
});
