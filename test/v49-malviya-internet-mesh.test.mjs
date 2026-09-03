import test from "node:test";
import assert from "node:assert/strict";
import { getMalviyaMeshStatus, connectMalviyaMeshNode, distributeInternetBandwidth } from "../src/malviya-internet-mesh-engine.mjs";

test("getMalviyaMeshStatus reports active PM-WANI public Wi-Fi mesh nodes and capacity", () => {
  const status = getMalviyaMeshStatus();
  assert.equal(status.meshGatewayStatus, "MALVIYA_DECENTRALIZED_INTERNET_MESH_ONLINE");
  assert.equal(status.complianceStandard, "PM_WANI_PUBLIC_WIFI_SPEC_V2");
  assert.ok(status.activeNodesCount >= 3);
  assert.ok(status.totalConnectedClientsCount > 0);
});

test("connectMalviyaMeshNode connects new mesh Wi-Fi node and expands coverage", () => {
  const res = connectMalviyaMeshNode({
    nodeLocation: "EAST_SUB_NODE_04",
    requestedBandwidthMbps: 50
  });

  assert.equal(res.connectionStatus, "MALVIYA_MESH_NODE_CONNECTED_AND_BROADCASTING");
  assert.equal(res.location, "EAST_SUB_NODE_04");
  assert.equal(res.allocatedBandwidthMbps, 50);
  assert.ok(res.sessionHash.startsWith("0xMESH_"));
});

test("distributeInternetBandwidth dynamically adjusts QoS bandwidth allocation", () => {
  const res = distributeInternetBandwidth({
    targetNodeId: "MALVIYA_MESH_NODE_ALPHA_01",
    newCapacityMbps: 200
  });

  assert.equal(res.distributionStatus, "INTERNET_BANDWIDTH_REALLOCATED_SUCCESS");
  assert.equal(res.updatedCapacityMbps, "200 Mbps");
});
