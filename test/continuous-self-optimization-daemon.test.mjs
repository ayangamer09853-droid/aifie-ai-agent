import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { continuousSelfOptimizationDaemon } from "../src/continuous-self-optimization-daemon.mjs";
import { processTelegramCommand, parseTelegramCommand } from "../src/telegram-command-listener.mjs";

describe("24/7 Continuous Self-Optimization Daemon & EOD Report Suite", () => {
  before(() => {
    continuousSelfOptimizationDaemon.stopDaemon();
  });

  after(() => {
    continuousSelfOptimizationDaemon.stopDaemon();
  });

  it("should get initial optimizer status with correct state structure", () => {
    const status = continuousSelfOptimizationDaemon.getStatus();
    assert.ok(status, "Status object should be returned");
    assert.equal(status.success, true);
    assert.ok(status.daemonStatus === "RUNNING_24_7" || status.daemonStatus === "PAUSED");
    assert.ok(status.activeParameters);
    assert.ok(Array.isArray(status.todaysOptimizedStrategies));
    assert.ok(Array.isArray(status.todaysParameterLog));
    assert.equal(typeof status.optimizationScore, "number");
    assert.equal(typeof status.totalCyclesLifetime, "number");
  });

  it("should run an optimization cycle and update parameters and metrics", async () => {
    const initialCycles = continuousSelfOptimizationDaemon.getStatus().totalCyclesToday;
    const result = await continuousSelfOptimizationDaemon.runOptimizationCycle("manual_unit_test");
    
    assert.ok(result);
    assert.equal(result.success, true);
    assert.ok(result.cycleId);
    assert.ok(typeof result.pboRatio === "number");
    assert.equal(typeof result.pboPassed, "boolean");
    assert.ok(result.optimizedStrategy);

    const statusAfter = continuousSelfOptimizationDaemon.getStatus();
    assert.ok(statusAfter.totalCyclesToday >= initialCycles);
    assert.ok(statusAfter.todaysParameterLog.length > 0);
  });

  it("should generate a Day-End (EOD) report without error and archive it", async () => {
    const report = await continuousSelfOptimizationDaemon.generateDayEndReport(false);
    assert.ok(report, "Day-end report should be generated");
    assert.equal(report.success, true);
    assert.ok(report.reportDate);
    assert.ok(report.reportId);
    assert.ok(report.executiveSummary);
    assert.ok(report.pboAudit);
    assert.ok(report.expectedTomorrowImpact);
    assert.ok(report.totalCyclesToday >= 1);

    const historical = continuousSelfOptimizationDaemon.getHistoricalReports();
    assert.ok(historical.length >= 1);
    assert.equal(historical[0].reportDate, report.reportDate);
  });

  it("should support startDaemon and stopDaemon toggling", () => {
    continuousSelfOptimizationDaemon.startDaemon(60000);
    assert.equal(continuousSelfOptimizationDaemon.getStatus().daemonStatus, "RUNNING_24_7");

    continuousSelfOptimizationDaemon.stopDaemon();
    assert.equal(continuousSelfOptimizationDaemon.getStatus().daemonStatus, "PAUSED");
  });

  it("should parse telegram commands for optimizer and eod report", () => {
    assert.equal(parseTelegramCommand("/eodreport").command, "/eodreport");
    assert.equal(parseTelegramCommand("/eod").command, "/eodreport");
    assert.equal(parseTelegramCommand("🌙 EOD Optimization Report").command, "/eodreport");
    assert.equal(parseTelegramCommand("/optimizer").command, "/optimizer");
    assert.equal(parseTelegramCommand("⚙️ 24/7 Optimizer Status").command, "/optimizer");
    assert.equal(parseTelegramCommand("/optimizenow").command, "/optimizenow");
  });

  it("should process telegram command /optimizer and return informative status", async () => {
    const cmd = parseTelegramCommand("/optimizer");
    const reply = await processTelegramCommand(cmd);
    assert.ok(typeof reply === "string");
    assert.ok(reply.includes("AUTONOMOUS SELF-OPTIMIZATION DAEMON"));
    assert.ok(reply.includes("Optimization Score:"));
  });

  it("should process telegram command /optimizenow and return cycle summary", async () => {
    const cmd = parseTelegramCommand("/optimizenow");
    const reply = await processTelegramCommand(cmd);
    assert.ok(typeof reply === "string");
    assert.ok(reply.includes("INSTANT SELF-OPTIMIZATION CYCLE EXECUTED!"));
    assert.ok(reply.includes("PBO Validation Gate:"));
  });

  it("should process telegram command /eodreport and return EOD report text", async () => {
    const cmd = parseTelegramCommand("/eodreport");
    const reply = await processTelegramCommand(cmd);
    assert.ok(typeof reply === "string");
    assert.ok(reply.includes("DAY-END SELF-OPTIMIZATION REPORT"));
    assert.ok(reply.includes("EXECUTIVE SUMMARY:"));
    assert.ok(reply.includes("PBO AUDIT:"));
  });
});
