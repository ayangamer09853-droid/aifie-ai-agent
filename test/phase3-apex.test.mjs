import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";
import { getSwarmMeshStatus, broadcastNodeHeartbeat, evaluateBftConsensusVote } from "../src/multi-node-swarm-mesh.mjs";
import { getLiquidityHeatmapMatrix } from "../src/liquidity-depth-heatmap-engine.mjs";

test("multi-node swarm mesh reports distributed peer topology and BFT quorum", () => {
  const mesh = getSwarmMeshStatus();
  assert.equal(mesh.status, "SWARM_MESH_PEER_NETWORK_ONLINE");
  assert.equal(mesh.totalNodes, 5);
  assert.equal(mesh.quorumThreshold, "3-of-5_BFT_CONSENSUS");
  assert.equal(mesh.isQuorumSatisfied, true);
  assert.ok(mesh.nodes.length >= 5);
});

test("node heartbeat updates node latency and health status", () => {
  const hb = broadcastNodeHeartbeat({ nodeId: "node-oracle-frankfurt-01", latencyMs: 22 });
  assert.equal(hb.heartbeatAcknowledged, true);
  assert.equal(hb.nodeId, "node-oracle-frankfurt-01");
  assert.equal(hb.meshStatus, "HEALTHY");
});

test("BFT consensus voting approves when quorum is satisfied and rejects otherwise", () => {
  const approved = evaluateBftConsensusVote({ votes: [true, true, true, false, false] });
  assert.equal(approved.votingResult.isConsensusApproved, true);
  assert.equal(approved.bftVerdict, "BYZANTINE_CONSENSUS_APPROVED_FOR_EXECUTION");

  const rejected = evaluateBftConsensusVote({ votes: [true, false, false, false, false] });
  assert.equal(rejected.votingResult.isConsensusApproved, false);
  assert.equal(rejected.bftVerdict, "SIGNAL_REJECTED_INSUFFICIENT_VOTES");
});

test("3D liquidity depth heatmap calculates resting levels, iceberg walls, and book imbalance", () => {
  const hm = getLiquidityHeatmapMatrix({ symbol: "BTC/USDT", centerPrice: 88000.0, levelsCount: 20 });
  assert.equal(hm.engine, "AIFIE_APEX_3D_LIQUIDITY_HEATMAP_V100");
  assert.equal(hm.symbol, "BTC/USDT");
  assert.equal(hm.levelsCount, 20);
  assert.equal(hm.bids.length, 20);
  assert.equal(hm.asks.length, 20);
  assert.ok(hm.depthMetrics.bookImbalanceRatio > 0);
  assert.ok(hm.majorLiquidityWalls.supportLevel > 0);
  assert.ok(hm.majorLiquidityWalls.resistanceLevel > 0);
  assert.ok(hm.bids.some(b => b.isLiquidityWall));
});

test("Apex v100 Phase 3 HTTP endpoints serve swarm mesh, BFT voting, and heatmap APIs", async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const meshRes = await fetch(`${baseUrl}/api/v100/mesh/status`);
    assert.equal(meshRes.status, 200);
    const meshData = await meshRes.json();
    assert.equal(meshData.status, "SWARM_MESH_PEER_NETWORK_ONLINE");

    const hbRes = await fetch(`${baseUrl}/api/v100/mesh/heartbeat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nodeId: "node-local-workstation-05", latencyMs: 3 })
    });
    assert.equal(hbRes.status, 200);
    const hbData = await hbRes.json();
    assert.equal(hbData.heartbeatAcknowledged, true);

    const voteRes = await fetch(`${baseUrl}/api/v100/mesh/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: "SOL", signalType: "BUY", votes: [true, true, true, true, true] })
    });
    assert.equal(voteRes.status, 200);
    const voteData = await voteRes.json();
    assert.equal(voteData.votingResult.isConsensusApproved, true);

    const hmRes = await fetch(`${baseUrl}/api/v100/heatmap/matrix?symbol=ETH-USD&centerPrice=3400`);
    assert.equal(hmRes.status, 200);
    const hmData = await hmRes.json();
    assert.equal(hmData.symbol, "ETH-USD");
    assert.equal(hmData.levelsCount, 20);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
