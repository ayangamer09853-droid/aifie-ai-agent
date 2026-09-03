const DEFAULT_ACCOUNT = Object.freeze({ startingCash: 100000, cash: 100000, realizedPnl: 0, peakEquity: 100000, positions: {} });
const DEFAULT_RISK = Object.freeze({ maxPositionNotional: 10000, maxDailyLoss: 2000, maxDrawdownPercent: 10, maxQuoteAgeMs: 60000, commissionRate: 0.0005, slippageRate: 0.0005 });

export function createPaperState(saved = {}) {
  return {
    account: { ...DEFAULT_ACCOUNT, ...(saved.account ?? {}), positions: { ...(saved.account?.positions ?? {}) } },
    quotes: { ...(saved.quotes ?? {}) },
    risk: { ...DEFAULT_RISK, ...(saved.risk ?? {}) },
    journal: Array.isArray(saved.journal) ? saved.journal : []
  };
}

function validateQuote(symbol, price) {
  const normalized = String(symbol ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]+(?:[\.\/\-_][A-Z0-9]+)*$/.test(normalized)) throw new Error("invalid symbol");
  if (!Number.isFinite(price) || price <= 0) throw new Error("price must be a positive number");
  return normalized;
}

export function setQuote(state, { symbol, price, source = "manual" }) {
  const normalized = validateQuote(symbol, price);
  state.quotes[normalized] = { price, source, updatedAt: new Date().toISOString() };
  return state.quotes[normalized];
}

export function accountSnapshot(state) {
  const marketValue = Object.entries(state.account.positions).reduce((total, [symbol, position]) => total + position.quantity * (state.quotes[symbol]?.price ?? position.averagePrice), 0);
  const equity = state.account.cash + marketValue;
  const drawdownPercent = state.account.peakEquity ? ((state.account.peakEquity - equity) / state.account.peakEquity) * 100 : 0;
  return { ...state.account, marketValue, equity, drawdownPercent };
}

export function placePaperOrder(state, { symbol, side, quantity }) {
  const normalizedSide = String(side ?? "").trim().toLowerCase();
  if (!["buy", "sell"].includes(normalizedSide)) throw new Error("side must be buy or sell");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) throw new Error("quantity must be an integer between 1 and 1000");
  const normalized = validateQuote(symbol, state.quotes[String(symbol).trim().toUpperCase()]?.price);
  const snapshot = accountSnapshot(state);
  if (snapshot.drawdownPercent >= state.risk.maxDrawdownPercent) throw new Error("paper risk gate: maximum drawdown reached");
  const quote = state.quotes[normalized];
  const quoteTime = Date.parse(quote.updatedAt);
  if (!Number.isFinite(quoteTime) || Date.now() - quoteTime > state.risk.maxQuoteAgeMs) throw new Error("paper risk gate: quote is stale or missing a timestamp");
  const fillPrice = side === "buy" ? quote.price * (1 + state.risk.slippageRate) : quote.price * (1 - state.risk.slippageRate);
  const notional = fillPrice * quantity;
  const commission = notional * state.risk.commissionRate;
  const position = state.account.positions[normalized] ?? { quantity: 0, averagePrice: 0 };
  if (side === "buy") {
    if (notional > state.risk.maxPositionNotional) throw new Error("paper risk gate: position notional exceeds limit");
    if (notional + commission > state.account.cash) throw new Error("paper risk gate: insufficient cash");
    const nextQuantity = position.quantity + quantity;
    position.averagePrice = ((position.quantity * position.averagePrice) + notional) / nextQuantity;
    position.quantity = nextQuantity;
    state.account.positions[normalized] = position;
    state.account.cash -= notional + commission;
  } else {
    if (position.quantity < quantity) throw new Error("paper risk gate: cannot sell more than the held quantity");
    position.quantity -= quantity;
    state.account.cash += notional - commission;
    state.account.realizedPnl += (fillPrice - position.averagePrice) * quantity - commission;
    if (!position.quantity) delete state.account.positions[normalized];
  }
  const after = accountSnapshot(state);
  state.account.peakEquity = Math.max(state.account.peakEquity, after.equity);
  const fill = { symbol: normalized, side, quantity, status: "simulated", mode: "paper", quotedPrice: quote.price, fillPrice, commission, slippageRate: state.risk.slippageRate, source: quote.source, createdAt: new Date().toISOString() };
  state.journal.push({ type: "paper_fill", fill, account: accountSnapshot(state) });
  return fill;
}
