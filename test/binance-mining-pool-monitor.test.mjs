// test/binance-mining-pool-monitor.test.mjs
// Verification for Binance Mining Pool & Stratum V1 TCP Monitor Engine
// Pure Node.js ESM built-ins only

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import { BinanceMiningPoolMonitor, binanceMiningPoolMonitor } from '../src/mining/binance-mining-pool-monitor.mjs';
import { app } from '../server.mjs';
import { createQuantResearchMcpServer } from '../src/mcp/servers/quant-research-mcp.mjs';
import { processTelegramCommand } from '../src/telegram-command-listener.mjs';

test('BinanceMiningPoolMonitor: initializes with default Binance pools and worker credentials', () => {
  const monitor = new BinanceMiningPoolMonitor({
    worker: 'aifieming001.001',
    password: 'supersecretpassword123'
  });

  assert.strictEqual(monitor.worker, 'aifieming001.001');
  assert.strictEqual(monitor.algo, 'SHA256');
  assert.strictEqual(monitor.pools.length >= 3, true);
  assert.ok(monitor.pools[0].includes('poolbinance.com'));

  const status = monitor.getStatus();
  assert.strictEqual(status.worker, 'aifieming001.001');
  assert.strictEqual(status.algorithm, 'SHA256');
  assert.strictEqual(status.connectionState, 'DISCONNECTED');
  assert.strictEqual(status.isAuthorized, false);
  assert.strictEqual(status.maskedPassword.includes('supersecretpassword123'), false);
  assert.strictEqual(status.maskedPassword.startsWith('su'), true);
});

test('BinanceMiningPoolMonitor.parseStratumUrl: correctly extracts host and port', () => {
  const p1 = BinanceMiningPoolMonitor.parseStratumUrl('stratum+tcp://sha256.poolbinance.com:443');
  assert.strictEqual(p1.host, 'sha256.poolbinance.com');
  assert.strictEqual(p1.port, 443);

  const p2 = BinanceMiningPoolMonitor.parseStratumUrl('stratum+tcp://btc.poolbinance.com:1800');
  assert.strictEqual(p2.host, 'btc.poolbinance.com');
  assert.strictEqual(p2.port, 1800);

  const p3 = BinanceMiningPoolMonitor.parseStratumUrl('bs.poolbinance.com:3333');
  assert.strictEqual(p3.host, 'bs.poolbinance.com');
  assert.strictEqual(p3.port, 3333);
});

test('BinanceMiningPoolMonitor: connects to mock Stratum V1 server, subscribes and authorizes', async () => {
  let mockServerPort = 0;
  const sockets = new Set();
  const mockServer = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));

    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const msg = JSON.parse(line);

        if (msg.method === 'mining.subscribe') {
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
          socket.write(JSON.stringify({
            id: msg.id,
            result: true,
            error: null
          }) + '\n');

          setTimeout(() => {
            try {
              socket.write(JSON.stringify({
                id: null,
                method: 'mining.set_difficulty',
                params: [32768]
              }) + '\n');

              socket.write(JSON.stringify({
                id: null,
                method: 'mining.notify',
                params: ['job_9981', '00000000prevhash', 'coinb1', 'coinb2', [], '20000000', '1a05be64', '66dc9901', true]
              }) + '\n');
            } catch (_) {}
          }, 40);
        }
      }
      buf = lines[lines.length - 1];
    });
  });

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', () => {
    // @ts-ignore
    mockServerPort = mockServer.address().port;
    resolve();
  }));

  try {
    const monitor = new BinanceMiningPoolMonitor({
      pools: [`stratum+tcp://127.0.0.1:${mockServerPort}`],
      worker: 'aifieming001.001',
      password: 'testpassword',
      autoReconnect: false
    });

    const connected = await monitor.connect(0);
    assert.strictEqual(connected, true);
    assert.strictEqual(monitor.isAuthorized, true);
    assert.strictEqual(monitor.connectionState, 'AUTHORIZED');
    assert.strictEqual(monitor.extranonce1, '08000002');
    assert.strictEqual(monitor.extranonce2Size, 4);

    await new Promise((resolve) => setTimeout(resolve, 120));

    assert.strictEqual(monitor.currentDifficulty, 32768);
    assert.strictEqual(monitor.jobsReceived, 1);
    assert.strictEqual(monitor.lastJobId, 'job_9981');

    const status = monitor.getStatus();
    assert.strictEqual(status.isAuthorized, true);
    assert.strictEqual(status.jobsReceived, 1);
    assert.strictEqual(status.currentDifficulty, 32768);

    monitor.disconnect();
    assert.strictEqual(monitor.connectionState, 'DISCONNECTED');
  } finally {
    for (const s of sockets) s.destroy();
    await new Promise((resolve) => mockServer.close(resolve));
  }
});

