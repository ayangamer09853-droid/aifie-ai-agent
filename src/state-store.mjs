import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { syncRecordToSupabase } from "./supabase-cloud-db-connector.mjs";

const INITIAL_STATE = Object.freeze({ version: 3, orders: [], paper: {} });

function validOrder(order) {
  if (!order || typeof order.id !== "string" || typeof order.symbol !== "string") return false;
  const side = String(order.side || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  const validSides = ["buy", "sell"];
  const validStatuses = ["simulated", "filled", "executed", "active", "submitted"];
  return validSides.includes(side) && Number.isInteger(order.quantity) && order.quantity > 0 && validStatuses.includes(status);
}

export function createStateStore(filePath) {
  const backupPath = `${filePath.replace(/\.json$/, "")}.backup.json`;

  function parseStateFile(targetPath) {
    const parsed = JSON.parse(readFileSync(targetPath, "utf8"));
    if (![1, 2, 3].includes(parsed?.version) || !Array.isArray(parsed.orders) || !parsed.orders.every(validOrder)) throw new Error("invalid state");
    return { version: 3, orders: parsed.orders, paper: parsed.paper ?? {} };
  }

  function read() {
    if (existsSync(filePath)) {
      try {
        return parseStateFile(filePath);
      } catch (_corruptErr) {
        if (existsSync(backupPath)) {
          try { return parseStateFile(backupPath); } catch (_bErr) {}
        }
      }
    } else if (existsSync(backupPath)) {
      try { return parseStateFile(backupPath); } catch (_bErr) {}
    }
    return { ...INITIAL_STATE, orders: [] };
  }

  function write(state) {
    mkdirSync(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    if (existsSync(filePath)) {
      try { copyFileSync(filePath, backupPath); } catch (_bErr) {}
    }
    writeFileSync(temporaryPath, JSON.stringify(state, null, 2), "utf8");
    renameSync(temporaryPath, filePath);
    try {
      syncRecordToSupabase("aifie_state", { id: "latest_checkpoint", ...state, updatedAt: new Date().toISOString() }).catch(() => {});
    } catch (_cErr) {}
  }

  return {
    load: read,
    save(state) { write({ version: 3, orders: state.orders ?? [], paper: state.paper ?? {} }); },
    loadOrders: () => read().orders,
    appendOrder(order) {
      if (!validOrder(order)) throw new Error("refusing to persist an invalid paper order");
      const state = read();
      state.orders.push(order);
      write({ ...state, version: 3 });
      return order;
    }
  };
}
