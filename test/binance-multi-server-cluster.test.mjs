// @ts-check
import test from 'node:test';
import assert from 'node:assert';
import net from 'node:net';
import http from 'node:http';
import {
  BinanceClusterNode,
  Mining24x7Watchdog,
  BinanceMultiServerCluster,
  binanceMultiServerCluster
} from '../src/mining/binance-multi-server-cluster.mjs';
import { createQuantResearchMcpServer } from '../src/mcp/servers/quant-research-mcp.mjs';
import { processTelegramCommand } from '../src/telegram-command-listener.mjs';

test('BinanceClusterNode: initializes with correct sub-worker and pool', () => {
  const node = new BinanceClusterNode({
    index: 0,
    poolUrl: 'stratum+tcp://sha256.poolbinance.com:443',
    worker: 'aifieming001.001',
    password: '123'
  });

  assert.strictEqual(node.index, 0);
  assert.strictEqual(node.worker, 'aifieming001.001');
  const status = node.getNodeStatus();
  assert.strictEqual(status.worker, 'aifieming001.001');
  assert.strictEqual(status.pool, 'stratum+tcp://sha256.poolbinance.com:443');
});

test('BinanceMultiServerCluster: partitions 8 threads across 3 Binance nodes', () => {
  const cluster = new BinanceMultiServerCluster({
    threads: 8,
    intensity: 95
  });

  assert.strictEqual(cluster.nodes.length, 3);
  assert.strictEqual(cluster.nodes[0].worker, 'aifieming001.001');
  assert.strictEqual(cluster.nodes[1].worker, 'aifieming001.002');
  assert.strictEqual(cluster.nodes[2].worker, 'aifieming001.003');

  cluster.partitionThreads();
  assert.strictEqual(cluster.nodes[0].assignedThreads, 3);
  assert.strictEqual(cluster.nodes[1].assignedThreads, 3);
  assert.strictEqual(cluster.nodes[2].assignedThreads, 2);

  const boostRes = cluster.setBoost(12, 100);
  assert.strictEqual(boostRes.threads, 12);
  assert.strictEqual(boostRes.intensity, 100);
});

test('Mining24x7Watchdog: starts, audits node health, and records self-healing recovery', async () => {
  const cluster = new BinanceMultiServerCluster({ threads: 4 });
  const watchdog = new Mining24x7Watchdog(cluster, { checkIntervalMs: 10000 });

  watchdog.start();
  assert.strictEqual(watchdog.active, true);

  watchdog.recordRecovery('TEST_SIMULATED_DROP', 'Recovered mock connection blip');
  const wStatus = watchdog.getStatus();

  assert.strictEqual(wStatus.active, true);
  assert.strictEqual(wStatus.recoveriesCount >= 1, true);
  assert.strictEqual(wStatus.recentRecoveries[wStatus.recentRecoveries.length - 1].reason, 'TEST_SIMULATED_DROP');

  watchdog.stop();
  assert.strictEqual(watchdog.active, false);
});

test('BinanceMultiServerCluster: mock multi-server Stratum session and share solving', async () => {
  // Create mock Stratum V1 server on ephemeral port
  let serverReceivedSub = false;
  let serverReceivedAuth = false;

  const mockServer = net.createServer((socket) => {
    socket.on('error', () => {});
    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg.method === 'mining.subscribe') {
          serverReceivedSub = true;
          socket.write(JSON.stringify({
            id: msg.id,
            result: [
              [['mining.set_difficulty', 'b4782c0f060808'], ['mining.notify', 'ae6812be']],
              '08000002',
              4
            ],
            error: null
          }) + '\n');
        } else if (msg.method === 'mining.authorize') {
          serverReceivedAuth = true;
          socket.write(JSON.stringify({ id: msg.id, result: true, error: null }) + '\n');

          // Send fractional difficulty for instantaneous share validation
          socket.write(JSON.stringify({ id: null, method: 'mining.set_difficulty', params: [0.0000001] }) + '\n');

          // Send mock block job
          socket.write(JSON.stringify({
            id: null,
            method: 'mining.notify',
            params: [
              "job-cluster-99",
              "0000000000000000000000000000000000000000000000000000000000000000",
              "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0403",
              "00000000",
              [],
              "20000000",
              "1b44b419",
              "648a1200",
              true
            ]
          }) + '\n');
        } else if (msg.method === 'mining.submit') {
          socket.write(JSON.stringify({ id: msg.id, result: true, error: null }) + '\n');
        }
      }
      buf = lines[lines.length - 1];
    });
  });

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
  const port = /** @type {import('node:net').AddressInfo} */ (mockServer.address()).port;

  const testCluster = new BinanceMultiServerCluster({
    endpoints: [`stratum+tcp://127.0.0.1:${port}`],
    baseWorker: 'aifieming001.001',
    threads: 2,
    intensity: 100
  });

  const stats = await testCluster.startCluster({ threads: 2, intensity: 100, autoWatchdog: false });
  assert.strictEqual(stats.isMining, true);

  // Await handshake
  await new Promise((r) => setTimeout(r, 400));

  assert.strictEqual(serverReceivedSub, true);
  assert.strictEqual(serverReceivedAuth, true);
  assert.strictEqual(testCluster.totalHashes > 0, true);

  testCluster.stopCluster();
  await new Promise((resolve) => mockServer.close(resolve));
});

