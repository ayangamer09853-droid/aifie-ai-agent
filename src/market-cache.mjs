/**
 * Market Data LRU Cache with TTL & SingleFlight Request Deduplication
 * Prevents API quota exhaustion and avoids latency spikes during high-concurrency quote requests.
 */

export class MarketCache {
  constructor({ defaultTtlMs = 5000, maxEntries = 500 } = {}) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this.cache = new Map(); // key -> { value, expiresAt }
    this.inFlight = new Map(); // key -> Promise
    this.stats = {
      hits: 0,
      misses: 0,
      deduped: 0
    };
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  async getOrFetch(key, fetcher, ttlMs = this.defaultTtlMs) {
    const cached = this.get(key);
    if (cached !== null) return cached;

    // SingleFlight: deduplicate concurrent in-flight requests for the same key
    if (this.inFlight.has(key)) {
      this.stats.deduped++;
      return this.inFlight.get(key);
    }

    this.stats.misses++;
    const promise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, ttlMs);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }

  getTelemetry() {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      inFlightCount: this.inFlight.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      deduped: this.stats.deduped,
      hitRate: total > 0 ? (this.stats.hits / total).toFixed(3) : "0.000"
    };
  }
}

export const marketCache = new MarketCache({ defaultTtlMs: 5000, maxEntries: 1000 });
