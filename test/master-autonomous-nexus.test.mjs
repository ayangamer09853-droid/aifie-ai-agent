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
  assert.equal(status.nexusVersion, "AIFIE_MASTER_NEXUS_V95");
  assert.equal(status.nexusStatus, "ALL_5_LAYERS_SYNCHRONIZED");

  // Layer 1: Cloud Virtual Computer
  assert.ok(status.layer1_CloudVirtualComputer.platform);
  assert.equal(status.layer1_CloudVirtualComputer.desktopPort, 3000);
  assert.equal(status.layer1_CloudVirtualComputer.terminalPort, 7681);

  // Layer 2: Autonomous Intelligence
  assert.ok(status.layer2_AutonomousIntelligence.hermesAgent);
  assert.ok(status.layer2_AutonomousIntelligence.fleetAgentsCount);

  // Layer 3: Risk & Macro
  assert.ok(status.layer3_RiskAndMacro.fxfactoryShield);

  // Layer 4: Real Money Profit
  assert.ok(status.layer4_RealMoneyProfit.realMoneyProfitBalance);
  assert.match(status.layer4_RealMoneyProfit.riskBorneByUser, /Zero Capital Risk/);

  // Layer 5: Gateways
  assert.ok(status.layer5_GatewaysAndReach.connectedChannels.length > 0);
});

test("runMasterAutonomousNexusCycle coordinates all 5 layers sequentially", async () => {
  const res = await runMasterAutonomousNexusCycle({ targetSymbol: "BTC/USDT" });
  assert.equal(res.success, true);
  assert.ok(res.message.includes("Master Autonomous Nexus Cycle"));
  assert.ok(res.cycleReport);
  assert.equal(res.cycleReport.targetSymbol, "BTC/USDT");
  assert.ok(res.cycleReport.logs.length >= 4);
  assert.ok(res.cycleReport.logs.some(l => l.includes("[L1_CLOUD]")));
  assert.ok(res.cycleReport.logs.some(l => l.includes("[L3_MACRO]")));
  assert.ok(res.cycleReport.logs.some(l => l.includes("[L4_PROFIT]") || l.includes("[L4_ALPHA]")));
  assert.ok(res.cycleReport.logs.some(l => l.includes("[L5_OPENCLAW]")));
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
