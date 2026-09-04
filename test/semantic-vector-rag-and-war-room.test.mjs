import test from "node:test";
import assert from "node:assert/strict";
import {
  generateEmbeddingVector,
  computeCosineSimilarity,
  semanticVectorRagEngine
} from "../src/semantic-vector-rag-engine.mjs";
import { WAR_ROOM_HTML } from "../src/ai-war-room-canvas.mjs";

test("Semantic Vector RAG & AI War Room Canvas Test Suite", async (t) => {

  await t.test("should generate a 64-dimensional normalized vector embedding", () => {
    const vec = generateEmbeddingVector("Bullish liquidity sweep with CVD delta accumulation", {
      price: 150.0,
      cvdDeltaInflow: true,
      defconLevel: 2,
      winRate: 80.0
    });

    assert.equal(vec.length, 64);
    
    // Check that L2 norm is approximately 1.0
    let sumSq = 0;
    for (const v of vec) sumSq += v * v;
    const norm = Math.sqrt(sumSq);
    assert.ok(Math.abs(norm - 1.0) < 0.01, `Expected unit norm ~1.0, got ${norm}`);
  });

  await t.test("should compute cosine similarity accurately between identical and orthogonal vectors", () => {
    const vecA = generateEmbeddingVector("NVDA liquidity sweep", { price: 148.0, cvdDeltaInflow: true });
    const vecIdentical = [...vecA];
    const similarity = computeCosineSimilarity(vecA, vecIdentical);
    assert.ok(similarity >= 0.99, `Expected ~1.0, got ${similarity}`);

    const vecB = generateEmbeddingVector("Macro geopolitical panic crash oil spike", { price: 80.0, defconLevel: 1 });
    const simDiff = computeCosineSimilarity(vecA, vecB);
    assert.ok(simDiff < 0.95);
  });

  await t.test("should query semantic vector RAG and retrieve top matching historical setups", () => {
    const queryRes = semanticVectorRagEngine.querySimilarSetups({
      symbol: "NVDA",
      queryText: "4H liquidity sweep below swing low with order block",
      marketMetrics: { currentPrice: 148.5, cvdDeltaInflow: true },
      topK: 3
    });

    assert.equal(queryRes.querySymbol, "NVDA");
    assert.equal(queryRes.topMatchesCount, 3);
    assert.ok(queryRes.bestMatch);
    assert.ok(queryRes.bestMatch.similarityScore > 0);
    assert.ok(queryRes.bestMatch.historicalWinRate);
    assert.ok(queryRes.ragGuidance);
    assert.match(queryRes.ragGuidance, /RAG Match/);
  });

  await t.test("should store a new market setup vector into the persistent vault", () => {
    const initialCount = semanticVectorRagEngine.getVaultTelemetry().totalIndexedVectors;

    const newEntry = semanticVectorRagEngine.storeSetupVector({
      title: "Solana DeFi Flash Loan Arbitrage Opportunity",
      symbol: "SOL/USDT",
      action: "BUY",
      historicalWinRate: 81.4,
      profitFactor: 2.7,
      lessonsLearned: "Execute only when DEX-CEX spread exceeds 18 basis points.",
      marketMetrics: { price: 135.0, cvdDeltaInflow: true }
    });

    assert.ok(newEntry.id);
    assert.equal(newEntry.symbol, "SOL/USDT");

    const telemetry = semanticVectorRagEngine.getVaultTelemetry();
    assert.ok(telemetry.totalIndexedVectors >= initialCount);
  });

  await t.test("should provide complete and valid WAR_ROOM_HTML canvas markup", () => {
    assert.ok(WAR_ROOM_HTML);
    assert.match(WAR_ROOM_HTML, /AIFIE SYNAPTIC AI WAR ROOM/);
    assert.match(WAR_ROOM_HTML, /VisionEye AI/);
    assert.match(WAR_ROOM_HTML, /QuantMath AI/);
    assert.match(WAR_ROOM_HTML, /SkepticCritic AI/);
    assert.match(WAR_ROOM_HTML, /ExecutiveModerator/);
    assert.match(WAR_ROOM_HTML, /btnDebate/);
    assert.match(WAR_ROOM_HTML, /btnRag/);
  });

});
