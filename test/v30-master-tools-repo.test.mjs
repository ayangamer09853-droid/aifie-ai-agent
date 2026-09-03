import test from "node:test";
import assert from "node:assert/strict";
import { getConnectedGitHubRepositories, getAiAgentToolingSuite, getToolsAndRepoStatus } from "../src/master-agent-tools-repo-matrix.mjs";

test("getConnectedGitHubRepositories returns 32 top-tier open-source repositories", () => {
  const repos = getConnectedGitHubRepositories();
  assert.ok(repos.length >= 30);
  assert.ok(repos.find(r => r.repoName === "TradingAgents"));
  assert.ok(repos.find(r => r.repoName === "OpenBB"));
  assert.ok(repos.find(r => r.repoName === "ccxt"));
  assert.ok(repos.find(r => r.repoName === "openalgo"));
  assert.ok(repos.find(r => r.repoName === "FinRL"));
  assert.ok(repos.find(r => r.repoName === "Superpowers"));
  assert.ok(repos.find(r => r.repoName === "ECC"));
  assert.ok(repos.find(r => r.repoName === "Codex-mem"));
  assert.ok(repos.find(r => r.repoName === "D4Vinci/Scrapling"));
  assert.ok(repos.find(r => r.repoName === "Conway-Research/automaton"));
});

test("getAiAgentToolingSuite returns 15 integrated AI developer tools", () => {
  const suite = getAiAgentToolingSuite();
  assert.equal(suite.toolingSuiteStatus, "FULL_STACK_AI_TOOLING_SUITE_ACTIVE");
  assert.equal(suite.totalToolsIntegratedCount, 15);
  assert.equal(suite.integratedTools.length, 15);
});

test("getToolsAndRepoStatus aggregates 32 repos and 15 AI tools into optimal matrix", () => {
  const status = getToolsAndRepoStatus();
  assert.equal(status.matrixStatus, "MASTER_AI_TOOLS_AND_GITHUB_REPOS_MATRIX_OPTIMAL");
  assert.ok(status.totalConnectedReposCount >= 30);
  assert.equal(status.totalIntegratedToolsCount, 15);
});
