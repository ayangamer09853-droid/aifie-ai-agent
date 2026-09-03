import test from "node:test";
import assert from "node:assert/strict";
import {
  generate100AgentFleet,
  executeFleetWorkCycle,
  getFleetDivisionsSummary,
  queryFleetAgents
} from "../src/autonomous-100-agent-fleet.mjs";

test("Fleet generates exactly 100 specialized autonomous AI agents across 10 divisions", () => {
  const fleet = generate100AgentFleet();
  assert.equal(fleet.length, 100);

  const first = fleet[0];
  assert.equal(first.id, "AGENT_001");
  assert.equal(first.divisionId, "DIV_01");
  assert.equal(first.status, "ONLINE");

  const last = fleet[99];
  assert.equal(last.id, "AGENT_100");
  assert.equal(last.divisionId, "DIV_10");

  const divisions = getFleetDivisionsSummary();
  assert.equal(divisions.length, 10);
  assert.ok(divisions.every(d => d.agentsCount === 10 && d.allOnline));
});

test("Fleet work cycle increments cycles completed and query filters work cleanly", () => {
  const before = generate100AgentFleet()[0].cyclesCompleted;
  const cycle = executeFleetWorkCycle();
  assert.equal(cycle.totalAgentsExecuted, 100);

  const after = generate100AgentFleet()[0].cyclesCompleted;
  assert.equal(after, before + 1);

  const queryDiv = queryFleetAgents({ division: "DIV_02" });
  assert.equal(queryDiv.matchedCount, 10);

  const searchRes = queryFleetAgents({ query: "SHAP" });
  assert.ok(searchRes.matchedCount >= 1);
  assert.equal(searchRes.agents[0].role, "Real-Time SHAP Explainer");
});
