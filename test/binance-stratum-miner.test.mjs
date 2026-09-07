// test/binance-stratum-miner.test.mjs
// Verification for Full Binance Mining Rig, Stratum V1 Miner Engine & Local Proxy
// Pure Node.js ESM built-ins only

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import {
  dsha256,
  computeMerkleRoot,
  buildBlockHeader,
  difficultyToTarget,
  hashMeetsTarget,
  parseStratumPrevHash,
  BinanceStratumMiner,
  binanceStratumMiner,
  DIFF1_TARGET
} from '../src/mining/binance-stratum-miner.mjs';
import { BinanceMiningPoolMonitor } from '../src/mining/binance-mining-pool-monitor.mjs';
import { app } from '../server.mjs';
import { createQuantResearchMcpServer } from '../src/mcp/servers/quant-research-mcp.mjs';
import { processTelegramCommand } from '../src/telegram-command-listener.mjs';

test('Stratum Cryptography: dsha256, merkle root, and header builder', () => {
  const data = Buffer.from('hello bitcoin stratum', 'utf8');
  const hash1 = dsha256(data);
  assert.strictEqual(hash1.length, 32);

  // Merkle Root calculation
  const coinbase = Buffer.alloc(32, 0x01);
  const branch1 = Buffer.alloc(32, 0x02).toString('hex');
  const branch2 = Buffer.alloc(32, 0x03).toString('hex');
  const root = computeMerkleRoot(coinbase, [branch1, branch2]);
  assert.strictEqual(root.length, 32);

  // PrevHash word swap
  const prevHex = '0000000000000000000000000000000000000000000000000000000000000000';
  const prevBuf = parseStratumPrevHash(prevHex);
  assert.strictEqual(prevBuf.length, 32);

  // 80-byte header
  const header = buildBlockHeader('20000000', prevBuf, root, '66dc9901', '1a05be64', 12345);
  assert.strictEqual(header.length, 80);
  assert.strictEqual(header.readUInt32LE(76), 12345);
});

test('Stratum Target Difficulty & Hash Validation', () => {
  const target1 = difficultyToTarget(1);
  assert.strictEqual(target1, DIFF1_TARGET);

  const target2 = difficultyToTarget(2);
  assert.strictEqual(target2, DIFF1_TARGET / 2n);

  // Mock zero hash meets any target
  const zeroHash = Buffer.alloc(32, 0x00);
  assert.strictEqual(hashMeetsTarget(zeroHash, target1), true);

  // Max hash should not meet small target
  const maxHash = Buffer.alloc(32, 0xff);
  assert.strictEqual(hashMeetsTarget(maxHash, 100n), false);
});

test('BinanceStratumMiner: initializes with correct state, threads, and intensity', () => {
  const miner = new BinanceStratumMiner({
    threads: 2,
    intensity: 50
  });

  assert.strictEqual(miner.threads, 2);
  assert.strictEqual(miner.intensity, 50);
  assert.strictEqual(miner.isMining, false);

  const stats = miner.getStats();
  assert.strictEqual(stats.engine, 'BinanceStratumMiner');
  assert.strictEqual(stats.algorithm, 'SHA256');
  assert.strictEqual(stats.isMining, false);
  assert.strictEqual(stats.threads, 2);
  assert.strictEqual(stats.intensity, 50);
});

test('BinanceStratumMiner.runBenchmark: runs CPU double-SHA256 benchmark', async () => {
  const miner = new BinanceStratumMiner();
  const bench = await miner.runBenchmark(1); // 1-second benchmark
  assert.strictEqual(bench.durationSec, 1);
  assert.ok(bench.totalHashes > 0);
  assert.ok(bench.hashrateHps > 0);
  assert.strictEqual(typeof bench.hashrateKh, 'number');
});

test('BinanceStratumMiner: mining lifecycle and share solving on mock job', async () => {
  const mockMonitor = new BinanceMiningPoolMonitor({
    worker: 'aifieming001.001',
    password: '123'
  });

  // Mock authorized state
  mockMonitor.connectionState = 'AUTHORIZED';
  mockMonitor.isAuthorized = true;
  mockMonitor.extranonce1 = '08000001';
  mockMonitor.extranonce2Size = 4;

  let submittedShare = null;
  mockMonitor.submitShare = async (jobId, en2, ntime, nonceHex) => {
    submittedShare = { jobId, en2, ntime, nonceHex };
    return true; // Accepted!
  };

  const miner = new BinanceStratumMiner({
    monitor: mockMonitor,
    threads: 1,
    intensity: 100
  });

  // Provide mock job with extremely easy target difficulty
  miner.currentDifficulty = 0.00000000001; // Diff so low any hash passes
  miner.currentJob = {
    jobId: 'mock_test_job_1',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    coinb1: '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff2002',
    coinb2: '00000000',
    merkleBranch: [],
    version: '20000000',
    nbits: '1f00ffff',
    ntime: '66dc9901',
    cleanJobs: true
  };

  await miner.startMining({ autoConnect: false });
  assert.strictEqual(miner.isMining, true);

  // Await one share solve
  await new Promise((resolve) => {
    miner.once('shareAccepted', resolve);
    setTimeout(resolve, 800);
  });

  miner.stopMining();
  assert.strictEqual(miner.isMining, false);
  assert.ok(miner.totalHashes > 0);
  assert.ok(miner.acceptedShares >= 1);
  assert.ok(submittedShare !== null);
  assert.strictEqual(submittedShare.jobId, 'mock_test_job_1');
});