test('Server REST API, MCP Tools & Telegram Suite for Multi-Server Cluster', async () => {
  // 1. MCP Tools 92 & 93
  const mcpServer = createQuantResearchMcpServer();
  const tool92 = mcpServer.tools.get('get_multi_server_mining_cluster_stats');
  assert.strictEqual(Boolean(tool92), true);

  const tool93 = mcpServer.tools.get('configure_247_mining_cluster');
  assert.strictEqual(Boolean(tool93), true);

  const statsRes = await tool92.handler({});
  assert.strictEqual(statsRes.clusterEngine, 'BinanceMultiServerMiningCluster');

  const boostRes = await tool93.handler({ action: 'boost', threads: 8, intensity: 95 });
  assert.strictEqual(boostRes.threads, 8);

  // 2. Telegram Commands: /swarm_status, /boost, /watchdog
  const tgSwarm = await processTelegramCommand({ command: '/swarm_status', fullText: '/swarm_status' });
  assert.strictEqual(tgSwarm.text.includes('BINANCE MULTI-SERVER MINING SWARM'), true);

  const tgBoost = await processTelegramCommand({ command: '/boost', fullText: '/boost 8 100' });
  assert.strictEqual(tgBoost.text.includes('SPEED BOOST APPLIED'), true);

  const tgWatchdog = await processTelegramCommand({ command: '/watchdog', fullText: '/watchdog' });
  assert.strictEqual(tgWatchdog.text.includes('24/7 MINING SENTINEL WATCHDOG'), true);

  // 3. HTTP Server API Testing
  const app = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const respond = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET' && url.pathname === '/api/mining/cluster/stats') {
      return respond(200, binanceMultiServerCluster.getClusterStats());
    }
    if (req.method === 'POST' && url.pathname === '/api/mining/cluster/boost') {
      return respond(200, { success: true, ...binanceMultiServerCluster.setBoost(8, 95) });
    }
    if (req.method === 'GET' && url.pathname === '/api/mining/watchdog/status') {
      return respond(200, binanceMultiServerCluster.watchdog.getStatus());
    }
    respond(404, { error: 'not found' });
  };

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const httpPort = /** @type {import('node:net').AddressInfo} */ (httpServer.address()).port;

  // Test GET /api/mining/cluster/stats
  const resStats = await fetch(`http://127.0.0.1:${httpPort}/api/mining/cluster/stats`);
  const jsonStats = await resStats.json();
  assert.strictEqual(jsonStats.clusterEngine, 'BinanceMultiServerMiningCluster');
  assert.strictEqual(jsonStats.totalNodesCount, 3);

  // Test POST /api/mining/cluster/boost
  const resBoost = await fetch(`http://127.0.0.1:${httpPort}/api/mining/cluster/boost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threads: 8, intensity: 95 })
  });
  const jsonBoost = await resBoost.json();
  assert.strictEqual(jsonBoost.success, true);
  assert.strictEqual(jsonBoost.threads, 8);

  // Test GET /api/mining/watchdog/status
  const resWd = await fetch(`http://127.0.0.1:${httpPort}/api/mining/watchdog/status`);
  const jsonWd = await resWd.json();
  assert.strictEqual(typeof jsonWd.heartbeatCount, 'number');

  await new Promise((resolve) => httpServer.close(resolve));
});
