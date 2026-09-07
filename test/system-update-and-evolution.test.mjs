import test from 'node:test';
import assert from 'node:assert/strict';
import { systemUpdateEngine } from '../src/platform/system-update-and-evolution-engine.mjs';
import { documentProcessor } from '../src/platform/document-processor.mjs';
import { selfImprovingLoop } from '../src/platform/self-improving-feedback-loop.mjs';
import { internetImprovementSentry } from '../src/platform/internet-self-improvement-sentry.mjs';
import { createQuantResearchMcpServer } from '../src/mcp/servers/quant-research-mcp.mjs';

test('System Update & Evolution Engine: Full End-to-End Update Cycle', async (t) => {
  const updateSummary = await systemUpdateEngine.runFullSystemUpdate({
    source: 'TEST_AUTOMATION'
  });

  assert.ok(updateSummary.updateId.startsWith('sys_upd_'), 'Should have valid updateId');
  assert.ok(updateSummary.durationMs >= 0, 'Duration should be non-negative');
  assert.equal(updateSummary.diagnostics.healthySubsystems, 15, 'All 15 subsystems must be healthy');
  assert.equal(updateSummary.diagnostics.allHealthy, true, 'All healthy flag must be true');
  assert.ok(updateSummary.knowledgeBase.documentsIndexed >= 3, 'Should have indexed core documents');
  assert.ok(updateSummary.knowledgeBase.totalVectorChunks >= 3, 'Should have created vector chunks');
  assert.ok(updateSummary.experienceMining.axiomsExtracted >= 4, 'Should extract operational axioms');
  assert.ok(updateSummary.benchmark.newScore > 0, 'Benchmark should have positive score');
  assert.ok(updateSummary.updateLog.length >= 6, 'Should log all 6 execution steps');
});

test('System Update & Evolution Engine: Subsystem Health Diagnostics', (t) => {
  const diagnostics = systemUpdateEngine.runDiagnostics();
  const keys = Object.keys(diagnostics);
  assert.equal(keys.length, 15, 'Should cover 15 core subsystems');
  for (const [subsystem, info] of Object.entries(diagnostics)) {
    assert.equal(info.healthy, true, `${subsystem} should be healthy`);
    assert.equal(info.status, 'ONLINE_ACTIVE', `${subsystem} status should be ONLINE_ACTIVE`);
    assert.ok(info.latencyMs >= 0, `${subsystem} latency should be positive`);
  }
});

test('System Update & Evolution Engine: Knowledge Base Vector Re-Indexing & Cosine Search', (t) => {
  const indexed = systemUpdateEngine.reindexCoreKnowledge();
  assert.ok(indexed.length >= 3, 'Should index at least 3 core knowledge files');

  const searchResults = documentProcessor.searchSemantic('autonomous agent platform', 3);
  assert.ok(searchResults.length > 0, 'Should find relevant vector matches for query');
  assert.ok(searchResults[0].score > 0, 'Similarity score should be positive');
  assert.ok(searchResults[0].text.length > 0, 'Chunk text should not be empty');
});

test('System Update & Evolution Engine: Experience Mining & Failure Pattern Clustering', (t) => {
  const lessons = systemUpdateEngine.mineExperienceAndFormulateAxioms();
  assert.ok(lessons.length >= 4, 'Should formulate operational axioms');
  assert.ok(lessons.some(l => l.includes('Axiom 1')), 'Should include Axiom 1');
  assert.ok(lessons.some(l => l.includes('Axiom 3')), 'Should include Axiom 3');
});

test('System Update & Evolution Engine: Telemetry Status Snapshot', (t) => {
  const status = systemUpdateEngine.getStatus();
  assert.ok(status.version.length > 0, 'Version string should not be empty');
  assert.ok(status.lastUpdateTimestamp > 0, 'Last update timestamp should be valid');
  assert.ok(status.totalUpdatesPerformed >= 1, 'Total updates performed should be >= 1');
  assert.ok(status.currentChampionScore > 0, 'Champion score should be positive');
  assert.equal(Object.keys(status.diagnostics).length, 15, 'Should have 15 subsystem diagnostics');
});

test('MCP Hub: Tool 76 (run_full_system_update_and_evolution) Registration & Execution', async (t) => {
  const mcpServer = createQuantResearchMcpServer();
  assert.ok(mcpServer.tools.has('run_full_system_update_and_evolution'), 'Tool 76 run_full_system_update_and_evolution should be registered in MCP server');

  const executionResult = await mcpServer.callTool('run_full_system_update_and_evolution', {
    focusAreas: ['test-mcp-update']
  });

  assert.ok(executionResult.updateId, 'MCP execution should return updateId');
  assert.equal(executionResult.diagnostics.healthySubsystems, 15, 'All 15 subsystems healthy via MCP');
});
