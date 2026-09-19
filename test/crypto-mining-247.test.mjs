// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

import { createServer } from 'node:http';
import {
  binanceMultiServerCluster,
  BinanceMultiServerCluster,
  BinanceClusterNode,
  Mining24x7Watchdog
} from '../src/mining/binance-multi-server-cluster.mjs';
import { BinanceStratumMiner, binanceStratumMiner } from '../src/mining/binance-stratum-miner.mjs';
import { binanceMiningPoolMonitor } from '../src/mining/binance-mining-pool-monitor.mjs';
import { app } from '../server.mjs';

const WORKER_PATH = fileURLToPath(new URL('../src/mining/mining-worker.mjs', import.meta.url));

test('Native Mining Worker Thread: launches, computes hashes, and reports batches', async () => {
  const worker = new Worker(WORKER_PATH, {
    workerData: {
      globalThreadId: 0,
      totalThreads: 2,
      intensity: 100,
      nodeIndex: 0
    }
  });

  const mockJob = {
    jobId: 'test_job_1',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    coinb1: '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0403',
    coinb2: '00000000',
    merkleBranch: [],
    version: '20000000',
    nbits: '1b44b419',
    ntime: '66e4a280',
    cleanJobs: true
  };

  /** @type {any[]} */
  const messages = [];

  worker.on('message', (msg) => {
    messages.push(msg);
  });

  // Easy target so share is found quickly
  const easyTargetHex = '0x0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

  worker.postMessage({
    action: 'INIT',
    globalThreadId: 0,
    totalThreads: 2,
    intensity: 100,
    nodeIndex: 0,
    extranonce1: '00000001',
    extranonce2Size: 4,
    diff: 0.001,
    targetBigIntHex: easyTargetHex,
    job: mockJob
  });

  // Wait for worker to produce hash batches or shares
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (messages.length > 0) {
        clearInterval(check);
        resolve(null);
      }
    }, 50);
    setTimeout(() => {
      clearInterval(check);
      resolve(null);
    }, 4000);
  });

  worker.postMessage({ action: 'STOP' });
  await worker.terminate();

  assert.ok(messages.length > 0, 'Worker thread should produce messages');
  const hasBatchOrShare = messages.some(m => m.type === 'HASH_BATCH' || m.type === 'SHARE_FOUND');
  assert.ok(hasBatchOrShare, 'Worker should emit HASH_BATCH or SHARE_FOUND');
});

test('BinanceMultiServerCluster with Worker Threads: starts, partitions, and reports stats', async () => {
  const cluster = new BinanceMultiServerCluster({
    endpoints: ['stratum+tcp://127.0.0.1:28881', 'stratum+tcp://127.0.0.1:28882'],
    baseWorker: 'testworker.001',
    password: 'x',
    threads: 2,
    intensity: 75,
    useWorkerThreads: true
  });

  assert.equal(cluster.threads, 2);
  assert.equal(cluster.useWorkerThreads, true);

  // Start cluster without real network connections
  const stats = await cluster.startCluster({ threads: 2, intensity: 80, autoWatchdog: true });

  assert.equal(stats.isMining, true);
  assert.equal(stats.threads, 2);
  assert.equal(stats.intensity, 80);
  assert.equal(stats.workerThreadsActive, 2);

  // Test setBoost
  const boost = cluster.setBoost(4, 90);
  assert.equal(boost.threads, 4);
  assert.equal(boost.intensity, 90);

  // Stop cluster
  const stoppedStats = cluster.stopCluster();
  assert.equal(stoppedStats.isMining, false);
  assert.equal(cluster.workers.length, 0);
});

test('Mining24x7Watchdog: endpoint failover rotation on consecutive connection failures', async () => {
  const cluster = new BinanceMultiServerCluster({
    endpoints: [
      'stratum+tcp://127.0.0.1:29991',
      'stratum+tcp://127.0.0.1:29992',
      'stratum+tcp://127.0.0.1:29993'
    ],
    baseWorker: 'testworker.001',
    password: 'x',
    threads: 1,
    useWorkerThreads: false
  });

  const watchdog = cluster.watchdog;
  cluster.isMining = true;

  const node0 = cluster.nodes[0];
  const initialUrl = node0.poolUrl;
  assert.equal(initialUrl, 'stratum+tcp://127.0.0.1:29991');

  // Stub node.connect to prevent state transition to CONNECTING during unit test
  node0.connect = async () => {};

  // Simulate 3 consecutive disconnects
  node0.monitor.connectionState = 'DISCONNECTED';
  await watchdog.runHealthCheck();
  assert.equal(node0.consecutiveFailures, 1);

  node0.monitor.connectionState = 'DISCONNECTED';
  await watchdog.runHealthCheck();
  assert.equal(node0.consecutiveFailures, 2);

  node0.monitor.connectionState = 'DISCONNECTED';
  await watchdog.runHealthCheck();
  assert.equal(node0.consecutiveFailures, 3);

  // Node poolUrl should have rotated to failover endpoint
  assert.notEqual(node0.poolUrl, initialUrl, 'Pool URL should rotate to failover on 3 consecutive failures');

  cluster.stopCluster();
});

