import test from "node:test";
import assert from "node:assert/strict";
import {
  getVercelSkillsCatalog,
  executeVercelSkillPrompt,
  getOpenClawGatewayStatus,
  dispatchOpenClawMessage,
  runOpenClawSupervisorAudit
} from "../src/vercel-skills-openclaw-integration.mjs";
import { getConnectedSourceStatus } from "../src/source-bridges.mjs";

test("getVercelSkillsCatalog returns curated skills and source presence", () => {
  const cat = getVercelSkillsCatalog();
  assert.equal(cat.success, true);
  assert.equal(cat.ecosystem, "VERCEL_LABS_AGENT_SKILLS_V94");
  assert.equal(cat.repoSource, "https://github.com/vercel-labs/skills.git");
  assert.equal(cat.isSourcePresent, true);
  assert.ok(cat.totalCuratedSkillsCount >= 5);
  assert.ok(cat.skills.some(s => s.name === "web-design-guidelines"));
});

test("executeVercelSkillPrompt enriches agent prompt with skill directives", () => {
  const res = executeVercelSkillPrompt({
    skillName: "web-design-guidelines",
    inputPrompt: "Design an institutional trading dashboard ribbon"
  });
  assert.equal(res.success, true);
  assert.equal(res.skillApplied, "web-design-guidelines");
  assert.match(res.enrichedPrompt, /\[VERCEL SKILL: web-design-guidelines\]/);
  assert.match(res.enrichedPrompt, /Design an institutional trading dashboard ribbon/);
});

test("getOpenClawGatewayStatus returns operator status and connected channels", () => {
  const claw = getOpenClawGatewayStatus();
  assert.equal(claw.success, true);
  assert.equal(claw.isSourcePresent, true);
  assert.equal(claw.repoSource, "https://github.com/openclaw/openclaw.git");
  assert.equal(claw.gateway.gatewayStatus, "ONLINE_ACTIVE");
  assert.ok(claw.gateway.connectedChannels.length >= 3);
  assert.ok(claw.gateway.connectedChannels.some(c => c.channel === "TELEGRAM"));
});

test("dispatchOpenClawMessage delivers outbound message via requested channel", () => {
  const res = dispatchOpenClawMessage({
    channel: "TELEGRAM",
    message: "Aifie OpenClaw Gateway Ping Test"
  });
  assert.equal(res.success, true);
  assert.equal(res.channel, "TELEGRAM");
  assert.equal(res.status, "DELIVERED_VIA_OPENCLAW_GATEWAY");
});

test("runOpenClawSupervisorAudit reports healthy supervisor integrity", () => {
  const audit = runOpenClawSupervisorAudit();
  assert.equal(audit.success, true);
  assert.equal(audit.supervisorState, "SUPERVISOR_HEALTHY");
  assert.equal(audit.openClawIntegrityScore, "100.0%");
  assert.ok(audit.activeChannelsCount >= 2);
});

test("getConnectedSourceStatus verifies both openclaw and vercel-skills as present", () => {
  const sources = getConnectedSourceStatus();
  const openclaw = sources.find(s => s.repository === "openclaw");
  const vercelSkills = sources.find(s => s.repository === "vercel-skills");

  assert.ok(openclaw);
  assert.equal(openclaw.present, true);
  assert.equal(openclaw.state, "connected_active_adapter");

  assert.ok(vercelSkills);
  assert.equal(vercelSkills.present, true);
  assert.equal(vercelSkills.state, "connected_active_adapter");
});
