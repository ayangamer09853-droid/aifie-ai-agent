import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { resolve } from "node:path";
import { unlinkSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  generateUpiIntentUri,
  generateQrSvg,
  RealPaymentGateway,
  PAYMENT_VERIFICATION_SOURCE,
  PAYMENT_GATEWAY_STATUS
} from "../src/revenue/real-payment-gateway.mjs";
import { InvoiceManager, LEDGER_MODE } from "../src/revenue/invoice-and-billing.mjs";
import { RealLeadPipeline } from "../src/revenue/real-lead-pipeline.mjs";
import http from "node:http";
import { app } from "../server.mjs";

test("AIFIE Real Production Commerce & Real-Money Pipeline Test Suite", async (t) => {

  await t.test("1. NPCI UPI Intent URI & QR Code Generation", () => {
    const upiUri = generateUpiIntentUri({
      vpa: "testmerchant@okaxis",
      payeeName: "Aifie Enterprise Solutions",
      amountInr: 15000,
      invoiceId: "INV-2026-0099",
      note: "Web Platform Development"
    });

    assert.ok(upiUri.startsWith("upi://pay?"), "Must start with standard NPCI upi://pay? scheme");
    assert.ok(upiUri.includes("pa=testmerchant%40okaxis") || upiUri.includes("pa=testmerchant@okaxis"), "Must include VPA address");
    assert.ok(upiUri.includes("am=15000.00"), "Must include 2-decimal formatted amount");
    assert.ok(upiUri.includes("cu=INR"), "Must specify INR currency");

    const svg = generateQrSvg(upiUri, 300);
    assert.ok(svg.includes("<svg"), "Must render valid SVG");
    assert.ok(svg.includes("SCAN WITH GPAY / PHONEPE / PAYTM"), "Must include scanning instruction");
  });

  await t.test("2. Razorpay Webhook Cryptographic HMAC-SHA256 Verification", () => {
    const secret = "live_webhook_secret_key_testing_123";
    const gateway = new RealPaymentGateway({ razorpaySecret: secret });

    const rawPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_LiveMockRazorpay123",
            amount: 5000000, // 50,000 INR in paise
            currency: "INR",
            status: "captured",
            notes: { invoiceId: "INV-2026-0040" }
          }
        }
      }
    });

    const validSig = createHmac("sha256", secret).update(rawPayload).digest("hex");
    const tamperedSig = "deadbeef1234567890abcdefdeadbeef1234567890abcdefdeadbeef12345678";

    // Valid signature verification
    const passResult = gateway.verifyRazorpaySignature(rawPayload, validSig);
    assert.equal(passResult.verified, true, "Authentic HMAC signature must be verified");

    // Tampered signature rejection
    const failResult = gateway.verifyRazorpaySignature(rawPayload, tamperedSig);
    assert.equal(failResult.verified, false, "Tampered HMAC signature must be rejected");

    // Full webhook payment processing
    const processed = gateway.processWebhookPayment({
      gateway: "RAZORPAY",
      rawBody: rawPayload,
      signatureHeader: validSig,
      parsedPayload: JSON.parse(rawPayload)
    });

    assert.equal(processed.success, true);
    assert.equal(processed.status, PAYMENT_GATEWAY_STATUS.SETTLED_REAL);
    assert.equal(processed.auditEntry.amountInr, 50000);
    assert.equal(processed.auditEntry.invoiceId, "INV-2026-0040");
    assert.equal(processed.auditEntry.verificationSource, PAYMENT_VERIFICATION_SOURCE.RAZORPAY_WEBHOOK);
  });

  await t.test("3. Stripe Webhook Replay-Resistant Signature Verification", () => {
    const secret = "whsec_stripe_test_secret_998877";
    const gateway = new RealPaymentGateway({ stripeSecret: secret });

    const rawPayload = JSON.stringify({
      id: "evt_12345",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_live_9988776655",
          payment_intent: "pi_real_3M49a8sd7",
          amount_total: 2500000, // 25,000 INR in paise
          currency: "inr",
          metadata: { invoiceId: "INV-2026-0041" }
        }
      }
    });

    const now = Math.floor(Date.now() / 1000);
    const signedPayload = `${now}.${rawPayload}`;
    const validHash = createHmac("sha256", secret).update(signedPayload).digest("hex");
    const header = `t=${now},v1=${validHash}`;

    // Valid Stripe verification
    const verifyResult = gateway.verifyStripeSignature(rawPayload, header);
    assert.equal(verifyResult.verified, true, "Authentic Stripe signature must be verified");

    // Replay attack test (timestamp > 300s in past)
    const oldTimestamp = now - 600;
    const oldPayload = `${oldTimestamp}.${rawPayload}`;
    const oldHash = createHmac("sha256", secret).update(oldPayload).digest("hex");
    const oldHeader = `t=${oldTimestamp},v1=${oldHash}`;

    const replayResult = gateway.verifyStripeSignature(rawPayload, oldHeader);
    assert.equal(replayResult.verified, false, "Expired timestamp must be rejected to prevent replay attacks");

    // Process Stripe payment
    const processed = gateway.processWebhookPayment({
      gateway: "STRIPE",
      rawBody: rawPayload,
      signatureHeader: header,
      parsedPayload: JSON.parse(rawPayload)
    });

    assert.equal(processed.success, true);
    assert.equal(processed.auditEntry.amountInr, 25000);
    assert.equal(processed.auditEntry.invoiceId, "INV-2026-0041");
    assert.equal(processed.auditEntry.verificationSource, PAYMENT_VERIFICATION_SOURCE.STRIPE_WEBHOOK);
  });

  await t.test("4. Manual Bank UTR / IMPS Reconciliation", () => {
    const gateway = new RealPaymentGateway();

    const recon = gateway.reconcileBankUtr({
      invoiceId: "INV-2026-0042",
      utrNumber: "CMS202609200001",
      amountInr: 35000,
      senderBank: "State Bank of India",
      verifiedBy: "CFO_FINANCE_TEAM"
    });

    assert.equal(recon.success, true);
    assert.equal(recon.auditEntry.paymentId, "CMS202609200001");
    assert.equal(recon.auditEntry.amountInr, 35000);
    assert.equal(recon.auditEntry.verificationSource, PAYMENT_VERIFICATION_SOURCE.VERIFIED_BANK_UTR);

    // Invalid short UTR rejection
    assert.throws(() => {
      gateway.reconcileBankUtr({
        invoiceId: "INV-2026-0042",
        utrNumber: "123", // Too short
        amountInr: 35000
      });
    }, /Valid Bank UTR/);
  });

  await t.test("5. InvoiceManager Dual-Ledger Isolation & Real Payment Enforcement", (t5) => {
    const testStorage = resolve(process.cwd(), "data", "test-real-commerce-invoices.json");
    const testProdStorage = resolve(process.cwd(), "data", "test-real-prod-ledger.json");
    if (existsSync(testStorage)) unlinkSync(testStorage);
    if (existsSync(testProdStorage)) unlinkSync(testProdStorage);

    t5.after(() => {
      if (existsSync(testStorage)) try { unlinkSync(testStorage); } catch {}
      if (existsSync(testProdStorage)) try { unlinkSync(testProdStorage); } catch {}
    });

    const manager = new InvoiceManager(testStorage, testProdStorage);

    // Create a real commercial invoice
    const inv = manager.createInvoice({
      clientName: "Real Production Client Inc.",
      serviceId: "WEBSITE_DEV",
      tier: "starter",
      customAmountInr: 45000
    });

    assert.ok(inv.upiIntentUri.includes("upi://pay"), "Invoice must include live UPI intent URI");
    assert.ok(inv.qrSvg.includes("<svg"), "Invoice must include rendered QR Code");

    // Verify initial production ledger is 0 (ZERO fake money)
    assert.equal(manager.productionLedger.verifiedRealCashInr, 0);

    // Attempting unverified simulation payment must NOT affect production ledger
    manager.recordPayment(inv.id, {
      method: "UPI",
      transactionRef: "MOCK_RANDOM_TXN",
      paidAmountInr: 45000,
      mode: LEDGER_MODE.SIMULATION
    });

    assert.equal(manager.productionLedger.verifiedRealCashInr, 0, "Simulation payment must NEVER contaminate real production cash ledger");

    // Create another invoice and record a strictly verified real payment
    const inv2 = manager.createInvoice({
      clientName: "Verified Paying Enterprise",
      serviceId: "SEO_OPTIMIZATION",
      customAmountInr: 25000
    });

    const realSettlement = manager.recordRealPayment(inv2.id, {
      verificationSource: PAYMENT_VERIFICATION_SOURCE.VERIFIED_BANK_UTR,
      paymentId: "HDFC9876543210",
      paidAmountInr: 25000,
      method: "NEFT / Direct Bank Settlement",
      senderBank: "HDFC Bank"
    });

    assert.equal(realSettlement.success, true);
    assert.equal(manager.productionLedger.verifiedRealCashInr, 25000, "Verified real cash must be accurately credited");
    assert.equal(manager.productionLedger.settledTransactions.length, 1);

    // Verify HTML invoice generation
    const html = manager.generateInvoiceHtml(inv2.id);
    assert.ok(html.includes("AIFIE ENTERPRISE SOLUTIONS"), "Must generate formatted commercial HTML invoice");
    assert.ok(html.includes("Verified Paying Enterprise"));
    assert.ok(html.includes("PAID"));
  });

  await t.test("6. Real B2B Freelance Job Pipeline & Tailored Proposal Compiler", () => {
    const pipeline = new RealLeadPipeline();
    assert.ok(pipeline.jobs.size >= 5, "Must have active real market demand job streams");
    const jobsArr = Array.from(pipeline.jobs.values());
    const job = jobsArr[0];
    assert.ok(job.budgetInr > 0);
    assert.ok(job.skillsRequired.length > 0);

    // Generate custom tailored proposal
    const proposal = pipeline.generateTailoredProposal(job.id, {
      customPriceInr: 50000,
      customTimelineDays: 4
    });

    assert.equal(proposal.jobId, job.id);
    assert.equal(proposal.quoteInr, 50000);
    assert.equal(proposal.timelineDays, 4);
    assert.ok(proposal.pitchText.includes(job.title), "Pitch must reference specific job title");
    assert.ok(proposal.pitchText.includes("50,000"), "Pitch must quote proposed investment");
    assert.ok(proposal.pitchText.includes("Aifie Enterprise Solutions"), "Pitch must include company sign-off");

    pipeline.markJobApplied(job.id, proposal.id);
    const updatedJob = pipeline.getJobById(job.id);
    assert.equal(updatedJob.status, "APPLIED");
  });

  await t.test("7. Server REST Webhooks & Endpoints Integration: Production Summary, UTR Reconciler, Real Jobs & Dynamic QR", async () => {
    const prodLedgerPath = resolve(process.cwd(), "data", "production-revenue-ledger.json");
    const auditPath = resolve(process.cwd(), "data", "real-payment-audit.json");
    const originalLedger = existsSync(prodLedgerPath) ? readFileSync(prodLedgerPath, "utf8") : null;
    const originalAudit = existsSync(auditPath) ? readFileSync(auditPath, "utf8") : null;

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const makeRequest = async (path, method = "GET", body = null, headers = {}) => {
      return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const reqHeaders = { "Content-Type": "application/json", ...headers };
        const req = http.request(url, { method, headers: reqHeaders }, (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try {
              const parsed = res.headers["content-type"]?.includes("application/json") ? JSON.parse(data) : data;
              resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            } catch (err) {
              resolve({ status: res.statusCode, headers: res.headers, data });
            }
          });
        });
        req.on("error", reject);
        if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
        req.end();
      });
    };

    try {
      // 1. GET /api/billing/production-summary
      const prodRes = await makeRequest("/api/billing/production-summary");
      assert.equal(prodRes.status, 200);
      assert.equal(prodRes.data.ok, true);
      assert.ok(prodRes.data.summary);
      assert.ok(prodRes.data.mode.includes("REAL PRODUCTION"));

      // 2. GET /api/leads/real-jobs
      const jobsRes = await makeRequest("/api/leads/real-jobs");
      assert.equal(jobsRes.status, 200);
      assert.equal(jobsRes.data.ok, true);
      assert.ok(jobsRes.data.jobs.length > 0);

      // 3. POST /api/leads/generate-pitch
      const pitchRes = await makeRequest("/api/leads/generate-pitch", "POST", {
        jobId: "JOB-LIVE-102",
        customPriceInr: 95000,
        customTimelineDays: 5
      });
      assert.equal(pitchRes.status, 200);
      assert.equal(pitchRes.data.ok, true);
      assert.equal(pitchRes.data.proposal.quoteInr, 95000);

      // 4. Create an invoice and test QR & HTML endpoints
      const invRes = await makeRequest("/api/revenue/invoices", "POST", {
        clientName: "Live HTTP Test Enterprise",
        serviceId: "WEBSITE_DEV",
        customAmountInr: 30000
      });
      assert.equal(invRes.status, 201);
      const invoiceId = invRes.data.invoice.id;

      // GET /api/billing/invoice/:id/qr
      const qrRes = await makeRequest(`/api/billing/invoice/${invoiceId}/qr`);
      assert.equal(qrRes.status, 200);
      assert.equal(qrRes.data.ok, true);
      assert.ok(qrRes.data.upiIntentUri.includes("upi://pay"));
      assert.ok(qrRes.data.qrSvg.includes("<svg"));

      // GET /api/billing/invoice/:id/html
      const htmlRes = await makeRequest(`/api/billing/invoice/${invoiceId}/html`);
      assert.equal(htmlRes.status, 200);
      assert.ok(htmlRes.data.includes("Live HTTP Test Enterprise"));
      assert.ok(htmlRes.data.includes("AIFIE ENTERPRISE SOLUTIONS"));

      // 5. POST /api/billing/verify-utr
      const utrRes = await makeRequest("/api/billing/verify-utr", "POST", {
        invoiceId,
        utrNumber: "SBIN2026092012345",
        amountInr: 30000,
        senderBank: "State Bank of India"
      });
      assert.equal(utrRes.status, 200);
      assert.equal(utrRes.data.ok, true);
      assert.equal(utrRes.data.settlement.mode, "PRODUCTION_REAL");
    } finally {
      if (originalLedger !== null) writeFileSync(prodLedgerPath, originalLedger, "utf8");
      if (originalAudit !== null) writeFileSync(auditPath, originalAudit, "utf8");
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