test('BinanceMiningPoolMonitor.probePool: measures latency on live or mock TCP pool', async () => {
  let mockPort = 0;
  const sockets = new Set();
  const mockServer = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));

    socket.on('data', (chunk) => {
      const line = chunk.toString('utf8');
      if (line.includes('mining.subscribe')) {
        socket.write(JSON.stringify({
          id: 1,
          result: [[], '01234567', 4],
          error: null
        }) + '\n');
      }
    });
  });

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', () => {
    // @ts-ignore
    mockPort = mockServer.address().port;
    resolve();
  }));

  try {
    const res = await BinanceMiningPoolMonitor.probePool(`stratum+tcp://127.0.0.1:${mockPort}`, 2000);
    assert.strictEqual(res.reachable, true);
    assert.strictEqual(res.status, 'ONLINE');
    assert.strictEqual(typeof res.tcpLatencyMs, 'number');
    assert.strictEqual(typeof res.stratumLatencyMs, 'number');
    assert.strictEqual(res.extranonce1, '01234567');
  } finally {
    for (const s of sockets) s.destroy();
    await new Promise((resolve) => mockServer.close(resolve));
  }
});

test('Server REST API & MCP Server Tools Integration for Mining Pool Monitor', async (t) => {
  let server;
  let baseUrl;

  await t.test('Start HTTP Server on ephemeral port', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  await t.test('GET /api/mining/status returns active configured pools and worker', async () => {
    const res = await fetch(`${baseUrl}/api/mining/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.engine, 'BinanceMiningPoolMonitor');
    assert.strictEqual(data.worker, 'aifieming001.001');
    assert.strictEqual(data.algorithm, 'SHA256');
    assert.ok(Array.isArray(data.configuredPools));
    assert.strictEqual(data.configuredPools.length, 3);
  });

  await t.test('POST /api/mining/disconnect disconnects monitor cleanly', async () => {
    const res = await fetch(`${baseUrl}/api/mining/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status.connectionState, 'DISCONNECTED');
  });

  await t.test('MCP Server executes Tool 87: get_binance_mining_telemetry', async () => {
    const mcpServer = createQuantResearchMcpServer();
    const tool87 = mcpServer.tools.get('get_binance_mining_telemetry');
    assert.ok(tool87, 'Tool 87 get_binance_mining_telemetry must be registered');
    const res = await tool87.handler({});
    assert.strictEqual(res.engine, 'BinanceMiningPoolMonitor');
    assert.strictEqual(res.worker, 'aifieming001.001');
  });

  await t.test('MCP Server registers Tool 88: probe_binance_mining_pools', () => {
    const mcpServer = createQuantResearchMcpServer();
    const tool88 = mcpServer.tools.get('probe_binance_mining_pools');
    assert.ok(tool88, 'Tool 88 probe_binance_mining_pools must be registered');
  });

  await t.test('Telegram Command /mining responds with formatted telemetry', async () => {
    const res = await processTelegramCommand({ command: '/mining', fullText: '/mining' });
    assert.ok(res.text.includes('BINANCE MINING POOL & STRATUM V1 MONITOR'));
    assert.ok(res.text.includes('aifieming001.001'));
    assert.ok(res.text.includes('SHA-256'));
    assert.ok(res.replyMarkup?.inline_keyboard?.length > 0);
  });

  await t.test('Teardown HTTP Server', async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
