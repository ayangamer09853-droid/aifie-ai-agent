import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { resolve } from "node:path";
import { unlinkSync, existsSync } from "node:fs";

import { InstantDigitalStorefront, DIGITAL_STORE_PRODUCTS } from "../src/revenue/instant-digital-storefront.mjs";
import { HighVelocityLeadSwarm } from "../src/revenue/high-velocity-lead-swarm.mjs";
import { DeveloperApiMarketplace, MARKETPLACE_PLANS } from "../src/revenue/developer-api-marketplace.mjs";
import { AffiliateReferralEngine } from "../src/revenue/affiliate-referral-engine.mjs";
import { app } from "../server.mjs";

test("AIFIE High-Velocity Revenue Multiplier Engine Test Suite (v2.0.0)", async (t) => {
  const testStorePath = resolve(process.cwd(), "data", "test-storefront-orders.json");
  const testSwarmPath = resolve(process.cwd(), "data", "test-swarm-leads.json");
  const testMarketPath = resolve(process.cwd(), "data", "test-marketplace.json");
  const testAffPath = resolve(process.cwd(), "data", "test-affiliate.json");

  t.after(() => {
    [testStorePath, testSwarmPath, testMarketPath, testAffPath].forEach(p => {
      if (existsSync(p)) try { unlinkSync(p); } catch {}
    });
  });

  // 1. Instant Digital Storefront & Download Token Engine
  await t.test("1. Instant Digital Storefront: Checkout, UPI QR & HMAC Download Token", () => {
    if (existsSync(testStorePath)) unlinkSync(testStorePath);
    const store = new InstantDigitalStorefront(testStorePath);

    const products = store.getProducts();
    assert.equal(products.length, 5, "Must have exactly 5 curated instant digital assets");
    assert.equal(products[0].id, "PROD-VAULT-01");

    // Checkout Session
    const session = store.createCheckoutSession({
      productId: "PROD-VAULT-01",
      customerEmail: "buyer@enterprise.com"
    });

    assert.ok(session.orderId.startsWith("ORD-"));
    assert.equal(session.amountInr, 499);
    assert.ok(session.upiIntentUri.includes("upi://pay"));
    assert.ok(session.qrSvg.includes("<svg"));

    // Confirm Payment
    const confirmation = store.confirmPayment(session.orderId, {
      transactionRef: "UPI-REAL-88992211",
      method: "UPI / PhonePe"
    });

    assert.equal(confirmation.success, true);
    assert.equal(confirmation.status, "PAID");
    assert.ok(confirmation.downloadToken.startsWith("DL-"));
    assert.ok(confirmation.downloadUrl.includes(confirmation.downloadToken));

    // Deliver Asset Payload
    const delivery = store.validateAndDeliverAsset(confirmation.downloadToken);
    assert.equal(delivery.valid, true);
    assert.equal(delivery.orderId, session.orderId);
    assert.equal(delivery.product.id, "PROD-VAULT-01");
    assert.ok(delivery.assetPayload.contents.length >= 4);

    // Tampered Token Rejection
    const tamperedToken = `${confirmation.downloadToken}corrupted`;
    const invalidDelivery = store.validateAndDeliverAsset(tamperedToken);
    assert.equal(invalidDelivery.valid, false);
  });

  // 2. High-Velocity Lead Swarm & PoC Prototypes
  await t.test("2. High-Velocity Lead Swarm: Multi-Channel Aggregator & Attached PoC Prototypes", () => {
    if (existsSync(testSwarmPath)) unlinkSync(testSwarmPath);
    const swarm = new HighVelocityLeadSwarm(testSwarmPath);

    const opps = swarm.getOpportunities();
    assert.ok(opps.length >= 5, "Must aggregate opportunities across multiple networks");

    // Test AgriTech PoC prototype generation
    const agriPoC = swarm.generateProofOfConceptPrototype("SWARM-JOB-202");
    assert.equal(agriPoC.pocType, "INTERACTIVE_AGRITECH_ALERT_ENGINE");
    assert.ok(agriPoC.preview.includes("TEMPERATURE SPIKE"));

    // Test SEO PoC prototype generation
    const seoPoC = swarm.generateProofOfConceptPrototype("SWARM-JOB-203");
    assert.equal(seoPoC.pocType, "CORE_WEB_VITALS_JSON_LD_SCHEMA");
    assert.ok(seoPoC.preview.includes("application/ld+json"));

    // Compile Tailored Bid with PoC
    const bid = swarm.compileTailoredBidWithPoc("SWARM-JOB-202", {
      customQuoteInr: 145000,
      customTimelineDays: 5
    });

    assert.equal(bid.oppId, "SWARM-JOB-202");
    assert.equal(bid.quoteInr, 145000);
    assert.ok(bid.pitchText.includes(agriPoC.preview));
    assert.ok(bid.pitchText.includes("Aifie Enterprise Solutions"));

    // Compile Batch Bids for All Open Opportunities
    const batch = swarm.compileBatchBids();
    assert.equal(batch.length, opps.length);
  });

  // 3. Developer Micro-SaaS API Marketplace
  await t.test("3. Developer API Marketplace: Subscription Tiers & 5 Micro-Services", () => {
    if (existsSync(testMarketPath)) unlinkSync(testMarketPath);
    const mkt = new DeveloperApiMarketplace(testMarketPath);

    const plans = mkt.getPlans();
    assert.equal(plans.length, 3);
    assert.equal(plans[0].id, "PLAN_STARTER");

    // Subscribe Developer to Pro Tier
    const sub = mkt.subscribeDeveloper({
      developerEmail: "dev@fintech.io",
      planTier: "PRO"
    });

    assert.equal(sub.success, true);
    assert.ok(sub.apiKey.startsWith("aifie_mkt_"));
    assert.equal(sub.remainingCredits, 2500);

    // Authenticate & Deduct 1 credit
    const auth = mkt.authenticateAndDeduct(sub.apiKey);
    assert.equal(auth.authorized, true);
    assert.equal(auth.remainingCredits, 2499);

    // Test 5 Micro-Services
    const crypto = mkt.executeCryptoArbitrageScanner({ symbol: "ETH/USDT" });
    assert.equal(crypto.endpoint, "CRYPTO_ARBITRAGE_SCANNER");
    assert.ok(crypto.spreads.length >= 2);

    const lead = mkt.executeLeadEnrichment({ domain: "razorpay.com" });
    assert.equal(lead.endpoint, "B2B_LEAD_ENRICHMENT");
    assert.equal(lead.mxRecordsValid, true);

    const seo = mkt.executeCompetitorBacklinkGap({ targetDomain: "stripe.com" });
    assert.equal(seo.endpoint, "COMPETITOR_BACKLINK_GAP");
    assert.ok(seo.unmetBacklinkOpportunities.length >= 3);

    const agri = mkt.executeAgriClimateRiskIndex({ region: "Punjab" });
    assert.equal(agri.endpoint, "AGRI_CLIMATE_RISK_INDEX");
    assert.ok(agri.riskCompositeScore > 0);

    const ocr = mkt.executeInvoiceOcrExtractor({ rawText: "Total: 15000 INR Tax: 18%" });
    assert.equal(ocr.endpoint, "INVOICE_DOCUMENT_OCR");
    assert.equal(ocr.currency, "INR");
  });

  // 4. Viral Affiliate Referral Engine
  await t.test("4. Viral Affiliate Referral Engine: Tracking, 20% Commission & Attribution", () => {
    if (existsSync(testAffPath)) unlinkSync(testAffPath);
    const aff = new AffiliateReferralEngine(testAffPath, 20);

    // Register Partner
    const partner = aff.registerPartner({
      name: "Rahul Sharma",
      email: "rahul@techinfluencer.in",
      customSlug: "RAHUL20"
    });

    assert.equal(partner.id, "AFF_RAHUL20");
    assert.ok(partner.referralLink.includes("AFF_RAHUL20"));
    assert.equal(partner.commissionRatePct, 20);

    // Track Referral Click
    const click = aff.trackReferralClick("AFF_RAHUL20", "192.168.1.50");
    assert.equal(click.tracked, true);
    assert.equal(click.partner.totalClicks, 1);

    // Attribute Conversion (e.g. ₹50,000 enterprise contract)
    const attribution = aff.attributeConversion({
      affiliateId: "AFF_RAHUL20",
      orderOrInvoiceId: "INV-2026-0099",
      grossAmountInr: 50000,
      clientName: "Referred Corporate Client"
    });

    assert.equal(attribution.success, true);
    assert.equal(attribution.commissionInr, 10000, "20% of ₹50,000 must be ₹10,000");

    const stats = aff.getAffiliateStats("AFF_RAHUL20");
    assert.equal(stats.totalConversions, 1);
    assert.equal(stats.totalEarnedCommissionInr, 10000);
    assert.equal(stats.pendingPayoutInr, 10000);
  });

  // 5. Server REST HTTP Integration across all High-Velocity Engines
  await t.test("5. Server REST Endpoints: Storefront, Swarm, Marketplace & Affiliate HTTP Integration", async () => {
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
      // 1. GET /api/store/products
      const prodsRes = await makeRequest("/api/store/products");
      assert.equal(prodsRes.status, 200);
      assert.equal(prodsRes.data.ok, true);
      assert.ok(prodsRes.data.products.length >= 5);

      // 2. POST /api/store/checkout
      const checkoutRes = await makeRequest("/api/store/checkout", "POST", {
        productId: "PROD-VAULT-01",
        customerEmail: "liveclient@gmail.com"
      });
      assert.equal(checkoutRes.status, 201);
      assert.equal(checkoutRes.data.ok, true);
      const orderId = checkoutRes.data.session.orderId;

      // 3. POST /api/store/confirm-payment
      const confirmRes = await makeRequest("/api/store/confirm-payment", "POST", {
        orderId,
        transactionRef: "TXN-TEST-123",
        method: "UPI"
      });
      assert.equal(confirmRes.status, 200);
      assert.equal(confirmRes.data.ok, true);
      const dlToken = confirmRes.data.result.downloadToken;

      // 4. GET /api/store/download/:token
      const dlRes = await makeRequest(`/api/store/download/${dlToken}`);
      assert.equal(dlRes.status, 200);
      assert.equal(dlRes.data.ok, true);
      assert.equal(dlRes.data.delivery.product.id, "PROD-VAULT-01");

      // 5. GET /api/leads/swarm/opportunities
      const swarmRes = await makeRequest("/api/leads/swarm/opportunities");
      assert.equal(swarmRes.status, 200);
      assert.equal(swarmRes.data.ok, true);

      // 6. POST /api/leads/swarm/poc
      const pocRes = await makeRequest("/api/leads/swarm/poc", "POST", { jobId: "SWARM-JOB-201" });
      assert.equal(pocRes.status, 200);
      assert.ok(pocRes.data.poc.preview);

      // 7. GET /api/marketplace/plans
      const plansRes = await makeRequest("/api/marketplace/plans");
      assert.equal(plansRes.status, 200);
      assert.equal(plansRes.data.plans.length, 3);

      // 8. POST /api/marketplace/subscribe
      const subRes = await makeRequest("/api/marketplace/subscribe", "POST", {
        developerEmail: "apiuser@saas.com",
        planTier: "STARTER"
      });
      assert.equal(subRes.status, 201);
      const apiKey = subRes.data.subscription.apiKey;

      // 9. POST /api/marketplace/service/crypto-arbitrage (with x-api-key header)
      const apiRes = await makeRequest("/api/marketplace/service/crypto-arbitrage", "POST", { symbol: "SOL/USDT" }, { "x-api-key": apiKey });
      assert.equal(apiRes.status, 200);
      assert.equal(apiRes.data.ok, true);
      assert.ok(apiRes.data.creditsRemaining >= 0);

      // 10. POST /api/affiliate/register & GET /api/affiliate/stats
      const affRes = await makeRequest("/api/affiliate/register", "POST", {
        name: "Dev Ambassador",
        email: "ambassador@global.io",
        customSlug: "AMBASSADOR"
      });
      assert.equal(affRes.status, 201);
      const affId = affRes.data.partner.id;

      const affStats = await makeRequest(`/api/affiliate/stats?id=${affId}`);
      assert.equal(affStats.status, 200);
      assert.equal(affStats.data.stats.id, affId);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
