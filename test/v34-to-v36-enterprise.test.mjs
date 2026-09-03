import test from "node:test";
import assert from "node:assert/strict";
import { getCrossChainDexStatus, aggregateCrossChainDexLiquidity, generateZkTradeAuditProof, verifyZkTradeAuditProof } from "../src/crosschain-dex-zk-proofs-engine.mjs";
import { getWebsocketCanvasStatus, generateLiveCanvasRenderFrame, getRealtimeStreamData } from "../src/websockets-canvas-streaming-engine.mjs";
import { getMultiCloudHaStatus, triggerCloudFailoverElection, getGeoDistributedNodes } from "../src/geodistributed-cloud-ha-engine.mjs";

test("v34.0 Cross-Chain DEX Aggregator & ZK Proofs Engine", () => {
  const status = getCrossChainDexStatus();
  assert.equal(status.dexEngineStatus, "CROSSCHAIN_DEX_AGGREGATOR_ONLINE");
  assert.equal(status.supportedProtocolsCount, 5);

  const agg = aggregateCrossChainDexLiquidity({ symbol: "ETH", tradeSizeUSD: 10000 });
  assert.equal(agg.aggregationStatus, "OPTIMAL_SPLIT_ROUTED");
  assert.equal(agg.routeSplit.length, 2);

  const zk = generateZkTradeAuditProof({ symbol: "AAPL", fillPrice: 150, quantity: 2, side: "BUY" });
  assert.equal(zk.proofStatus, "ZK_SNARK_PROOF_GENERATED");
  assert.ok(zk.proofHash.startsWith("0x"));

  const verify = verifyZkTradeAuditProof(zk.proofHash);
  assert.equal(verify.verificationStatus, "ZK_PROOF_VERIFIED_VALID");
});

test("v35.0 Real-Time WebSockets Streaming & Visual Canvas Engine", () => {
  const ws = getWebsocketCanvasStatus();
  assert.equal(ws.websocketEngineStatus, "WEBSOCKETS_STREAMING_SERVER_ACTIVE");
  assert.equal(ws.streamPort, 8788);

  const frame = generateLiveCanvasRenderFrame({ symbol: "AAPL" });
  assert.equal(frame.canvasStatus, "CANVAS_FRAME_RENDERED_60FPS");
  assert.equal(frame.fps, 60);
  assert.ok(frame.renderLayers.length >= 4);

  const stream = getRealtimeStreamData("AAPL");
  assert.equal(stream.streamType, "L2_ORDERBOOK_AND_PNL_STREAM");
  assert.ok(stream.bidDepth.length >= 1);
});

test("v36.0 Geo-Distributed Multi-Cloud HA & Raft Leader Election Engine", () => {
  const ha = getMultiCloudHaStatus();
  assert.equal(ha.haEngineStatus, "GEO_DISTRIBUTED_MULTI_CLOUD_HA_ONLINE");
  assert.equal(ha.activeNodesCount, 4);

  const election = triggerCloudFailoverElection({ failedNodeId: "NODE_01_ORACLE_PRIMARY" });
  assert.equal(election.electionVerdict, "NEW_LEADER_ELECTED_SUCCESSFULLY");
  assert.ok(election.newLeaderNodeId);
});
