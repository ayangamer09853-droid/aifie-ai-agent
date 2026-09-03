import test from "node:test";
import assert from "node:assert/strict";
import { calculateInformationCoefficient, calculateICIR, calculateSignalHalfLife, runOutofSampleGate, run5StageQuantLoop } from "../src/quant-loop-engineering-engine.mjs";

test("calculateInformationCoefficient computes Pearson correlation between signal and returns", () => {
  const signals = [1, 2, 3, 4, 5];
  const returns = [0.01, 0.02, 0.03, 0.04, 0.05];
  const ic = calculateInformationCoefficient(signals, returns);
  assert.equal(ic, 1);
});

test("calculateICIR computes mean(IC)/std(IC) and classifies consistent edge", () => {
  const icirRes = calculateICIR([0.08, 0.07, 0.09, 0.06, 0.08, 0.07, 0.09, 0.08, 0.06, 0.07]);
  assert.ok(icirRes.icir >= 0.5);
  assert.equal(icirRes.classification, "STRONG_CONSISTENT_EDGE");
});

test("calculateSignalHalfLife estimates signal autocorrelation half-life in days", () => {
  const decay = calculateSignalHalfLife();
  assert.ok(decay.estimatedHalfLifeDays >= 5);
  assert.equal(decay.halfLifeCheckStatus, "HALF_LIFE_SAFE_TRADEABLE");
});

test("runOutofSampleGate enforces Bonferroni correction and OOS ICIR hold checks", () => {
  const gatePass = runOutofSampleGate({ inSampleICIR: 0.62, outOfSampleICIR: 0.58, totalStrategiesTested: 50 });
  assert.equal(gatePass.oosGatePassed, true);
  assert.equal(gatePass.gateDecision, "OUT_OF_SAMPLE_GATE_PASSED_ROBUST_EDGE");

  const gateFail = runOutofSampleGate({ inSampleICIR: 0.62, outOfSampleICIR: 0.15, totalStrategiesTested: 50 });
  assert.equal(gateFail.oosGatePassed, false);
  assert.equal(gateFail.gateDecision, "GATE_REJECTED_OVERFIT_OR_DECAYED");
});

test("run5StageQuantLoop executes full 5-stage iterative refinement loop", () => {
  const loop = run5StageQuantLoop({ coreIdea: "SMC AVWAP Hybrid" });
  assert.equal(loop.loopStatus, "QUANT_LOOP_EXECUTION_COMPLETED");
  assert.equal(loop.stagesCompleted.length, 5);
  assert.equal(loop.finalEdgeVerdict, "ROBUST_STATISTICAL_QUANT_EDGE_VERIFIED");
});
