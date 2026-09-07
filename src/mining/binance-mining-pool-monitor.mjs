// @ts-check
/**
 * Binance Mining Pool & Stratum V1 TCP Monitor
 * Provides zero-dependency Stratum protocol connectivity, multi-pool health probes,
 * worker authorization (aifieming001.001), job telemetry, and automatic pool failover.
 */

import net from 'node:net';
import { EventEmitter } from 'node:events';

export class BinanceMiningPoolMonitor extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {string[]} [options.pools]
   * @param {string} [options.worker]
   * @param {string} [options.password]
   * @param {string} [options.algo]
   * @param {boolean} [options.autoReconnect]
   * @param {number} [options.reconnectIntervalMs]
   */
  constructor(options = {}) {
    super();

    this.pools = options.pools || [
      process.env.BINANCE_MINING_POOL_1 || 'stratum+tcp://sha256.poolbinance.com:443',
      process.env.BINANCE_MINING_POOL_2 || 'stratum+tcp://btc.poolbinance.com:1800',
      process.env.BINANCE_MINING_POOL_3 || 'stratum+tcp://bs.poolbinance.com:3333'
    ];

    this.worker = options.worker || process.env.BINANCE_MINING_WORKER || 'aifieming001.001';
    this.password = options.password || process.env.BINANCE_MINING_PASSWORD || '123456';
    this.algo = options.algo || process.env.BINANCE_MINING_ALGO || 'SHA256';
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectIntervalMs = options.reconnectIntervalMs || 5000;

    /** @type {net.Socket | null} */
    this.socket = null;
    /** @type {string | null} */
    this.activePool = null;
    this.activePoolIndex = 0;
    this.connectionState = 'DISCONNECTED'; // DISCONNECTED | CONNECTING | CONNECTED | AUTHORIZED | RECONNECTING
    this.isAuthorized = false;
    this.extranonce1 = null;
    this.extranonce2Size = 4;
    this.currentDifficulty = 0;
    this.lastJobId = null;
    this.lastJobReceivedAt = null;
    this.jobsReceived = 0;
    this.pingMs = null;
    this.lastPingAt = null;
    this.connectedAt = null;
    this.requestId = 1;
    /** @type {Map<number, { resolve: Function, reject: Function, method: string, sentAt: number }>} */
    this.pendingRequests = new Map();
    this.incomingBuffer = '';
    /** @type {string[]} */
    this.recentErrors = [];
    /** @type {NodeJS.Timeout | null} */
    this.reconnectTimer = null;
    /** @type {NodeJS.Timeout | null} */
    this.pingIntervalTimer = null;
    this.manualStop = false;
  }

  /**
   * Parse stratum+tcp://host:port or host:port
   * @param {string} rawUrl
   * @returns {{ host: string, port: number, raw: string }}
   */
  static parseStratumUrl(rawUrl) {
    let clean = (rawUrl || '').trim();
    if (clean.startsWith('stratum+tcp://')) {
      clean = clean.slice('stratum+tcp://'.length);
    } else if (clean.startsWith('stratum+ssl://') || clean.startsWith('stratum://')) {
      clean = clean.replace(/^stratum(\+(tcp|ssl))?:\/\//, '');
    }

    const [host, portStr] = clean.split(':');
    const port = parseInt(portStr, 10) || 443;
    return { host: host || '127.0.0.1', port, raw: rawUrl };
  }

  /**
   * Mask password for safe public telemetry
   * @param {string} pwd
   * @returns {string}
   */
  static maskPassword(pwd) {
    if (!pwd) return '******';
    if (pwd.length <= 2) return '**';
    return pwd.slice(0, 2) + '*'.repeat(Math.max(4, pwd.length - 2));
  }

  /**
   * Probe a single Stratum TCP endpoint for reachability and handshake latency
   * @param {string} poolUrl
   * @param {number} [timeoutMs=4000]
   * @returns {Promise<{ pool: string, host: string, port: number, reachable: boolean, tcpLatencyMs?: number, stratumLatencyMs?: number, extranonce1?: string, error?: string, status: string }>}
   */
  static async probePool(poolUrl, timeoutMs = 4000) {
    const { host, port } = BinanceMiningPoolMonitor.parseStratumUrl(poolUrl);
    const startTcp = Date.now();

    return new Promise((resolve) => {
      let resolved = false;
      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          try {
            socket.destroy();
          } catch (_) {}
          resolve(result);
        }
      };

      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const tcpLatencyMs = Date.now() - startTcp;
        const subscribeReq = JSON.stringify({
          id: 1,
          method: 'mining.subscribe',
          params: ['AifieProbe/1.0']
        }) + '\n';

        const startStratum = Date.now();
        let buffer = '';

        const onData = (chunk) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            try {
              const res = JSON.parse(line);
              if (res && res.id === 1) {
                const stratumLatencyMs = Date.now() - startStratum;
                const extranonce1 = Array.isArray(res.result) ? res.result[1] : null;
                finish({
                  pool: poolUrl,
                  host,
                  port,
                  reachable: true,
                  tcpLatencyMs,
                  stratumLatencyMs,
                  extranonce1: extranonce1 || 'N/A',
                  status: 'ONLINE'
                });
                return;
              }
            } catch (_) {}
          }
          buffer = lines[lines.length - 1];
        };

        socket.on('data', onData);
        socket.write(subscribeReq);
      });

      socket.on('timeout', () => {
        finish({
          pool: poolUrl,
          host,
          port,
          reachable: false,
          error: `Connection timed out after ${timeoutMs}ms`,
          status: 'TIMEOUT'
        });
      });

      socket.on('error', (err) => {
        finish({
          pool: poolUrl,
          host,
          port,
          reachable: false,
          error: err.message,
          status: 'OFFLINE'
        });
      });

      socket.connect(port, host);
    });
  }

  /**
   * Probe all configured pools concurrently
   * @param {number} [timeoutMs=4000]
   * @returns {Promise<Array<{ pool: string, host: string, port: number, reachable: boolean, tcpLatencyMs?: number, stratumLatencyMs?: number, extranonce1?: string, error?: string, status: string }>>}
   */
  async probeAllPools(timeoutMs = 4000) {
    const promises = this.pools.map((p) => BinanceMiningPoolMonitor.probePool(p, timeoutMs));
    return Promise.all(promises);
  }

  /**
   * Connect to the specified pool or fallback across pool list
   * @param {number} [poolIndex=0]
   * @returns {Promise<boolean>}
   */
  async connect(poolIndex = 0) {
    this.manualStop = false;
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (_) {}
      this.socket = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (poolIndex >= this.pools.length) {
      poolIndex = 0;
    }
    this.activePoolIndex = poolIndex;
    this.activePool = this.pools[poolIndex];

    const { host, port } = BinanceMiningPoolMonitor.parseStratumUrl(this.activePool);
    this.connectionState = 'CONNECTING';
    this.isAuthorized = false;
    this.emit('stateChange', { state: this.connectionState, pool: this.activePool });

    return new Promise((resolve) => {
      let resolved = false;
      const onConnected = async () => {
        if (resolved) return;
        resolved = true;
        this.connectionState = 'CONNECTED';
        this.connectedAt = new Date().toISOString();
        this.emit('connected', { pool: this.activePool, host, port });

        // Start Stratum V1 Handshake: mining.subscribe -> mining.authorize
        try {
          await this.subscribe();
          await this.authorize();
          this.startHeartbeat();
          resolve(true);
        } catch (err) {
          this.recordError(`Handshake error on ${this.activePool}: ${err.message}`);
          this.failover();
          resolve(false);
        }
      };

      const onFailure = (err) => {
        if (resolved) return;
        resolved = true;
        this.recordError(`Connection failure to ${this.activePool}: ${err.message}`);
        this.failover();
        resolve(false);
      };

      try {
        this.socket = new net.Socket();
        this.socket.setTimeout(8000);

        this.socket.on('connect', onConnected);
        this.socket.on('data', (chunk) => this.handleData(chunk));
        this.socket.on('timeout', () => {
          onFailure(new Error('Connection timed out'));
        });
        this.socket.on('error', (err) => {
          onFailure(err);
        });
        this.socket.on('close', () => {
          this.handleClose();
        });

        this.socket.connect(port, host);
      } catch (err) {
        onFailure(err);
      }
    });
  }

  /**
   * Handle incoming raw TCP data stream
   * @param {Buffer} chunk
   */
  handleData(chunk) {
    this.incomingBuffer += chunk.toString('utf8');
    const lines = this.incomingBuffer.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      this.processStratumMessage(line);
    }
    this.incomingBuffer = lines[lines.length - 1];
  }

  /**
   * Process a parsed Stratum JSON-RPC message
   * @param {string} rawLine
   */
  processStratumMessage(rawLine) {
    let msg;
    try {
      msg = JSON.parse(rawLine);
    } catch (_) {
      return;
    }

    // Response to our request
    if (msg.id !== null && msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const pending = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);

      if (pending) {
        this.pingMs = Date.now() - pending.sentAt;
        this.lastPingAt = new Date().toISOString();

        if (msg.error) {
          pending.reject(new Error(Array.isArray(msg.error) ? msg.error[1] || msg.error[0] : String(msg.error)));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    // Server-initiated notification
    if (msg.method) {
      this.handleServerNotification(msg.method, msg.params);
    }
  }

  /**
   * Handle server notifications like mining.notify and mining.set_difficulty
   * @param {string} method
   * @param {any[]} params
   */
  handleServerNotification(method, params = []) {
    switch (method) {
      case 'mining.notify': {
        this.currentJob = {
          jobId: params[0] || null,
          prevHash: params[1] || '',
          coinb1: params[2] || '',
          coinb2: params[3] || '',
          merkleBranch: params[4] || [],
          version: params[5] || '',
          nbits: params[6] || '',
          ntime: params[7] || '',
          cleanJobs: params[8] ?? true,
          receivedAt: new Date().toISOString()
        };
        this.lastJobId = this.currentJob.jobId;
        this.lastJobReceivedAt = this.currentJob.receivedAt;
        this.jobsReceived++;
        this.emit('job', this.currentJob);
        break;
      }
      case 'mining.set_difficulty': {
        this.currentDifficulty = Number(params[0]) || this.currentDifficulty;
        this.emit('difficulty', { difficulty: this.currentDifficulty });
        break;
      }
      case 'client.reconnect': {
        this.recordError('Pool requested client.reconnect');
        this.disconnect();
        if (this.autoReconnect) {
          this.connect(this.activePoolIndex);
        }
        break;
      }
      default:
        this.emit('notification', { method, params });
        break;
    }
  }

  /**
   * Send a JSON-RPC request over the active Stratum socket
   * @param {string} method
   * @param {any[]} params
   * @returns {Promise<any>}
   */
  async sendRequest(method, params = []) {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('Stratum socket is not connected');
    }

    const id = this.requestId++;
    const payload = JSON.stringify({ id, method, params }) + '\n';

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} (id=${id}) timed out after 5000ms`));
        }
      }, 5000);

      this.pendingRequests.set(id, {
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        method,
        sentAt: Date.now()
      });

      this.socket.write(payload, (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  /**
   * Stratum mining.subscribe
   */
  async subscribe() {
    const result = await this.sendRequest('mining.subscribe', ['AifieAgent/2.0.0']);
    if (Array.isArray(result)) {
      this.extranonce1 = result[1] || null;
      this.extranonce2Size = result[2] || 4;
    }
    this.emit('subscribed', { extranonce1: this.extranonce1, extranonce2Size: this.extranonce2Size });
    return result;
  }

  /**
   * Stratum mining.authorize
   */
  async authorize() {
    const result = await this.sendRequest('mining.authorize', [this.worker, this.password]);
    this.isAuthorized = result === true;
    if (this.isAuthorized) {
      this.connectionState = 'AUTHORIZED';
      this.emit('authorized', { worker: this.worker, pool: this.activePool });
    } else {
      throw new Error(`Worker ${this.worker} authorization rejected by pool`);
    }
    return result;
  }

  /**
   * Submit a mined share to the active Binance Mining Pool
   * @param {string} jobId
   * @param {string} extranonce2
   * @param {string} ntime
   * @param {string} nonceHex
   * @returns {Promise<boolean>}
   */
  async submitShare(jobId, extranonce2, ntime, nonceHex) {
    if (!this.socket || this.connectionState !== 'AUTHORIZED') {
      throw new Error(`Cannot submit share: not authorized on pool (${this.connectionState})`);
    }
    const result = await this.sendRequest('mining.submit', [
      this.worker,
      jobId,
      extranonce2,
      ntime,
      nonceHex
    ]);
    return result === true;
  }

  /**
   * Start periodic heartbeat / latency pings
   */
  startHeartbeat() {
    if (this.pingIntervalTimer) clearInterval(this.pingIntervalTimer);
    this.pingIntervalTimer = setInterval(async () => {
      if (this.isAuthorized && this.socket && !this.socket.destroyed) {
        try {
          await this.sendRequest('mining.extranonce.subscribe', []);
        } catch (_) {}
      }
    }, 30000);
  }

  /**
   * Failover to the next available configured pool
   */
  failover() {
    if (this.manualStop) return;

    this.connectionState = 'RECONNECTING';
    const nextIndex = (this.activePoolIndex + 1) % this.pools.length;
    this.recordError(`Initiating failover from ${this.activePool} to pool #${nextIndex + 1} (${this.pools[nextIndex]})`);

    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (_) {}
      this.socket = null;
    }

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(nextIndex);
    }, this.reconnectIntervalMs);
  }

  /**
   * Handle socket closure
   */
  handleClose() {
    const wasConnected = this.connectionState === 'AUTHORIZED' || this.connectionState === 'CONNECTED';
    this.connectionState = 'DISCONNECTED';
    this.isAuthorized = false;
    this.socket = null;

    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }

    this.emit('disconnected', { pool: this.activePool });

    if (wasConnected && this.autoReconnect && !this.manualStop) {
      this.failover();
    }
  }

  /**
   * Disconnect cleanly
   */
  disconnect() {
    this.manualStop = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (_) {}
      this.socket = null;
    }
    this.connectionState = 'DISCONNECTED';
    this.isAuthorized = false;
  }

  /**
   * Record error with history bounding
   * @param {string} errText
   */
  recordError(errText) {
    const entry = `[${new Date().toISOString()}] ${errText}`;
    this.recentErrors.unshift(entry);
    if (this.recentErrors.length > 20) {
      this.recentErrors.pop();
    }
    this.emit('monitorError', entry);
  }

  /**
   * Return comprehensive telemetry status
   */
  getStatus() {
    return {
      engine: 'BinanceMiningPoolMonitor',
      version: '1.0.0',
      algorithm: this.algo,
      worker: this.worker,
      maskedPassword: BinanceMiningPoolMonitor.maskPassword(this.password),
      activePool: this.activePool,
      activePoolIndex: this.activePoolIndex,
      connectionState: this.connectionState,
      isAuthorized: this.isAuthorized,
      currentDifficulty: this.currentDifficulty,
      lastJobId: this.lastJobId,
      lastJobReceivedAt: this.lastJobReceivedAt,
      jobsReceived: this.jobsReceived,
      extranonce1: this.extranonce1,
      extranonce2Size: this.extranonce2Size,
      pingMs: this.pingMs,
      lastPingAt: this.lastPingAt,
      connectedAt: this.connectedAt,
      configuredPools: this.pools.map((p, idx) => ({
        index: idx,
        url: p,
        isCurrent: idx === this.activePoolIndex,
        ...BinanceMiningPoolMonitor.parseStratumUrl(p)
      })),
      recentErrors: this.recentErrors
    };
  }
}

// Export singleton instance
export const binanceMiningPoolMonitor = new BinanceMiningPoolMonitor();
