import test from "node:test";
import assert from "node:assert/strict";
import { getEmpireStatus, runEmpireEvolutionCycle } from "../src/autonomous-ai-empire-engine.mjs";

test("getEmpireStatus reports active AI empire with 7 parallel swarm agents", () => {
  const emp = getEmpireStatus();
  assert.equal(emp.empireStatus, "AUTONOMOUS_AI_EMPIRE_OPTIMAL");
  assert.equal(emp.activeSwarmAgentsCount, 7);
  assert.equal(emp.swarmAgents.length, 7);
  assert.equal(emp.selfHealingRelay.activeBridgesConnected, 22);
});

test("runEmpireEvolutionCycle completes genetic strategy evolution cycle", () => {
  const evo = runEmpireEvolutionCycle();
  assert.equal(evo.cycleStatus, "EMPIRE_EVOLUTION_CYCLE_COMPLETED");
  assert.equal(evo.newGeneration, "GENERATION_85_NEURAL");
  assert.ok(evo.optimizedSharpeRatio > 3.8);
});
