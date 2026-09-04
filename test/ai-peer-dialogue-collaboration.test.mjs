import test from "node:test";
import assert from "node:assert/strict";
import {
  conductAiPeerDialogue,
  distillSelfKnowledgeFromDialogue,
  distillSelfKnowledgeFromTradeOutcome,
  applySelfKnowledgeToDecision,
  getSelfKnowledgeTelemetry,
  AI_AGENT_PERSONAS
} from "../src/ai-peer-dialogue-collaboration-engine.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";
import { createPaperState } from "../src/paper-engine.mjs";

test("AI-to-AI Peer Dialogue, Collaborative Reasoning & Self-Knowledge Test Suite", async (t) => {

  await t.test("should define specialized AI agent personas with unique focus areas", () => {
    assert.ok(AI_AGENT_PERSONAS.VisionEye);
    assert.ok(AI_AGENT_PERSONAS.QuantMath);
    assert.ok(AI_AGENT_PERSONAS.MacroSentinel);
    assert.ok(AI_AGENT_PERSONAS.SkepticCritic);
    assert.ok(AI_AGENT_PERSONAS.ExecutiveModerator);
    assert.match(AI_AGENT_PERSONAS.VisionEye.focus, /Technical structure/);
    assert.match(AI_AGENT_PERSONAS.SkepticCritic.focus, /Challenging bullish bias/);
  });

  await t.test("should conduct a multi-round peer dialogue with debate and consensus synthesis", async () => {
    const dialogue = await conductAiPeerDialogue({
      symbol: "NVDA",
      currentPrice: 148.50,
      proposedAction: "BUY"
    });

    assert.equal(dialogue.symbol, "NVDA");
    assert.equal(dialogue.rounds.length, 3);
    
    // Round 1: Thesis
    assert.equal(dialogue.rounds[0].roundNumber, 1);
    assert.ok(dialogue.rounds[0].messages.some(m => m.agent === "VisionEye"));
    assert.ok(dialogue.rounds[0].messages.some(m => m.agent === "QuantMath"));
    assert.ok(dialogue.rounds[0].messages.some(m => m.agent === "SkepticCritic"));

    // Round 2: Cross-examination
    assert.equal(dialogue.rounds[1].roundNumber, 2);
    assert.ok(dialogue.rounds[1].messages.some(m => m.target === "SkepticCritic"));

    // Round 3: Collaborative Consensus
    assert.equal(dialogue.rounds[2].roundNumber, 3);
    assert.equal(dialogue.consensus.action, "BUY");
    assert.ok(dialogue.consensus.convictionScore >= 80);
    assert.ok(dialogue.consensus.stopLoss < 148.50);
    assert.ok(dialogue.consensus.takeProfit > 148.50);
    assert.ok(dialogue.distilledAxiomId);
  });

  await t.test("should distill and persist self-knowledge axioms into the knowledge vault", () => {
    const initialTelemetry = getSelfKnowledgeTelemetry();
    assert.ok(initialTelemetry.totalAxiomsCount >= 6);

    const axiom = distillSelfKnowledgeFromDialogue({
      symbol: "TSLA",
      dialogueId: "test-dialogue-1",
      consensusAction: "BUY",
      keyInsight: "TSLA 5m volume shelf breakout confirmed by institutional block trades."
    });

    assert.ok(axiom.id);
    assert.equal(axiom.action, "COLLABORATIVE_EDGE_BOOST");
    
    const updatedTelemetry = getSelfKnowledgeTelemetry();
    assert.ok(updatedTelemetry.totalAxiomsCount >= initialTelemetry.totalAxiomsCount);
  });

  await t.test("should distill trade outcomes and update empirical accuracy", () => {
    const winOutcome = distillSelfKnowledgeFromTradeOutcome({
      symbol: "NVDA",
      side: "BUY",
      realizedPnLUSD: 450.0,
      pnlPercent: 4.5,
      strategy: "TAKE_PROFIT_AUTO"
    });
    assert.equal(winOutcome.isWin, true);

    const lossOutcome = distillSelfKnowledgeFromTradeOutcome({
      symbol: "NVDA",
      side: "BUY",
      realizedPnLUSD: -150.0,
      pnlPercent: -1.5,
      strategy: "STOP_LOSS_AUTO"
    });
    assert.equal(lossOutcome.isWin, false);
    assert.ok(lossOutcome.totalAxiomsNow > 0);
  });

  await t.test("should actively apply learned self-knowledge to improve trading decisions", () => {
    // Test 1: Confluence boost on asset without prior loss (AAPL)
    const boostResult = applySelfKnowledgeToDecision({
      symbol: "AAPL",
      proposedAction: "BUY",
      rawConviction: 70,
      marketFeatures: { cvdDeltaInflow: true, whaleAbsorption: true }
    });
    assert.ok(boostResult.calibratedConviction > 70);
    assert.equal(boostResult.isVetoed, false);
    assert.ok(boostResult.appliedAxiomsCount >= 1);

    // Test 2: Asset with prior distilled loss mitigation (NVDA) has calibrated dampening
    const lossMitigationResult = applySelfKnowledgeToDecision({
      symbol: "NVDA",
      proposedAction: "BUY",
      rawConviction: 70,
      marketFeatures: { priorLossMitigation: true }
    });
    assert.ok(lossMitigationResult.appliedAxioms.some(a => a.action === "TRIM_RISK_REQUIRE_CONFIRMATION"));

    // Test 3: Cooling period veto
    const vetoResult = applySelfKnowledgeToDecision({
      symbol: "AAPL",
      proposedAction: "BUY",
      rawConviction: 85,
      marketFeatures: { recentStopLoss: true }
    });
    assert.equal(vetoResult.isVetoed, true);
    assert.equal(vetoResult.decisionVerdict, "BLOCKED_BY_SELF_KNOWLEDGE_GUARD");
  });

  await t.test("should parse and respond to Telegram /collab and /knowledge commands", async () => {
    const parsedCollab = parseTelegramCommand("🗣️ AI Collab & Dialogue");
    assert.equal(parsedCollab.command, "/collab");

    const paper = createPaperState({ cash: 100000, positions: {} });
    const replyCollab = await processTelegramCommand(parsedCollab, { paper, orders: [] });
    assert.match(replyCollab, /AI-TO-AI PEER DEBATE & COLLABORATIVE REASONING/);
    assert.match(replyCollab, /ROUND 1: OPENING THESIS/);
    assert.match(replyCollab, /ROUND 2: CROSS-EXAMINATION & DEBATE/);
    assert.match(replyCollab, /AUTONOMOUS SELF-KNOWLEDGE DISTILLED/);

    const parsedKnowledge = parseTelegramCommand("/knowledge");
    assert.equal(parsedKnowledge.command, "/knowledge");
    const replyKnowledge = await processTelegramCommand(parsedKnowledge, { paper, orders: [] });
    assert.match(replyKnowledge, /AUTONOMOUS AI SELF-KNOWLEDGE VAULT/);
    assert.match(replyKnowledge, /TOP ACTIVE SELF-KNOWLEDGE AXIOMS/);
  });

});
