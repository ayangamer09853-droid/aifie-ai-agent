import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, promises as fsPromises } from "node:fs";
import { dirname } from "node:path";
import { syncRecordToSupabase } from "./supabase-cloud-db-connector.mjs";

const INITIAL_STATE = Object.freeze({ version: 3, orders: [], paper: {} });
const DEFAULT_MAX_ORDERS = 10000;

function validOrder(order) {
  if (!order || typeof order.id !== "string" || typeof order.symbol !== "string") return false;
  const side = String(order.side || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  const validSides = ["buy", "sell"];
  const validStatuses = ["simulated", "filled", "executed", "active", "submitted"];
  return validSides.includes(side) && Number.isInteger(order.quantity) && order.quantity > 0 && validStatuses.includes(status);
}

export function createStateStore(filePath, { debounceMs = 0, maxOrders = DEFAULT_MAX_ORDERS } = {}) {
  const backupPath = `${filePath.replace(/\.json$/, "")}.backup.json`;
  let dirCreated = false;
  let lastBackupTime = 0;
  let pendingSaveTimeout = null;
  let pendingStateToWrite = null;
  let cachedMemoryState = null;
  let asyncWriteQueue = Promise.resolve();

  function ensureDirectory() {
    if (!dirCreated) {
      mkdirSync(dirname(filePath), { recursive: true });
      dirCreated = true;
    }
  }

  function parseStateFile(targetPath) {
    const parsed = JSON.parse(readFileSync(targetPath, "utf8"));
    if (![1, 2, 3].includes(parsed?.version) || !Array.isArray(parsed.orders) || !parsed.orders.every(validOrder)) throw new Error("invalid state");
    return { version: 3, orders: parsed.orders, paper: parsed.paper ?? {} };
  }

  function read() {
    if (pendingStateToWrite) {
      return JSON.parse(JSON.stringify(pendingStateToWrite));
    }
    if (cachedMemoryState) {
      return JSON.parse(JSON.stringify(cachedMemoryState));
    }
    if (existsSync(filePath)) {
      try {
        const loaded = parseStateFile(filePath);
        cachedMemoryState = loaded;
        return JSON.parse(JSON.stringify(loaded));
      } catch (_corruptErr) {
        if (existsSync(backupPath)) {
          try {
            const backed = parseStateFile(backupPath);
            cachedMemoryState = backed;
            return JSON.parse(JSON.stringify(backed));
          } catch (_bErr) {}
        }
      }
    } else if (existsSync(backupPath)) {
      try {
        const backed = parseStateFile(backupPath);
        cachedMemoryState = backed;
        return JSON.parse(JSON.stringify(backed));
      } catch (_bErr) {}
    }
    const fresh = { ...INITIAL_STATE, orders: [] };
    cachedMemoryState = fresh;
    return JSON.parse(JSON.stringify(fresh));
  }

  function boundOrders(orders) {
    if (Array.isArray(orders) && orders.length > maxOrders) {
      return orders.slice(orders.length - maxOrders);
    }
    return orders ?? [];
  }

  function write(state) {
    ensureDirectory();
    const boundedState = {
      version: 3,
      orders: boundOrders(state.orders),
      paper: state.paper ?? {}
    };
    cachedMemoryState = boundedState;

    const now = Date.now();
    const temporaryPath = `${filePath}.tmp`;
    if (now - lastBackupTime > 30_000 && existsSync(filePath)) {
      try {
        copyFileSync(filePath, backupPath);
        lastBackupTime = now;
      } catch (_bErr) {}
    }
    writeFileSync(temporaryPath, JSON.stringify(boundedState, null, 2), "utf8");
    renameSync(temporaryPath, filePath);
    try {
      syncRecordToSupabase("aifie_state", { id: "latest_checkpoint", ...boundedState, updatedAt: new Date().toISOString() }).catch(() => {});
    } catch (_cErr) {}
    return boundedState;
  }

  async function writeAsync(state) {
    ensureDirectory();
    const boundedState = {
      version: 3,
      orders: boundOrders(state.orders),
      paper: state.paper ?? {}
    };
    cachedMemoryState = boundedState;

    asyncWriteQueue = asyncWriteQueue.then(async () => {
      const now = Date.now();
      const temporaryPath = `${filePath}.tmp`;
      if (now - lastBackupTime > 30_000 && existsSync(filePath)) {
        try {
          await fsPromises.copyFile(filePath, backupPath);
          lastBackupTime = now;
        } catch (_bErr) {}
      }
      await fsPromises.writeFile(temporaryPath, JSON.stringify(boundedState, null, 2), "utf8");
      await fsPromises.rename(temporaryPath, filePath);
      try {
        syncRecordToSupabase("aifie_state", { id: "latest_checkpoint", ...boundedState, updatedAt: new Date().toISOString() }).catch(() => {});
      } catch (_cErr) {}
    }).catch(() => {});

    return asyncWriteQueue;
  }

  function flush() {
    if (pendingSaveTimeout) {
      clearTimeout(pendingSaveTimeout);
      pendingSaveTimeout = null;
    }
    if (pendingStateToWrite) {
      const s = pendingStateToWrite;
      pendingStateToWrite = null;
      write(s);
    }
  }

  function debouncedSave(state) {
    const payload = { version: 3, orders: boundOrders(state.orders), paper: state.paper ?? {} };
    cachedMemoryState = payload;
    if (debounceMs <= 0) {
      return write(payload);
    }
    pendingStateToWrite = payload;
    if (!pendingSaveTimeout) {
      pendingSaveTimeout = setTimeout(() => {
        pendingSaveTimeout = null;
        if (pendingStateToWrite) {
          const s = pendingStateToWrite;
          pendingStateToWrite = null;
          write(s);
        }
      }, debounceMs);
      if (typeof pendingSaveTimeout.unref === "function") {
        pendingSaveTimeout.unref();
      }
    }
  }

  return {
    load: read,
    save: debouncedSave,
    saveAsync: writeAsync,
    flush,
    loadOrders: () => read().orders,
    appendOrder(order) {
      if (!validOrder(order)) throw new Error("refusing to persist an invalid paper order");
      flush();
      const state = read();
      state.orders.push(order);
      if (state.orders.length > maxOrders) {
        state.orders = state.orders.slice(state.orders.length - maxOrders);
      }
      write({ ...state, version: 3 });
      return order;
    },
    async appendOrderAsync(order) {
      if (!validOrder(order)) throw new Error("refusing to persist an invalid paper order");
      flush();
      const state = read();
      state.orders.push(order);
      if (state.orders.length > maxOrders) {
        state.orders = state.orders.slice(state.orders.length - maxOrders);
      }
      await writeAsync({ ...state, version: 3 });
      return order;
    },
    getStats: () => ({
      ordersCount: cachedMemoryState?.orders?.length || 0,
      maxOrders
    })
  };
}
