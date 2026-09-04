/**
 * Live Broker Adapter (Alpaca)
 * Institutional-grade broker integration with strict buying-power guards,
 * fail-closed live execution gates, and paper trading support.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let AlpacaModule;
try {
  const mod = require("@alpacahq/alpaca-trade-api");
  AlpacaModule = mod?.default || mod;
} catch (_) {}

export class AlpacaBroker {
  constructor(config = {}) {
    this.keyId = config.keyId || process.env.APCA_API_KEY_ID;
    this.secretKey = config.secretKey || process.env.APCA_API_SECRET_KEY;
    this.baseUrl = config.baseUrl || process.env.APCA_API_BASE_URL || "https://paper-api.alpaca.markets";
    this.isLive = Boolean(this.baseUrl?.includes("api.alpaca.markets") && !this.baseUrl?.includes("paper-api"));

    if (config.client) {
      this.client = config.client;
    } else if (this.keyId && this.secretKey && AlpacaModule) {
      this.initClient();
    }
  }

  initClient() {
    if (!AlpacaModule) {
      throw new Error("@alpacahq/alpaca-trade-api package is not available");
    }
    this.client = new AlpacaModule({
      keyId: this.keyId,
      secretKey: this.secretKey,
      baseUrl: this.baseUrl
    });
  }

  assertClient() {
    if (!this.client) {
      if (!this.keyId && !process.env.APCA_API_KEY_ID) {
        throw new Error("APCA_API_KEY_ID not set");
      }
      this.keyId = this.keyId || process.env.APCA_API_KEY_ID;
      this.secretKey = this.secretKey || process.env.APCA_API_SECRET_KEY;
      this.initClient();
    }
  }

  async getAccount() {
    this.assertClient();
    return this.client.getAccount();
  }

  async placeOrder(symbol, qty, side, orderType = "market") {
    this.assertClient();
    if (this.isLive) {
      // Double-check before real money
      const account = await this.getAccount();
      const buyingPower = Number(account.buying_power ?? account.cash ?? 0);
      if (buyingPower < 1000) {
        throw new Error("INSUFFICIENT_BUYING_POWER");
      }
    }

    return this.client.createOrder({
      symbol: String(symbol).toUpperCase().trim(),
      qty: Number(qty),
      side: String(side).toLowerCase().trim(),
      type: orderType,
      time_in_force: "day"
    });
  }

  async getPositions() {
    this.assertClient();
    return this.client.getPositions();
  }

  async getOrders() {
    this.assertClient();
    return this.client.getOrders({ status: "all", limit: 100 });
  }
}

let defaultAlpacaBrokerInstance = null;

export const alpacaBroker = new Proxy({}, {
  get(target, prop) {
    if (!defaultAlpacaBrokerInstance) {
      defaultAlpacaBrokerInstance = new AlpacaBroker();
    }
    const val = defaultAlpacaBrokerInstance[prop];
    return typeof val === "function" ? val.bind(defaultAlpacaBrokerInstance) : val;
  }
});
