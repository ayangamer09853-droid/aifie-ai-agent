import test from "node:test";
import assert from "node:assert/strict";
import { getNeuralGraphData, inspectNodeTelemetry } from "../src/neural-network.mjs";

test("getNeuralGraphData constructs neural ecosystem topology", () => {
  const graph = getNeuralGraphData();
  assert.ok(graph.nodes.length >= 17);
  assert.ok(graph.edges.length >= 16);

  for (const node of graph.nodes) {
    assert.ok(node.id);
    assert.ok(node.label);
    assert.ok(node.color);
    assert.ok(typeof node.x === "number");
    assert.ok(typeof node.y === "number");
  }
});

test("inspectNodeTelemetry returns node inspection details", () => {
  const inspection = inspectNodeTelemetry("ceo_agent");
  assert.equal(inspection.node.id, "ceo_agent");
  assert.ok(Array.isArray(inspection.connectedEdges));
  assert.ok(inspection.telemetry.throughput);
});

test("inspectNodeTelemetry throws error on non-existent node ID", () => {
  assert.throws(() => {
    inspectNodeTelemetry("non-existent-node-id");
  }, /not found in ecosystem topology/);
});
