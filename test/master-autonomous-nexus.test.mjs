import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getMasterNexusStatus,
  runMasterAutonomousNexusCycle,
  startMasterAutonomousNexusDaemon,
  stopMasterAutonomousNexusDaemon
} from "../src/master-autonomous-nexus.mjs";

test("getMasterNexusStatus returns comprehensive 5-layer telemetry", () => {
  const status = getMasterNexusStatus();
  assert.equal(status.success, true);
  assert.equal(status.nexusVersion, "AIFIE_QUANT_NEXUS_V100");
  assert.equal(status.nexusStatus, "ALL_LAYERS_SYNCHRONIZED");

  // Layer 1: System Runtime
  assert.ok(status.layer1_SystemRuntime.platform);
  assert.match(status.layer1_SystemRuntime.executionMode, /SIMULATED PAPER TRADING/);

  // Layer 2: Quantitative Research
  assert.equal(status.layer2_QuantitativeResearch.activeStrategiesCount, 6);
  assert.equal(status.layer2_QuantitativeResearch.backtestStatus, "VALIDATED");

  // Layer 3: Risk Governance
  assert.equal(status.layer3_RiskGovernance.maxDailyLossCap, "3.0%");
  assert.equal(status.layer3_RiskGovernance.sizingMethodology, "Half-Kelly Optimization");

  // Layer 4: Simulated Paper Engine
  assert.equal(status.layer4_PaperExecutionEngine.executionMode, "SIMULATED_PAPER");
  assert.equal(status.layer4_PaperExecutionEngine.capitalRisk, "0.00% (Zero Real Capital at Risk)");

  // Layer 5: Gateways & Monitoring
  assert.equal(status.layer5_GatewaysAndMonitoring.publicTunnel, "DISABLED (SECURITY POLICY)");
  assert.ok(status.layer5_GatewaysAndMonitoring.localDashboard);
});

test("runMasterAutonomousNexusCycle coordinates all 5 layers sequentially", async () => {
  const res = await runMasterAutonomousNexusCycle({ targetSymbol: "BTC/USDT" });
  assert.equal(res.success, true);
  assert.ok(res.message.includes("Nexus cycle"));
  assert.ok(res.cycleReport);
  assert.equal(res.cycleReport.targetSymbol, "BTC/USDT");
  assert.ok(res.cycleReport.logs.length >= 2);
  assert.ok(res.cycleReport.logs.some(l => l.includes("[L1_SYSTEM]")));
  assert.ok(res.cycleReport.logs.some(l => l.includes("[L3_RISK]")));
  assert.ok(res.cycleReport.logs.some(l => l.includes("[L2_ALPHA]")));
});

test("startMasterAutonomousNexusDaemon and stop manage background timer cleanly", () => {
  const startRes = startMasterAutonomousNexusDaemon({ intervalMs: 300000 });
  assert.equal(startRes.status, "ACTIVE_NEXUS_DAEMON_STARTED");

  const stopRes = stopMasterAutonomousNexusDaemon();
  assert.equal(stopRes.status, "NEXUS_DAEMON_STOPPED");
});

test("1-Click Launch Scripts (start-aifie-master.ps1 & start-aifie-master.sh) exist and are valid", () => {
  const ps1Path = join(process.cwd(), "start-aifie-master.ps1");
  const shPath = join(process.cwd(), "start-aifie-master.sh");
  const archDocPath = join(process.cwd(), "AIFIE_MASTER_SYSTEM_ARCHITECTURE.md");

  assert.equal(existsSync(ps1Path), true, "start-aifie-master.ps1 should exist");
  assert.equal(existsSync(shPath), true, "start-aifie-master.sh should exist");
  assert.equal(existsSync(archDocPath), true, "AIFIE_MASTER_SYSTEM_ARCHITECTURE.md should exist");

  const ps1Content = readFileSync(ps1Path, "utf-8");
  const shContent = readFileSync(shPath, "utf-8");
  const archContent = readFileSync(archDocPath, "utf-8");

  assert.match(ps1Content, /MASTER AUTONOMOUS NEXUS/);
  assert.match(shContent, /MASTER AUTONOMOUS NEXUS/);
  assert.match(archContent, /AIFIE AI AGENT: MASTER SYSTEM ARCHITECTURE/);
});