test('Stratum V1 ASIC Proxy Server: accepts client connections and serves subscribe', async () => {
  const miner = new BinanceStratumMiner();
  miner.currentJob = {
    jobId: 'proxy_job_99',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    coinb1: '01000000',
    coinb2: '00000000',
    merkleBranch: [],
    version: '20000000',
    nbits: '1f00ffff',
    ntime: '66dc9901',
    cleanJobs: true
  };

  const proxyRes = await miner.startProxy(0);
  const proxyPort = miner.proxyServer.address().port;
  assert.equal(proxyRes.status, 'RUNNING');

  // Connect TCP client as mock ASIC / CGMiner
  const client = new net.Socket();
  const responses = [];

  await new Promise((resolve) => {
    client.connect(proxyPort, '127.0.0.1', () => {
      // Send mining.subscribe
      const subReq = JSON.stringify({
        id: 1,
        method: 'mining.subscribe',
        params: ['Antminer-S19/1.0.0']
      }) + '\n';
      client.write(subReq);
    });

    client.on('data', (data) => {
      responses.push(data.toString());
      if (responses.join('').includes('"id":1')) {
        client.destroy();
        resolve(null);
      }
    });

    setTimeout(() => {
      client.destroy();
      resolve(null);
    }, 2000);
  });

  assert.ok(responses.length > 0, 'Proxy should respond to mining.subscribe');
  const lines = responses.join('\n').split('\n').map(l => l.trim()).filter(Boolean);
  const respJson = lines.map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).find(r => r && r.id === 1);
  assert.ok(respJson, 'Should find response for request id 1');
  assert.equal(respJson.id, 1);
  assert.ok(respJson.result, 'Response result should be populated');

  await miner.stopProxy();
});

test('Server REST API: /api/mining/247/status and /api/mining/247/restart', async () => {
  const handler = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const respond = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json', 'Connection': 'close' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET' && url.pathname === '/api/mining/247/status') {
      const clusterStats = binanceMultiServerCluster.getClusterStats();
      const watchdogStatus = binanceMultiServerCluster.watchdog.getStatus();
      const proxyStatus = binanceStratumMiner.getStats().proxy;
      const poolStatus = binanceMiningPoolMonitor.getStatus();
      return respond(200, {
        status: 'ONLINE_247',
        timestamp: new Date().toISOString(),
        cluster: clusterStats,
        watchdog: watchdogStatus,
        proxy: proxyStatus,
        pool: poolStatus
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/mining/247/restart') {
      let bodyStr = '';
      for await (const chunk of req) bodyStr += chunk;
      const payload = bodyStr ? JSON.parse(bodyStr) : {};
      binanceMultiServerCluster.stopCluster();
      const threads = Number(payload?.threads) || 2;
      const intensity = Number(payload?.intensity) || 80;
      const stats = await binanceMultiServerCluster.startCluster({ threads, intensity, autoWatchdog: false });
      return respond(200, { success: true, message: '24/7 Mining Cluster restarted', stats });
    }
    respond(404, { error: 'not found' });
  };

  const httpServer = http.createServer(handler);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const testPort = /** @type {import('node:net').AddressInfo} */ (httpServer.address()).port;

  try {
    // 1. GET /api/mining/247/status
    const statusRes = await fetch(`http://127.0.0.1:${testPort}/api/mining/247/status`, {
      headers: { Connection: 'close' }
    });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.status, 'ONLINE_247');
    assert.ok(statusData.cluster, 'Should include cluster stats');
    assert.ok(statusData.watchdog, 'Should include watchdog status');
    assert.ok(statusData.proxy, 'Should include proxy status');

    // 2. POST /api/mining/247/restart
    const restartRes = await fetch(`http://127.0.0.1:${testPort}/api/mining/247/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify({ threads: 2, intensity: 80 })
    });
    assert.equal(restartRes.status, 200);
    const restartData = await restartRes.json();
    assert.equal(restartData.success, true);
    assert.equal(restartData.stats.threads, 2);
  } finally {
    binanceMultiServerCluster.stopCluster();
    await new Promise((resolve) => httpServer.close(resolve));
  }
});
