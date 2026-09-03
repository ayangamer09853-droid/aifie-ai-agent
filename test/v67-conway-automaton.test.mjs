import test from "node:test";
import assert from "node:assert/strict";
import {
  getConwayAutomatonStatus,
  executeAutomatonStateTransition,
  getAutomatonStateMatrix
} from "../src/conway-automaton-state-engine.mjs";

test("getConwayAutomatonStatus reports active Conway Automaton framework status", () => {
  const status = getConwayAutomatonStatus();
  assert.equal(status.engineStatus, "CONWAY_AUTOMATON_ENGINE_ONLINE");
  assert.equal(status.protocolVersion, "CONWAY_RESEARCH_AUTOMATON_V67");
  assert.equal(status.frameworkRepo, "Conway-Research/automaton");
  assert.equal(status.stateHealthScorePercent, "100%");
});

test("executeAutomatonStateTransition executes zero-human state machine transition", () => {
  const transition = executeAutomatonStateTransition({ fromState: "DATA_INGESTION", toState: "QUANT_FEATURE_EXTRACTION", targetSymbol: "AAPL" });
  assert.equal(transition.transitionStatus, "CONWAY_AUTOMATON_STATE_TRANSITION_COMPLETED_SUCCESS");
  assert.equal(transition.fromState, "DATA_INGESTION");
  assert.equal(transition.toState, "QUANT_FEATURE_EXTRACTION");
  assert.ok(transition.transitionTxHash.startsWith("0xCONWAY_TRANS_"));
});

test("getAutomatonStateMatrix evaluates multi-agent workflow state nodes", () => {
  const matrix = getAutomatonStateMatrix();
  assert.equal(matrix.matrixStatus, "CONWAY_AUTOMATON_STATE_MATRIX_LIVE");
  assert.equal(matrix.stateNodes.length, 5);
  assert.equal(matrix.stateNodes[0].nodeName, "RAW_INGESTION_AUTOMATA");
});
