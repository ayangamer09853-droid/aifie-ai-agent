function normalizeSymbol(symbol) {
  const normalized = String(symbol ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]+(?:\.[A-Z0-9]+)?$/.test(normalized)) throw new Error("invalid symbol");
  return normalized;
}

export function createManualQuoteProvider(quotes) {
  return {
    name: "manual_local",
    async getQuote(symbol) {
      const normalized = normalizeSymbol(symbol);
      const quote = quotes[normalized];
      if (!quote) throw new Error("no quote is available for this symbol");
      return { symbol: normalized, ...quote, provider: "manual_local" };
    }
  };
}

export async function getFreshQuote(provider, symbol, { maxAgeMs = 60_000, now = Date.now() } = {}) {
  const quote = await provider.getQuote(symbol);
  if (!Number.isFinite(quote.price) || quote.price <= 0) throw new Error("market data integrity: invalid price");
  const updatedAtMs = Date.parse(quote.updatedAt);
  if (!Number.isFinite(updatedAtMs)) throw new Error("market data integrity: missing timestamp");
  if (now - updatedAtMs > maxAgeMs) throw new Error("market data integrity: quote is stale");
  if (updatedAtMs - now > 30_000) throw new Error("market data integrity: quote timestamp is in the future");
  return { ...quote, ageMs: Math.max(0, now - updatedAtMs) };
}
