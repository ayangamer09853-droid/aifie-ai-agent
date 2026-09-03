import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStateStore } from "../src/state-store.mjs";

const order = { id: "paper-1", symbol: "AAPL", side: "buy", quantity: 2, status: "simulated" };

test("paper orders survive a store reload", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "aifie-state-")), "state.json");
  createStateStore(filePath).appendOrder(order);
  assert.deepEqual(createStateStore(filePath).loadOrders(), [order]);
});

test("corrupt state fails closed to no paper orders", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "aifie-state-")), "state.json");
  writeFileSync(filePath, "not-json", "utf8");
  assert.deepEqual(createStateStore(filePath).loadOrders(), []);
});

test("orders with filled status or uppercase side survive a store reload", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "aifie-state-")), "state.json");
  const filledOrder = { id: "paper-2", symbol: "BTC/USDT", side: "BUY", quantity: 1, status: "FILLED" };
  const store = createStateStore(filePath);
  store.appendOrder(filledOrder);
  assert.deepEqual(createStateStore(filePath).loadOrders(), [filledOrder]);
});
