import test from "node:test";
import assert from "node:assert/strict";
import { getHedgeFundCommitteeStatus, runHedgeFundCycle } from "../src/hedge-fund-agents.mjs";
import { createPaperState } from "../src/paper-engine.mjs";

test("runHedgeFundCycle generates Standardized Institutional Trade Output Format", async () => {
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100000 } });
  const orders = [];

  const status = await runHedgeFundCycle({ symbol: "AAPL", paper, orders });
  const ticket = status.tradeOutputFormat;

  assert.ok(ticket);
  assert.equal(ticket.asset, "AAPL");
  assert.equal(ticket.market, "US_EQUITIES");
  assert.ok(["BUY", "SELL", "HOLD", "NO_TRADE"].includes(ticket.decision));
  assert.ok(ticket.entryPrice.startsWith("₹"));
  assert.ok(ticket.stopLossPrice.includes("3.0%"));
  assert.ok(ticket.takeProfitPrice.includes("6.0%"));
  assert.ok(ticket.positionSize.includes("1.0% Equity Risk"));
  assert.ok(ticket.agentVotes.quantStrategy);
  assert.ok(ticket.agentVotes.riskManagement);
  assert.ok(Array.isArray(ticket.reasons));
  assert.ok(Array.isArray(ticket.risks));
  assert.ok(ticket.historicalSimilarityScore.includes("88.5%"));
  assert.ok(["APPROVED", "REJECTED"].includes(ticket.riskApproval));
});
