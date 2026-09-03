import test from "node:test";
import assert from "node:assert/strict";
import { getZkFederatedLearningStatus, aggregateFederatedGradients, verifyZkLearningProof } from "../src/quantum-zk-federated-learning-engine.mjs";

test("getZkFederatedLearningStatus reports active federated learning nodes and model accuracy", () => {
  const status = getZkFederatedLearningStatus();
  assert.equal(status.zkFederatedEngineStatus, "QUANTUM_ZK_FEDERATED_LEARNING_ONLINE");
  assert.equal(status.protocolVersion, "ZK_SNARK_FEDERATED_ML_V59");
  assert.equal(status.totalConnectedSwarmNodesCount, 1250);
  assert.equal(status.privacyGuarantee, "ZK_SNARK_ZERO_KNOWLEDGE_100_PERCENT_SAFE");
});

test("aggregateFederatedGradients aggregates homomorphic gradients across swarm nodes", () => {
  const agg = aggregateFederatedGradients({ nodeBatchSize: 100 });
  assert.equal(agg.aggregationStatus, "FEDERATED_GRADIENTS_AGGREGATED_SUCCESS");
  assert.equal(agg.totalNodesParticipated, 100);
  assert.equal(agg.encryptionMode, "HOMOMORPHIC_HE_SMPC_ENCRYPTED");
  assert.ok(agg.aggregationTxHash.startsWith("0xZK_GRADIENT_"));
});

test("verifyZkLearningProof verifies ZK-SNARK zero-knowledge privacy proof", () => {
  const proof = verifyZkLearningProof({ epochNumber: 851 });
  assert.equal(proof.verificationStatus, "ZK_SNARK_LEARNING_PROOF_VERIFIED_VALID");
  assert.equal(proof.zeroKnowledgeVerified, true);
  assert.equal(proof.dataLeakageRisk, "0.00% (ZERO_KNOWLEDGE_GUARANTEED)");
  assert.ok(proof.zkProofHash.startsWith("0xZK_PROOF_"));
});