test('BinanceStratumMiner: Local Stratum Proxy multiplexes ASIC client connections', async () => {
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

  const proxyRes = await miner.startProxy(0); // Ephemeral port
  assert.strictEqual(proxyRes.status, 'RUNNING');
  const port = miner.proxyServer.address().port;

  const client = new net.Socket();
  await new Promise((resolve) => client.connect(port, '127.0.0.1', resolve));

  // Client sends mining.subscribe
  const subPromise = new Promise((resolve) => {
    let buf = '';
    client.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 1) resolve(msg);
        } catch (_) {}
      }
      buf = lines[lines.length - 1];
    });
  });

  client.write(JSON.stringify({ id: 1, method: 'mining.subscribe', params: ['MockAntminerS19'] }) + '\n');
  const subRes = await subPromise;
  assert.strictEqual(subRes.id, 1);
  assert.ok(Array.isArray(subRes.result));

  client.destroy();
  await miner.stopProxy();
  assert.strictEqual(miner.proxyServer, null);
});

test('Server REST API: Full Mining Rig & Proxy Endpoints', async (t) => {
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

  await t.test('GET /api/mining/rig/stats returns full miner telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/mining/rig/stats`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.engine, 'BinanceStratumMiner');
    assert.strictEqual(data.algorithm, 'SHA256');
    assert.strictEqual(data.worker, 'aifieming001.001');
    assert.strictEqual(typeof data.isMining, 'boolean');
  });

  await t.test('POST /api/mining/rig/threads updates thread count', async () => {
    const res = await fetch(`${baseUrl}/api/mining/rig/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threads: 3 })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.threads, 3);
  });

  await t.test('POST /api/mining/rig/benchmark executes CPU benchmark', async () => {
    const res = await fetch(`${baseUrl}/api/mining/rig/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSec: 1 })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.benchmark.totalHashes > 0);
  });

  await t.test('GET /api/mining/proxy/status returns local proxy status', async () => {
    const res = await fetch(`${baseUrl}/api/mining/proxy/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(typeof data.running, 'boolean');
    assert.strictEqual(typeof data.connectedClients, 'number');
  });

  await t.test('Teardown HTTP Server', async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

test('MCP Server Tools 89, 90, 91 for Binance Mining Rig', async () => {
  const mcpServer = createQuantResearchMcpServer();

  const tool89 = mcpServer.tools.get('start_binance_mining_rig');
  const tool90 = mcpServer.tools.get('stop_binance_mining_rig');
  const tool91 = mcpServer.tools.get('get_mining_rig_metrics');

  assert.ok(tool89, 'Tool 89 start_binance_mining_rig must exist');
  assert.ok(tool90, 'Tool 90 stop_binance_mining_rig must exist');
  assert.ok(tool91, 'Tool 91 get_mining_rig_metrics must exist');

  const stats = await tool91.handler({});
  assert.strictEqual(stats.engine, 'BinanceStratumMiner');
  assert.strictEqual(stats.worker, 'aifieming001.001');
});

test('Telegram Commands: /mine_start, /mine_stop, /hashrate, /proxy_status', async () => {
  const hrRes = await processTelegramCommand({ command: '/hashrate', fullText: '/hashrate' });
  assert.ok(hrRes.text.includes('BINANCE MINING RIG HASHRATE'));
  assert.ok(hrRes.text.includes('aifieming001.001'));

  const prxRes = await processTelegramCommand({ command: '/proxy_status', fullText: '/proxy_status' });
  assert.ok(prxRes.text.includes('LOCAL STRATUM PROXY SERVER'));
  assert.ok(prxRes.text.includes('3333'));

  const stopRes = await processTelegramCommand({ command: '/mine_stop', fullText: '/mine_stop' });
  assert.ok(stopRes.text.includes('Binance Mining Rig STOPPED'));
});
