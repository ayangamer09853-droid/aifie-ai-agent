import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../server.mjs";

import {
  CommercialCriticAgent,
  FALSIFICATION_VERDICT
} from "../src/revenue/commercial-critic.mjs";

import { DynamicDagCompiler } from "../src/revenue/dynamic-dag-compiler.mjs";
import { MeteredApiGateway } from "../src/revenue/metered-api-gateway.mjs";
import { GeneticPromptEvolver } from "../src/revenue/genetic-prompt-evolver.mjs";
import { ExecutiveWarRoom } from "../src/revenue/executive-war-room.mjs";
import {
  AifieBusinessEmpire,
  ChiefFinanceAgent,
  AutonomousImmuneMesh,
  CIRCUIT_STATE,
  IMMUNE_HEALTH,
  SovereignNodeMesh,
  NODE_ROLES,
  NODE_STATUS
} from "../src/revenue/business-empire.mjs";

test("AIFIE Breakthrough Innovations - End-to-End Autonomous Enterprise Test Suite", async (t) => {

  await t.test("1. Commercial Adversarial Critic: Rigorous 4-Vector Stress-Testing & Falsification", () => {
    const critic = new CommercialCriticAgent();

    // A. Robust Proposal: High-margin, hyper-vertical, fast delivery -> PASS_ROBUST
    const robustProposal = {
      title: "AgriTech Cold-Storage IoT Dashboard",
      niche: "Precision Agriculture",
      expectedRevenueInr: 35000,
      costInr: 2000,
      turnaroundDays: 2,
      isDigitalAsset: true,
      isRecurring: true
    };

    const auditRobust = critic.falsifyProposal(robustProposal);
    assert.strictEqual(auditRobust.verdict, FALSIFICATION_VERDICT.PASS_ROBUST);
    assert.ok(auditRobust.robustnessScore >= 75);
    assert.strictEqual(auditRobust.vulnerabilities.length, 0);

    // B. Fragile Proposal: Overcrowded niche, low margin (<75%), slow delivery (>7 days), spammy cold blast -> REJECT_FRAGILE
    const fragileProposal = {
      title: "Guaranteed Instant Rich Cold Blast",
      niche: "generic crypto hype",
      expectedRevenueInr: 10000,
      costInr: 6000, // 40% margin
      turnaroundDays: 14,
      isDigitalAsset: false,
      isRecurring: false
    };

    const auditFragile = critic.falsifyProposal(fragileProposal);
    assert.strictEqual(auditFragile.verdict, FALSIFICATION_VERDICT.REJECT_FRAGILE);
    assert.ok(auditFragile.robustnessScore < 50);
    assert.ok(auditFragile.vulnerabilities.length >= 3);
    assert.ok(auditFragile.mitigations.length >= 3);

    // Verify Audit Summary tracking
    const summary = critic.getAuditSummary();
    assert.strictEqual(summary.totalAudits, 2);
    assert.strictEqual(summary.passedRobust, 1);
    assert.strictEqual(summary.rejectedFragile, 1);
  });

  await t.test("2. Dynamic Meta-DAG Pipeline Compiler: Multi-Stage Parallel Execution & Latency Compression", async () => {
    const empire = new AifieBusinessEmpire();
    const dagCompiler = new DynamicDagCompiler(empire);

    const projectParams = {
      title: "Integrated Farm-to-Fork Supply Chain Automation",
      niche: "AgriTech Co-op",
      revenueInr: 45000
    };

    // A. Compilation Verification
    const compiled = dagCompiler.compileDag(projectParams);
    assert.ok(compiled.dagId.startsWith("DAG-"));
    assert.strictEqual(compiled.totalStages, 4);
    assert.strictEqual(compiled.totalNodes, 11);
    assert.strictEqual(compiled.stages[0].parallel, true);
    assert.strictEqual(compiled.stages[1].parallel, true);
    assert.strictEqual(compiled.stages[2].parallel, true);
    assert.strictEqual(compiled.stages[3].parallel, false);

    // B. Concurrent DAG Execution Verification
    const execution = await dagCompiler.executeDag(projectParams);
    assert.strictEqual(execution.status, "COMPLETED");
    assert.strictEqual(execution.totalNodes, 11);
    assert.ok(execution.totalDurationMs >= 0);
    assert.ok(execution.nodeResults["node_research"]);
    assert.ok(execution.nodeResults["node_critic"]);
    assert.ok(execution.nodeResults["node_website"]);
    assert.ok(execution.nodeResults["node_governor"]);
    assert.ok(execution.nodeResults["node_settlement"]);
    assert.ok(execution.efficiencySpeedupFactor.includes("Parallel"));

    // Verify execution history recorded
    assert.strictEqual(dagCompiler.executionHistory.length, 1);
  });

  await t.test("3. Multi-Vector Metered Public API Hub: Key Provisioning, Credit Metering & 40/25/20/10/5 Treasury Sync", () => {
    const cfo = new ChiefFinanceAgent();
    const gateway = new MeteredApiGateway(cfo);

    // A. Provision new API key
    const clientKeyRecord = gateway.generateApiKey("AgriVenture Labs", 500);
    assert.ok(clientKeyRecord.apiKey.startsWith("aifie_live_"));
    assert.strictEqual(clientKeyRecord.creditBalanceInr, 500);
    assert.strictEqual(clientKeyRecord.status, "ACTIVE");

    // B. Rejection on missing or invalid key
    assert.throws(() => gateway.authenticateAndDeduct(null, 15), /MISSING_API_KEY/);
    assert.throws(() => gateway.authenticateAndDeduct("aifie_live_fake_key_xyz", 15), /INVALID_API_KEY/);

    // C. Micro-Service 1: AgriTech Advisory (₹15)
    const agriResult = gateway.callAgriTechAdvisory({
      cropType: "Wheat & Mustard",
      acreage: 50,
      region: "North Punjab"
    }, clientKeyRecord.apiKey);
    assert.strictEqual(agriResult.service, "Aifie Precision AgriTech Advisory API");
    assert.strictEqual(agriResult.costInr, 15);
    assert.strictEqual(agriResult.remainingCreditsInr, 485);
    assert.ok(agriResult.advisoryReport.irrigationOptimization);

    // D. Micro-Service 2: Instant SEO Audit (₹20)
    const seoResult = gateway.callInstantSeoAudit({
      targetUrl: "https://greenfarms-punjab.in",
      primaryKeyword: "organic wheat procurement"
    }, clientKeyRecord.apiKey);
    assert.strictEqual(seoResult.service, "Aifie Instant SEO Audit Engine API");
    assert.strictEqual(seoResult.costInr, 20);
    assert.strictEqual(seoResult.remainingCreditsInr, 465);
    assert.ok(seoResult.auditReport.auditScore >= 80);

    // E. Micro-Service 3: Commercial Copy Generation (₹10)
    const copyResult = gateway.callCommercialCopy({
      industry: "AgriTech",
      objective: "B2B Retainer Acquisition"
    }, clientKeyRecord.apiKey);
    assert.strictEqual(copyResult.service, "Aifie High-Converting Commercial Copy Engine API");
    assert.strictEqual(copyResult.costInr, 10);
    assert.strictEqual(copyResult.remainingCreditsInr, 455);
    assert.ok(copyResult.copyPackage.primaryHeadline);

    // F. Verify Treasury Balance Allocation (40/25/20/10/5)
    const status = gateway.getStatus();
    assert.strictEqual(status.cumulativeApiRevenueInr, 45); // 15 + 20 + 10
    const vault = cfo.getReserveVaultStatus();
    assert.ok(vault.growthCapitalInr >= 0);
    assert.ok(vault.reserveVaultInr >= 0);

    // G. Rejection on Insufficient Credits
    const depletedKey = gateway.generateApiKey("Broke Dev", 5);
    assert.throws(() => gateway.authenticateAndDeduct(depletedKey.apiKey, 20), /INSUFFICIENT_CREDITS/);
  });

  await t.test("4. Neuro-Evolutionary Genetic Strategy & Prompt Mega-Factory: Selection, Crossover & Mutation", () => {
    const evolver = new GeneticPromptEvolver();

    assert.strictEqual(evolver.generation, 1);
    assert.strictEqual(evolver.population.length, 6);

    const initialChampion = evolver.getChampionPrompt();
    assert.ok(initialChampion.variantId);
    assert.ok(initialChampion.hook);
    assert.ok(initialChampion.value);
    assert.ok(initialChampion.cta);

    // Run empirical evolution cycle with high conversion telemetry
    const evolutionCycle1 = evolver.runEvolutionCycle({
      openRatePercent: 32.5,
      csatScore: 4.95
    });

    assert.strictEqual(evolutionCycle1.generation, 2);
    assert.strictEqual(evolutionCycle1.populationSize, 6);
    assert.ok(evolutionCycle1.championVariant.fitnessScore >= 60);
    assert.strictEqual(evolver.evolutionHistory.length, 1);

    // Run another generation
    const evolutionCycle2 = evolver.runEvolutionCycle({
      openRatePercent: 38.0,
      csatScore: 5.0
    });
    assert.strictEqual(evolutionCycle2.generation, 3);
    assert.strictEqual(evolver.evolutionHistory.length, 2);
  });

  await t.test("5. Conversational Executive War Room: Intent Parsing & Coordinated Swarm Dispatch", async () => {
    const empire = new AifieBusinessEmpire();
    const warRoom = new ExecutiveWarRoom(empire);

    // A. Stress-Test Intent
    const criticCmd = await warRoom.processCommand("Critic, stress-test this proposal for AgriTech AI supply chain");
    assert.strictEqual(criticCmd.actionType, "CRITIC_STRESS_TEST");
    assert.ok(criticCmd.executiveNarrative.includes("Commercial Critic concluded audit"));
    assert.ok(criticCmd.executionResult.verdict);

    // B. Dynamic DAG Intent
    const dagCmd = await warRoom.processCommand("Compile and execute dynamic parallel DAG pipeline for Smart Dairy");
    assert.strictEqual(dagCmd.actionType, "DAG_PIPELINE_EXECUTION");
    assert.ok(dagCmd.executiveNarrative.includes("Dynamic DAG compiled and executed"));
    assert.strictEqual(dagCmd.executionResult.status, "COMPLETED");

    // C. Genetic Evolution Intent
    const evoCmd = await warRoom.processCommand("Evolve outreach prompts and mutate genetic gene pool");
    assert.strictEqual(evoCmd.actionType, "GENETIC_EVOLUTION");
    assert.ok(evoCmd.executiveNarrative.includes("Genetic Prompt Mega-Factory advanced"));

    // D. Metered API Intent
    const apiCmd = await warRoom.processCommand("Check metered API gateway status and developer keys");
    assert.strictEqual(apiCmd.actionType, "METERED_API_ACTION");
    assert.ok(apiCmd.executiveNarrative.includes("Metered Public API Gateway online"));

    // E. General Autonomous Business Loop Intent
    const loopCmd = await warRoom.processCommand("Acquire client for SunFresh Organics and deliver full digital service");
    assert.strictEqual(loopCmd.actionType, "AUTONOMOUS_LOOP");
    assert.ok(loopCmd.executiveNarrative.includes("Executed 10-Step Autonomous Loop for SunFresh Organics"));
    assert.ok(loopCmd.executionResult.executionResult.qaScore >= 90);

    // Verify War Room audit history
    const history = warRoom.getCommandHistory();
    assert.strictEqual(history.length, 5);

    // Test new War Room intents: IMMUNE_SELF_HEAL and SOVEREIGN_MESH_DISPATCH
    const healCmd = await warRoom.processCommand("Heal immune mesh and reset tripped circuit breakers");
    assert.strictEqual(healCmd.actionType, "IMMUNE_SELF_HEAL");
    assert.ok(healCmd.executiveNarrative.includes("Autonomous Immune Mesh executed self-healing"));

    const meshCmd = await warRoom.processCommand("Dispatch sovereign node mesh workload for SEO scraping");
    assert.strictEqual(meshCmd.actionType, "SOVEREIGN_MESH_DISPATCH");
    assert.ok(meshCmd.executiveNarrative.includes("Sovereign Node Mesh offloaded task"));
  });

  await t.test("6. Autonomous Immune Mesh: Multi-State Circuit Breakers, State Reconciliation & Sub-50ms Fault Isolation", () => {
    const immune = new AutonomousImmuneMesh();

    // A. Initial Status & Breaker Health
    const initialStatus = immune.getStatus();
    assert.strictEqual(initialStatus.overallHealthStatus, IMMUNE_HEALTH.OPTIMAL);
    assert.strictEqual(initialStatus.healthScore, 100);
    assert.strictEqual(initialStatus.openBreakersCount, 0);

    // B. Circuit Breaker Trips on Threshold
    assert.strictEqual(immune.isExecutionAllowed("EVENT_BUS"), true);
    immune.recordFailure("EVENT_BUS", "Simulated event queue overflow");
    immune.recordFailure("EVENT_BUS", "Simulated dropped subscriber");
    assert.strictEqual(immune.isExecutionAllowed("EVENT_BUS"), true);
    immune.recordFailure("EVENT_BUS", "Critical connection timeout");
    assert.strictEqual(immune.isExecutionAllowed("EVENT_BUS"), false);

    const postTripStatus = immune.getStatus();
    assert.strictEqual(postTripStatus.circuitBreakers.EVENT_BUS.state, CIRCUIT_STATE.OPEN);
    assert.ok(postTripStatus.healthScore < 100);

    // C. Sub-50ms Fault Isolation & Worker Thread Replacement
    const isolationResult = immune.isolateAndReplaceWorker("worker-alpha-99", "Fatal heap memory breach");
    assert.strictEqual(isolationResult.success, true);
    assert.strictEqual(isolationResult.sub50msTargetAchieved, true);
    assert.ok(isolationResult.isolationLatencyMs < 50);
    assert.strictEqual(isolationResult.quarantinedWorker.workerId, "worker-alpha-99");
    assert.ok(isolationResult.newWorker.workerId.startsWith("worker-surrogate-"));

    // D. Self-Healing State Reconciler
    const reconcileResult = immune.reconcileStateFile("revenue-crm.json");
    assert.ok(["VERIFIED_INTACT", "RECONCILED_AND_HEALED"].includes(reconcileResult.status));

    // E. Heal All Subsystems
    const healReport = immune.healAllSubsystems();
    assert.strictEqual(healReport.success, true);
    assert.strictEqual(immune.isExecutionAllowed("EVENT_BUS"), true);
    assert.strictEqual(immune.getStatus().overallHealthStatus, IMMUNE_HEALTH.OPTIMAL);
  });

  await t.test("7. Distributed P2P Sovereign Edge Node Mesh: Workload Offloading, CRDT Replication & 3-of-5 BFT Quorum", () => {
    const mesh = new SovereignNodeMesh();

    // A. Initial Topology
    const status = mesh.getMeshStatus();
    assert.strictEqual(status.status, "SOVEREIGN_NODE_MESH_ONLINE");
    assert.strictEqual(status.totalNodesRegistered, 5);
    assert.strictEqual(status.onlineNodesCount, 5);
    assert.strictEqual(status.quorumSatisfied, true);
    assert.ok(status.aggregateComputeCapacityUnits >= 300);

    // B. Node Heartbeat & Latency Update
    const hb = mesh.recordHeartbeat("node-render-singapore-02", { latencyMs: 32, status: NODE_STATUS.ONLINE });
    assert.strictEqual(hb.success, true);
    assert.strictEqual(hb.latencyMs, 32);

    // C. Workload Offloading Dispatcher
    const offloadedTask = mesh.dispatchWorkload("BATCH_SEO_AUDIT", { urls: ["https://example1.com", "https://example2.com"] });
    assert.strictEqual(offloadedTask.status, "EXECUTED_SUCCESSFULLY");
    assert.ok(offloadedTask.taskId.startsWith("TASK-"));
    assert.ok(offloadedTask.dispatchedToNode.id);
    assert.ok(offloadedTask.executionMetrics.offloadSpeedupFactor.includes("Parallelized"));

    // D. Conflict-Free Replicated State (CRDT) Sync
    const peerCrdtSync = mesh.syncStateWithPeer("node-render-singapore-02", {
      treasuryAllocation: {
        timestamp: Date.now() + 5000,
        growthCapitalInr: 20000,
        reserveVaultInr: 12500
      },
      crmRecords: [
        { id: "lead-peer-01", name: "Punjab Dairy Coop", updatedAt: Date.now() + 1000 }
      ]
    });
    assert.strictEqual(peerCrdtSync.success, true);
    assert.ok(peerCrdtSync.recordsUpdated >= 1);

    // E. 3-of-5 Byzantine Fault Tolerant (BFT) Consensus Voting
    const approvedVote = mesh.evaluateBftConsensus("prop-upgrade-01", "Promote Model v2.4", [true, true, true, false, true]);
    assert.strictEqual(approvedVote.isApproved, true);
    assert.strictEqual(approvedVote.verdict, "BYZANTINE_CONSENSUS_REACHED_APPROVED");

    const rejectedVote = mesh.evaluateBftConsensus("prop-upgrade-02", "Hostile Takeover", [false, true, false, false, true]);
    assert.strictEqual(rejectedVote.isApproved, false);
    assert.strictEqual(rejectedVote.verdict, "BYZANTINE_CONSENSUS_FAILED_REJECTED");
  });

  await t.test("8. Empire Master Integration & REST Endpoints: Full HTTP Cycle Verification across All 7 Innovations", async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const makeRequest = async (path, method = "GET", body = null, headers = {}) => {
      return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const reqHeaders = { "Content-Type": "application/json", ...headers };
        const req = http.request(url, { method, headers: reqHeaders }, (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    };

    try {
      // 1. POST /api/empire/critic/audit
      const criticRes = await makeRequest("/api/empire/critic/audit", "POST", {
        title: "Precision Farming Sensor Dashboard",
        niche: "AgriTech",
        expectedRevenueInr: 30000,
        costInr: 1500,
        turnaroundDays: 2,
        isDigitalAsset: true,
        isRecurring: true
      });
      assert.strictEqual(criticRes.status, 200);
      assert.ok(criticRes.body.audit.verdict);
      assert.ok(criticRes.body.audit.robustnessScore >= 75);

      // 2. POST /api/empire/dag/execute
      const dagRes = await makeRequest("/api/empire/dag/execute", "POST", {
        title: "Cold Chain IoT DAG",
        niche: "Cold Storage Automation",
        revenueInr: 40000
      });
      assert.strictEqual(dagRes.status, 200);
      assert.strictEqual(dagRes.body.result.status, "COMPLETED");
      assert.strictEqual(dagRes.body.result.totalNodes, 11);

      // 3. GET /api/empire/metered/status & POST /api/empire/api-keys/generate
      const meteredStatus = await makeRequest("/api/empire/metered/status");
      assert.strictEqual(meteredStatus.status, 200);
      assert.ok(meteredStatus.body.gateway.activeApiKeysCount >= 1);

      const newKeyRes = await makeRequest("/api/empire/api-keys/generate", "POST", {
        clientName: "Punjab Agro Partner",
        creditBalanceInr: 1000
      });
      assert.strictEqual(newKeyRes.status, 200);
      const testApiKey = newKeyRes.body.keyRecord.apiKey;
      assert.ok(testApiKey.startsWith("aifie_live_"));

      // 4. POST /api/public/agritech/advisory with API key
      const agriRes = await makeRequest("/api/public/agritech/advisory", "POST", {
        cropType: "Basmati Rice",
        acreage: 25,
        region: "Karnal, Haryana"
      }, { "x-api-key": testApiKey });
      assert.strictEqual(agriRes.status, 200);
      assert.strictEqual(agriRes.body.advisory.service, "Aifie Precision AgriTech Advisory API");
      assert.strictEqual(agriRes.body.advisory.costInr, 15);
      assert.strictEqual(agriRes.body.advisory.remainingCreditsInr, 985);

      // 5. POST /api/public/seo/audit with API key
      const seoRes = await makeRequest("/api/public/seo/audit", "POST", {
        targetUrl: "https://karnalrice-export.com",
        primaryKeyword: "premium aged basmati rice"
      }, { "x-api-key": testApiKey });
      assert.strictEqual(seoRes.status, 200);
      assert.strictEqual(seoRes.body.audit.costInr, 20);
      assert.strictEqual(seoRes.body.audit.remainingCreditsInr, 965);

      // 6. POST /api/public/copy/generate with API key
      const copyRes = await makeRequest("/api/public/copy/generate", "POST", {
        industry: "AgriTech Exporters",
        objective: "International B2B Buyers"
      }, { "x-api-key": testApiKey });
      assert.strictEqual(copyRes.status, 200);
      assert.strictEqual(copyRes.body.copy.costInr, 10);
      assert.strictEqual(copyRes.body.copy.remainingCreditsInr, 955);

      // 7. POST /api/empire/genetic/evolve & GET /api/empire/genetic/champion
      const evolveRes = await makeRequest("/api/empire/genetic/evolve", "POST", {
        openRatePercent: 35.0,
        csatScore: 4.9
      });
      assert.strictEqual(evolveRes.status, 200);
      assert.ok(evolveRes.body.report.generation >= 2);

      const championRes = await makeRequest("/api/empire/genetic/champion");
      assert.strictEqual(championRes.status, 200);
      assert.ok(championRes.body.champion.variantId);

      // 8. POST /api/empire/warroom/command
      const warroomRes = await makeRequest("/api/empire/warroom/command", "POST", {
        command: "Status of the entire autonomous empire and reserve balance"
      });
      assert.strictEqual(warroomRes.status, 200);
      assert.strictEqual(warroomRes.body.result.actionType, "EMPIRE_STATUS_CHECK");
      assert.ok(warroomRes.body.result.executiveNarrative.includes("Empire Operating Status"));

      // 9. GET /api/empire/immune/status, POST /api/empire/immune/circuit-breaker & POST /api/empire/immune/heal
      const immuneStatusRes = await makeRequest("/api/empire/immune/status");
      assert.strictEqual(immuneStatusRes.status, 200);
      assert.ok(immuneStatusRes.body.immune.healthScore >= 80);

      const tripBreakerRes = await makeRequest("/api/empire/immune/circuit-breaker", "POST", {
        subsystem: "API_GATEWAY",
        action: "TRIP",
        reason: "Simulated load test trip"
      });
      assert.strictEqual(tripBreakerRes.status, 200);
      assert.strictEqual(tripBreakerRes.body.result.state, "OPEN");

      const healRes = await makeRequest("/api/empire/immune/heal", "POST");
      assert.strictEqual(healRes.status, 200);
      assert.strictEqual(healRes.body.result.success, true);

      // 10. GET /api/empire/mesh/status, POST /api/empire/mesh/heartbeat, POST /api/empire/mesh/offload, POST /api/empire/mesh/sync, POST /api/empire/mesh/bft-vote
      const meshStatusRes = await makeRequest("/api/empire/mesh/status");
      assert.strictEqual(meshStatusRes.status, 200);
      assert.strictEqual(meshStatusRes.body.mesh.totalNodesRegistered, 5);

      const hbRes = await makeRequest("/api/empire/mesh/heartbeat", "POST", {
        nodeId: "node-local-workstation-01",
        latencyMs: 2,
        status: "ONLINE"
      });
      assert.strictEqual(hbRes.status, 200);
      assert.strictEqual(hbRes.body.result.success, true);

      const offloadRes = await makeRequest("/api/empire/mesh/offload", "POST", {
        taskType: "BATCH_SEO_AUDIT",
        taskPayload: { targetUrl: "https://globalagro.org" }
      });
      assert.strictEqual(offloadRes.status, 200);
      assert.strictEqual(offloadRes.body.result.status, "EXECUTED_SUCCESSFULLY");

      const syncRes = await makeRequest("/api/empire/mesh/sync", "POST", {
        peerNodeId: "node-render-singapore-02",
        peerState: { treasuryAllocation: { timestamp: Date.now() + 2000 } }
      });
      assert.strictEqual(syncRes.status, 200);
      assert.strictEqual(syncRes.body.result.success, true);

      const bftRes = await makeRequest("/api/empire/mesh/bft-vote", "POST", {
        proposalId: "bft-rest-01",
        proposalTitle: "Authorize Edge Slicing",
        votes: [true, true, true, true, false]
      });
      assert.strictEqual(bftRes.status, 200);
      assert.strictEqual(bftRes.body.result.isApproved, true);

    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

});
