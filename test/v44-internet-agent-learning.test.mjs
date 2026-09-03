import test from "node:test";
import assert from "node:assert/strict";
import { getConnectedInternetAgents, submitInternetLearningForm, getSubmittedLearningForms, runAgentSwarmInterconnectLoop } from "../src/internet-agent-learning-form-engine.mjs";

test("getConnectedInternetAgents reports active connection to 5 online AI Agent Swarm networks", () => {
  const status = getConnectedInternetAgents();
  assert.equal(status.interconnectStatus, "INTERNET_AI_AGENT_SWARM_CONNECTED");
  assert.equal(status.totalConnectedAgentsCount, 5);
  assert.ok(status.agents.some(a => a.agentId === "AUTOGPT_WEB_WORKER_01"));
});

test("submitInternetLearningForm ingests custom internet learning form submissions", () => {
  const form = submitInternetLearningForm({
    targetUrl: "https://finance.yahoo.com/quote/TSLA",
    learningPrompt: "Extract Robotaxi SEC filings and institutional sentiment",
    symbol: "TSLA",
    executionWeightPercent: 90
  });

  assert.equal(form.submissionStatus, "LEARNING_FORM_SUBMITTED_AND_INGESTED");
  assert.equal(form.formEntry.symbol, "TSLA");
  assert.equal(form.formEntry.executionWeightPercent, 90);
  assert.ok(form.formEntry.scrapedIntel.confidenceScore > 90);

  const history = getSubmittedLearningForms();
  assert.ok(history.totalSubmittedFormsCount >= 2);
});

test("runAgentSwarmInterconnectLoop executes multi-agent consensus loop", () => {
  const res = runAgentSwarmInterconnectLoop({ symbol: "AAPL" });
  assert.equal(res.loopStatus, "AGENT_SWARM_INTERCONNECT_COMPLETED");
  assert.equal(res.participatingAgentsCount, 5);
  assert.equal(res.consensusVerdict, "STRONG_BUY_CONVICTION");
});
