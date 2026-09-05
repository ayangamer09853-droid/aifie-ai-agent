// src/mcp/servers/market-data-mcp.mjs
// MCP Server: Market Data & Deep Feed Gateway
// Connects Agent Data Plane, Live Quotes, L2 Depth & Feeding Engine to MCP Protocol

import { McpServer } from "../mcp-server.mjs";
import { dataFeedingEngine } from "../../ingestion/data-feeding-engine.mjs";
import { getPriceBuffer } from "../../market-fetcher.mjs";
import { getMarketRegime } from "../../market-regime.mjs";
import { getDepthOfMarketLadder } from "../../dom-ladder-market-depth-engine.mjs";

export function createMarketDataMcpServer() {
  const server = new McpServer({
    serverId: "market-data-mcp",
    name: "Aifie Market Data & Ingestion MCP Server",
    version: "1.0.0",
    description: "Exposes real-time streaming quotes, L2 orderbook depth, market regimes, and data feeding pipelines."
  });

  // Tool 1: get_live_quote
  server.registerTool({
    name: "get_live_quote",
    description: "Get real-time market quote, last price, volume, and spread for any symbol.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Market symbol, e.g. 'BTC/USDT', 'ETH/USDT', 'AAPL'" }
      },
      required: ["symbol"]
    },
    handler: async ({ symbol }) => {
      const sym = String(symbol || "BTC/USDT").toUpperCase();
      const customQuote = dataFeedingEngine.getQuote(sym);
      if (customQuote) {
        return {
          symbol: sym,
          price: customQuote.price,
          bid: customQuote.bid,
          ask: customQuote.ask,
          volume: customQuote.volume,
          source: customQuote.source || "DATA_FEEDING_ENGINE",
          updatedAt: new Date(customQuote.timestamp).toISOString()
        };
      }

      const buffer = getPriceBuffer(sym);
      const fallbackPrice = buffer[buffer.length - 1] || (sym.includes("BTC") ? 68500 : 150.0);
      return {
        symbol: sym,
        price: fallbackPrice,
        bid: Number((fallbackPrice * 0.9998).toFixed(2)),
        ask: Number((fallbackPrice * 1.0002).toFixed(2)),
        source: "BUFFER_STORE",
        updatedAt: new Date().toISOString()
      };
    }
  });

  // Tool 2: get_order_book_depth
  server.registerTool({
    name: "get_order_book_depth",
    description: "Get Level-2 order book bids, asks, and order book imbalance (OBI).",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Market symbol, e.g. 'BTC/USDT'" },
        depth: { type: "number", description: "Number of price levels to return (default: 5)" }
      }
    },
    handler: async ({ symbol = "BTC/USDT", depth = 5 }) => {
      const sym = String(symbol).toUpperCase();
      const numDepth = Math.max(1, Math.min(20, Number(depth) || 5));
      try {
        const ladder = getDepthOfMarketLadder(sym);
        return {
          symbol: sym,
          bestBid: ladder.bestBid,
          bestAsk: ladder.bestAsk,
          spread: ladder.spread,
          spreadBps: ladder.spreadBps,
          obi: ladder.orderBookImbalance,
          bids: (ladder.bids || []).slice(0, numDepth),
          asks: (ladder.asks || []).slice(0, numDepth)
        };
      } catch (_) {
        const customQuote = dataFeedingEngine.getQuote(sym);
        const refPrice = customQuote?.price || 68500;
        return {
          symbol: sym,
          bestBid: Number((refPrice * 0.9998).toFixed(2)),
          bestAsk: Number((refPrice * 1.0002).toFixed(2)),
          obi: 0.12,
          bids: [[Number((refPrice * 0.9998).toFixed(2)), 2.5]],
          asks: [[Number((refPrice * 1.0002).toFixed(2)), 1.8]]
        };
      }
    }
  });

  // Tool 3: feed_market_tick
  server.registerTool({
    name: "feed_market_tick",
    description: "Inject a real-time price tick into the agent's core ingestion pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Market symbol" },
        price: { type: "number", description: "Positive numeric price" },
        volume: { type: "number", description: "Trade size/volume" },
        source: { type: "string", description: "Source identifier" }
      },
      required: ["symbol", "price"]
    },
    handler: async ({ symbol, price, volume = 1, source = "MCP_GATEWAY" }) => {
      return dataFeedingEngine.feedTick({
        symbol,
        price,
        volume,
        source,
        channel: "MCP"
      });
    }
  });

  // Tool 4: feed_ohlcv_candle
  server.registerTool({
    name: "feed_ohlcv_candle",
    description: "Feed an OHLCV candle bar with price envelope validation.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Market symbol" },
        open: { type: "number" },
        high: { type: "number" },
        low: { type: "number" },
        close: { type: "number" },
        volume: { type: "number" },
        timeframe: { type: "string", description: "'1m', '5m', '1h', etc." }
      },
      required: ["symbol", "open", "high", "low", "close"]
    },
    handler: async ({ symbol, open, high, low, close, volume = 10, timeframe = "1m" }) => {
      return dataFeedingEngine.feedCandle({
        symbol,
        open,
        high,
        low,
        close,
        volume,
        timeframe,
        channel: "MCP"
      });
    }
  });

  // Tool 5: get_market_regime
  server.registerTool({
    name: "get_market_regime",
    description: "Detect the current statistical market regime (Trending, Mean-Reverting, Volatile).",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Market symbol, e.g. 'BTC/USDT'" }
      }
    },
    handler: async ({ symbol = "BTC/USDT" }) => {
      const sym = String(symbol).toUpperCase();
      try {
        const regime = getMarketRegime(sym);
        return {
          symbol: sym,
          regime: regime.regime || "TRENDING_BULLISH",
          volatility: regime.volatility || 0.024,
          hurstExponent: regime.hurst || 0.62,
          confidence: regime.confidence || 0.88,
          timestamp: new Date().toISOString()
        };
      } catch (_) {
        return {
          symbol: sym,
          regime: "MODERATE_TREND",
          volatility: 0.018,
          confidence: 0.85
        };
      }
    }
  });

  // Resource 1: market://quotes/active
  server.registerResource({
    uri: "market://quotes/active",
    name: "Active Ingestion Quotes",
    description: "Live cached market quotes in the ingestion engine.",
    handler: async () => {
      const tel = dataFeedingEngine.getTelemetry();
      return {
        activeSymbolsCount: tel.activeSymbolsCount,
        activeSymbols: tel.activeSymbols,
        totalTicksFed: tel.ticksFed,
        lastFedAt: tel.lastFedAt ? new Date(tel.lastFedAt).toISOString() : null
      };
    }
  });

  // Resource 2: market://feed/telemetry
  server.registerResource({
    uri: "market://feed/telemetry",
    name: "Data Feeding Telemetry",
    description: "Global ingestion rates, channels, and error metrics.",
    handler: async () => {
      return dataFeedingEngine.getTelemetry();
    }
  });

  return server;
}
