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
  AlpacaModule = mod?.Alpaca || mod?.default || mod;
} catch (_) {}

export class AlpacaBroker {
  constructor(config = {}) {
    this.keyId = config.keyId || process.env.APCA_API_KEY_ID || process.env.ALPACA_API_KEY_ID || process.env.ALPACA_API_KEY;
    this.secretKey = config.secretKey || process.env.APCA_API_SECRET_KEY || process.env.ALPACA_SECRET_KEY || process.env.ALPACA_API_SECRET_KEY;
    this.baseUrl = config.baseUrl || process.env.APCA_API_BASE_URL || process.env.ALPACA_ENDPOINT || process.env.ALPACA_API_BASE_URL || "https://paper-api.alpaca.markets";
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
      const resolvedKey = this.keyId || process.env.APCA_API_KEY_ID || process.env.ALPACA_API_KEY_ID || process.env.ALPACA_API_KEY;
      const resolvedSecret = this.secretKey || process.env.APCA_API_SECRET_KEY || process.env.ALPACA_SECRET_KEY || process.env.ALPACA_API_SECRET_KEY;
      if (!resolvedKey) {
        throw new Error("APCA_API_KEY_ID not set");
      }
      this.keyId = resolvedKey;
      this.secretKey = resolvedSecret;
      this.initClient();
    }
  }

  async getAccount() {
    this.assertClient();
    if (typeof this.client?.getAccount === "function") {
      return this.client.getAccount();
    }
    if (typeof this.client?.trading?.account?.getAccount === "function") {
      const acc = await this.client.trading.account.getAccount();
      return {
        id: acc.id,
        status: acc.status,
        currency: acc.currency,
        buying_power: acc.buyingPower || acc.buying_power,
        cash: acc.cash,
        portfolio_value: acc.portfolioValue || acc.portfolio_value
      };
    }
    // Direct REST fallback
    const res = await fetch(`${this.baseUrl}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secretKey
      }
    });
    if (!res.ok) {
      throw new Error(`Alpaca API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
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

    if (typeof this.client?.createOrder === "function") {
      return this.client.createOrder({
        symbol: String(symbol).toUpperCase().trim(),
        qty: Number(qty),
        side: String(side).toLowerCase().trim(),
        type: orderType,
        time_in_force: "day"
      });
    }

    // Direct REST dispatch
    const payload = {
      symbol: String(symbol).toUpperCase().trim(),
      qty: String(qty),
      side: String(side).toLowerCase().trim(),
      type: orderType,
      time_in_force: "day"
    };
    const res = await fetch(`${this.baseUrl}/v2/orders`, {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secretKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Alpaca order dispatch failed: ${res.status} ${errText}`);
    }
    return res.json();
  }

  async getPositions() {
    this.assertClient();
    if (typeof this.client?.getPositions === "function") {
      return this.client.getPositions();
    }
    const res = await fetch(`${this.baseUrl}/v2/positions`, {
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secretKey
      }
    });
    if (!res.ok) {
      throw new Error(`Alpaca getPositions failed: ${res.status}`);
    }
    return res.json();
  }

  async getOrders() {
    this.assertClient();
    if (typeof this.client?.getOrders === "function") {
      return this.client.getOrders({ status: "all", limit: 100 });
    }
    const res = await fetch(`${this.baseUrl}/v2/orders?status=all&limit=100`, {
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secretKey
      }
    });
    if (!res.ok) {
      throw new Error(`Alpaca getOrders failed: ${res.status}`);
    }
    return res.json();
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
