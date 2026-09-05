// src/mcp/servers/execution-broker-mcp.mjs
// MCP Server: Execution & Broker Gateway
// Connects Order Routing, Smart Order Router, Positions, and Paper Execution to MCP

import { McpServer } from "../mcp-server.mjs";
import { createPaperState, placePaperOrder, accountSnapshot, setQuote } from "../../paper-engine.mjs";
import { dataFeedingEngine } from "../../ingestion/data-feeding-engine.mjs";

// Dedicated execution state for MCP Broker
const brokerPaperState = createPaperState();
brokerPaperState.risk.maxPositionNotional = 100000;

export function getMcpBrokerState() {
  return brokerPaperState;
}

export function createExecutionBrokerMcpServer() {
  const server = new McpServer({
    serverId: "execution-broker-mcp",
    name: "Aifie Sovereign Execution & Broker MCP Server",
    version: "1.0.0",
    description: "Executes paper trading orders, Smart Order Routing (SOR), position management, and account snapshots."
  });

  // Tool 1: place_paper_order
  server.registerTool({
    name: "place_paper_order",
    description: "Submit a paper order with slippage modeling, commissions, and risk checks.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Symbol to trade, e.g. 'BTC/USDT'" },
        side: { type: "string", enum: ["buy", "sell"], description: "Order direction" },
        quantity: { type: "integer", minimum: 1, maximum: 1000, description: "Quantity in whole units" },
        price: { type: "number", description: "Optional reference limit/market price" }
      },
      required: ["symbol", "side", "quantity"]
    },
    handler: async ({ symbol, side, quantity, price }) => {
      const sym = String(symbol).toUpperCase();
      const numQty = parseInt(quantity, 10);
      const normalizedSide = String(side).toLowerCase();

      // Ensure fresh quote in paper state
      let fillRefPrice = price;
      if (!fillRefPrice) {
        const customQuote = dataFeedingEngine.getQuote(sym);
        fillRefPrice = customQuote?.price || (sym.includes("BTC") ? 68500 : 150);
      }
      setQuote(brokerPaperState, { symbol: sym, price: fillRefPrice, source: "MCP_BROKER_GATEWAY" });

      try {
        const fill = placePaperOrder(brokerPaperState, {
          symbol: sym,
          side: normalizedSide,
          quantity: numQty
        });
        const snap = accountSnapshot(brokerPaperState);
        return {
          success: true,
          fill,
          accountAfter: {
            cash: snap.cash,
            equity: snap.equity,
            drawdownPercent: snap.drawdownPercent,
            positions: snap.positions
          }
        };
      } catch (err) {
        return {
          success: false,
          isError: true,
          error: err.message
        };
      }
    }
  });

  // Tool 2: get_account_balance
  server.registerTool({
    name: "get_account_balance",
    description: "Inspect cash, equity, realized PnL, and current drawdown of the broker account.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const snap = accountSnapshot(brokerPaperState);
      return {
        startingCash: snap.startingCash,
        cash: snap.cash,
        marketValue: snap.marketValue,
        equity: snap.equity,
        realizedPnl: snap.realizedPnl,
        drawdownPercent: Number((snap.drawdownPercent || 0).toFixed(2)),
        peakEquity: snap.peakEquity,
        timestamp: new Date().toISOString()
      };
    }
  });

  // Tool 3: get_open_positions
  server.registerTool({
    name: "get_open_positions",
    description: "Retrieve all active held positions and unrealized profit & loss.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const snap = accountSnapshot(brokerPaperState);
      const positionsList = Object.entries(snap.positions || {}).map(([sym, pos]) => {
        const currentPrice = brokerPaperState.quotes[sym]?.price || pos.averagePrice;
        const unrealizedPnl = (currentPrice - pos.averagePrice) * pos.quantity;
        return {
          symbol: sym,
          quantity: pos.quantity,
          averagePrice: Number(pos.averagePrice.toFixed(2)),
          currentPrice: Number(currentPrice.toFixed(2)),
          marketValue: Number((pos.quantity * currentPrice).toFixed(2)),
          unrealizedPnl: Number(unrealizedPnl.toFixed(2))
        };
      });

      return {
        totalPositionsCount: positionsList.length,
        positions: positionsList
      };
    }
  });

  // Tool 4: route_smart_order
  server.registerTool({
    name: "route_smart_order",
    description: "Simulate institutional Smart Order Router (SOR) multi-venue liquidity splitting.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["buy", "sell"] },
        quantity: { type: "number" }
      },
      required: ["symbol", "side", "quantity"]
    },
    handler: async ({ symbol = "BTC/USDT", side = "buy", quantity = 1 }) => {
      const sym = String(symbol).toUpperCase();
      const venues = ["BINANCE", "COINBASE", "KRAKEN", "OKX"];
      const slices = venues.map((v, i) => ({
        venue: v,
        allocatedQuantity: Number((quantity * (i === 0 ? 0.4 : 0.2)).toFixed(4)),
        expectedSlippageBps: Number((1.2 + (i * 0.4)).toFixed(1)),
        feeBps: 2.0
      }));

      return {
        symbol: sym,
        side,
        totalQuantity: quantity,
        optimalRoute: "MULTI_VENUE_TWAP_SOR",
        venuesRoutedCount: venues.length,
        slices,
        compositeExpectedSlippageBps: 1.6
      };
    }
  });

  // Resource 1: broker://account/snapshot
  server.registerResource({
    uri: "broker://account/snapshot",
    name: "Broker Account Snapshot",
    description: "Complete real-time portfolio balance, cash, equity, and positions.",
    handler: async () => {
      return accountSnapshot(brokerPaperState);
    }
  });

  return server;
}
