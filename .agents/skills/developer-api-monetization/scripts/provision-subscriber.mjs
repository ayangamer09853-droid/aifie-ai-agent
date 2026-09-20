#!/usr/bin/env node
/**
 * Developer API Subscriber Provisioner
 * 
 * Provisions an API key and subscription plan for a new developer.
 * Usage: node provision-subscriber.mjs <developerEmail> <tier>
 */

import { globalApiMarketplace } from "../../../../src/revenue/developer-api-marketplace.mjs";

const email = process.argv[2] || "dev.partner@enterprise.com";
const tier = process.argv[3] || "pro";

console.log(`[API-MARKETPLACE] Subscribing developer: ${email} to tier: ${tier.toUpperCase()}...`);

try {
  const result = globalApiMarketplace.subscribeDeveloper({
    developerEmail: email,
    planTier: tier
  });

  console.log(`[API-MARKETPLACE] SUCCESS!`);
  console.log(`- API Key:        ${result.apiKey}`);
  console.log(`- Plan:           ${result.plan.name}`);
  console.log(`- Monthly Fee:    ₹${result.plan.priceInr.toLocaleString("en-IN")}`);
  console.log(`- Call Quota:     ${result.remainingCredits} calls/month`);
  console.log(`- Expires At:     ${result.expiresAt}`);
  console.log(`\nExample Curl Request:`);
  console.log(`curl -X POST http://127.0.0.1:8787/api/marketplace/service/crypto-arbitrage \\`);
  console.log(`  -H "x-api-key: ${result.apiKey}" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"symbol": "BTC/USDT"}'`);
} catch (err) {
  console.error(`[API-MARKETPLACE] Error:`, err.message);
  process.exit(1);
}
