import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { resolve } from "node:path";
import { unlinkSync, existsSync } from "node:fs";
import {
  ClientOutreachDispatcher,
  OUTREACH_STAGES,
  globalOutreachDispatcher
} from "../src/revenue/client-outreach-dispatcher.mjs";
import { app } from "../server.mjs";

test("AIFIE Autonomous Client Outreach Dispatcher & Deal CRM Test Suite", async (t) => {

  await t.test("1. Pipeline Summary: Ingests all 5 high-ticket opportunities totaling ₹4,84,300", (t1) => {
    const testCrmPath = resolve(process.cwd(), "data", "test-crm.json");
    if (existsSync(testCrmPath)) unlinkSync(testCrmPath);
    t1.after(() => {
      if (existsSync(testCrmPath)) try { unlinkSync(testCrmPath); } catch {}
    });

    const dispatcher = new ClientOutreachDispatcher(testCrmPath);
    const summary = dispatcher.getPipelineSummary();

    assert.equal(summary.status, "ACTIVE_PIPELINE");
    assert.equal(summary.totalDeals, 5);
    assert.equal(summary.totalPipelineValueInr, 484300);
    assert.ok(summary.totalPipelineValueUsd > 5500);
    assert.equal(summary.stageCounts[OUTREACH_STAGES.PITCH_PREPARED], 5);
  });

  await t.test("2. Dispatch Packet Generator: Formats Email, Upwork, and LinkedIn with working PoC code", () => {
    const dispatcher = new ClientOutreachDispatcher();
    const packet = dispatcher.getDispatchPacket("SWARM-JOB-201");

    assert.equal(packet.dealId, "SWARM-JOB-201");
    assert.equal(packet.clientName, "Apex Cloud Innovations (Austin, USA)");
    assert.equal(packet.budgetInr, 125250);
    assert.equal(packet.budgetUsd, 1500);

    // Email Channel
    assert.ok(packet.channels.email.recipient);
    assert.ok(packet.channels.email.subject.includes("Working Architecture Prototype Attached"));
    assert.ok(packet.channels.email.body.includes("WORKING CODE DELIVERABLE PREVIEW"));
    assert.ok(packet.channels.email.mailtoUrl.startsWith("mailto:"));
    assert.ok(packet.channels.email.mailtoUrl.includes("subject="));
    assert.ok(packet.channels.email.mailtoUrl.includes("body="));

    // Upwork Channel
    assert.ok(packet.channels.upwork.proposalText.includes("Apex Cloud Innovations"));
    assert.ok(packet.channels.upwork.proposalText.includes("WORKING PROOF-OF-CONCEPT PREVIEW"));
    assert.equal(packet.channels.upwork.milestones.length, 2);

    // LinkedIn Channel
    assert.ok(packet.channels.linkedIn.inMailHook.includes("working prototype"));
  });

  await t.test("3. Dispatch Tracking & CRM Stage Progression", (t3) => {
    const testCrmPath = resolve(process.cwd(), "data", "test-crm-stage.json");
    if (existsSync(testCrmPath)) unlinkSync(testCrmPath);
    t3.after(() => {
      if (existsSync(testCrmPath)) try { unlinkSync(testCrmPath); } catch {}
    });

    const dispatcher = new ClientOutreachDispatcher(testCrmPath);

    // Initial stage
    assert.equal(dispatcher.getDeal("SWARM-JOB-202").stage, OUTREACH_STAGES.PITCH_PREPARED);

    // 1. Record Dispatch
    const dispatchRes = dispatcher.recordDispatch("SWARM-JOB-202", {
      channel: "EMAIL",
      recipient: "procurement@biofresh.in",
      notes: "Sent proposal with WhatsApp IoT alerting prototype"
    });
    assert.equal(dispatchRes.deal.stage, OUTREACH_STAGES.DISPATCHED);
    assert.equal(dispatchRes.deal.dispatchedChannel, "EMAIL");

    // 2. Client responds -> Update Stage to IN_CONVERSATION
    const convoRes = dispatcher.updateDealStage("SWARM-JOB-202", OUTREACH_STAGES.IN_CONVERSATION, {
      notes: "Client loved the prototype! Scheduling milestone kickoff call."
    });
    assert.equal(convoRes.deal.stage, OUTREACH_STAGES.IN_CONVERSATION);

    // Summary reflects stage count
    const summary = dispatcher.getPipelineSummary();
    assert.equal(summary.stageCounts[OUTREACH_STAGES.IN_CONVERSATION], 1);
  });

  await t.test("4. 1-Click Client Invoice Bridging with Real UPI QR", (t4) => {
    const testCrmPath = resolve(process.cwd(), "data", "test-crm-inv.json");
    if (existsSync(testCrmPath)) unlinkSync(testCrmPath);
    t4.after(() => {
      if (existsSync(testCrmPath)) try { unlinkSync(testCrmPath); } catch {}
    });

    const dispatcher = new ClientOutreachDispatcher(testCrmPath);
    const invRes = dispatcher.generateClientInvoice("SWARM-JOB-203");

    assert.equal(invRes.success, true);
    assert.equal(invRes.deal.stage, OUTREACH_STAGES.INVOICE_SENT);
    assert.ok(invRes.deal.invoiceId.startsWith("INV-"));
    assert.equal(invRes.invoice.amountInr, 70975);
    assert.ok(invRes.invoice.upiIntentUri.startsWith("upi://pay?"));
    assert.ok(invRes.invoice.upiIntentUri.includes("am=70975"));
    assert.ok(invRes.invoice.qrCodeSvg.includes("<svg"));
  });

  await t.test("5. Server REST Endpoints Integration for Outreach & Deal CRM", async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const makeRequest = async (path, method = "GET", body = null) => {
      return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const req = http.request(url, { method, headers: { "Content-Type": "application/json" } }, (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, data });
            }
          });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    };

    try {
      // 1. GET /api/outreach/pipeline
      const pipeRes = await makeRequest("/api/outreach/pipeline");
      assert.equal(pipeRes.status, 200);
      assert.equal(pipeRes.data.ok, true);
      assert.equal(pipeRes.data.summary.totalDeals, 5);

      // 2. GET /api/outreach/packet
      const packetRes = await makeRequest("/api/outreach/packet?jobId=SWARM-JOB-201");
      assert.equal(packetRes.status, 200);
      assert.equal(packetRes.data.ok, true);
      assert.ok(packetRes.data.packet.channels.email.mailtoUrl.startsWith("mailto:"));

      // 3. POST /api/outreach/dispatch
      const dispatchRes = await makeRequest("/api/outreach/dispatch", "POST", {
        jobId: "SWARM-JOB-201",
        channel: "UPWORK",
        recipient: "Apex Cloud",
        notes: "Bid submitted via Upwork client portal"
      });
      assert.equal(dispatchRes.status, 200);
      assert.equal(dispatchRes.data.ok, true);
      assert.equal(dispatchRes.data.result.deal.stage, OUTREACH_STAGES.DISPATCHED);

      // 4. POST /api/outreach/update-stage
      const stageRes = await makeRequest("/api/outreach/update-stage", "POST", {
        jobId: "SWARM-JOB-201",
        stage: OUTREACH_STAGES.IN_CONVERSATION,
        notes: "Client replied asking for repository access"
      });
      assert.equal(stageRes.status, 200);
      assert.equal(stageRes.data.ok, true);
      assert.equal(stageRes.data.result.deal.stage, OUTREACH_STAGES.IN_CONVERSATION);

      // 5. POST /api/outreach/create-deal-invoice
      const invoiceRes = await makeRequest("/api/outreach/create-deal-invoice", "POST", {
        jobId: "SWARM-JOB-201"
      });
      assert.equal(invoiceRes.status, 201);
      assert.equal(invoiceRes.data.ok, true);
      assert.ok(invoiceRes.data.result.invoice.id);
      assert.ok(invoiceRes.data.result.invoice.upiIntentUri);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

});
