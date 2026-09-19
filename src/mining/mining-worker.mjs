// @ts-check
/**
 * Native OS Worker Thread for Binance Stratum V1 Bitcoin (SHA-256) Mining
 * Runs inside an independent V8 isolate on a dedicated CPU core.
 * Pure Node.js ESM built-in (node:worker_threads + node:crypto).
 */

import { parentPort, isMainThread, workerData } from 'node:worker_threads';
import { createHash } from 'node:crypto';

// Double SHA-256 helper
function dsha256(buffer) {
  const first = createHash('sha256').update(buffer).digest();
  return createHash('sha256').update(first).digest();
}

// Byte-reverse 4-byte words for Stratum V1 prevHash
function parseStratumPrevHash(hexStr) {
  const raw = Buffer.from(hexStr, 'hex');
  const out = Buffer.alloc(32);
  for (let i = 0; i < 8; i++) {
    const word = raw.subarray(i * 4, i * 4 + 4);
    out[i * 4 + 0] = word[3];
    out[i * 4 + 1] = word[2];
    out[i * 4 + 2] = word[1];
    out[i * 4 + 3] = word[0];
  }
  return out;
}

// Compute Merkle root from coinbase transaction hash and Stratum branch
function computeMerkleRoot(coinbaseHash, merkleBranch = []) {
  let current = coinbaseHash;
  for (const branchHex of merkleBranch) {
    const branchBuf = Buffer.from(branchHex, 'hex');
    current = dsha256(Buffer.concat([current, branchBuf]));
  }
  return current;
}

// Build 80-byte Bitcoin block header
function buildBlockHeader(versionHex, prevHashBuf, merkleRootBuf, ntimeHex, nbitsHex, nonce) {
  const header = Buffer.alloc(80);

  // Version: 4 bytes (little-endian)
  const vStr = String(versionHex || '20000000').padStart(8, '0');
  const vBuf = Buffer.from(vStr, 'hex');
  header.writeUInt32LE(vBuf.readUInt32BE(0), 0);

  // PrevHash: 32 bytes
  prevHashBuf.copy(header, 4, 0, 32);

  // Merkle Root: 32 bytes
  merkleRootBuf.copy(header, 36, 0, 32);

  // nTime: 4 bytes (little-endian)
  const timeBuf = Buffer.from(String(ntimeHex || '').padStart(8, '0'), 'hex');
  header.writeUInt32LE(timeBuf.readUInt32BE(0), 68);

  // nBits: 4 bytes (little-endian)
  const bitsBuf = Buffer.from(String(nbitsHex || '').padStart(8, '0'), 'hex');
  header.writeUInt32LE(bitsBuf.readUInt32BE(0), 72);

  // Nonce: 4 bytes (little-endian)
  header.writeUInt32LE(nonce >>> 0, 76);

  return header;
}

function hashMeetsTarget(hashBuf, targetBigInt) {
  const rev = Buffer.from(hashBuf).reverse();
  const hashVal = BigInt('0x' + rev.toString('hex'));
  return hashVal <= targetBigInt;
}

if (!isMainThread && parentPort) {
  let active = false;
  let globalThreadId = workerData?.globalThreadId || 0;
  let totalThreads = workerData?.totalThreads || 1;
  let intensity = workerData?.intensity || 95;
  let currentJob = null;
  let currentTargetBigInt = 0x00000000ffff0000000000000000000000000000000000000000000000000000n;
  let currentDiff = 1;
  let extranonce1 = '00000000';
  let extranonce2Size = 4;
  let extranonce2Counter = (globalThreadId + 1) * 1000;
  let nodeIndex = workerData?.nodeIndex || 0;

  let loopPromise = null;

  parentPort.on('message', async (msg) => {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.action) {
      case 'INIT':
      case 'START':
        globalThreadId = msg.globalThreadId ?? globalThreadId;
        totalThreads = msg.totalThreads ?? totalThreads;
        intensity = msg.intensity ?? intensity;
        nodeIndex = msg.nodeIndex ?? nodeIndex;
        extranonce1 = msg.extranonce1 ?? extranonce1;
        extranonce2Size = msg.extranonce2Size ?? extranonce2Size;
        if (msg.targetBigIntHex) {
          currentTargetBigInt = BigInt(msg.targetBigIntHex);
        }
        if (msg.diff) currentDiff = msg.diff;
        if (msg.job) currentJob = msg.job;

        active = true;
        if (!loopPromise) {
          loopPromise = runWorkerLoop();
        }
        break;

      case 'UPDATE_JOB':
        currentJob = msg.job;
        if (msg.targetBigIntHex) currentTargetBigInt = BigInt(msg.targetBigIntHex);
        if (msg.diff) currentDiff = msg.diff;
        break;

      case 'UPDATE_TARGET':
        if (msg.targetBigIntHex) currentTargetBigInt = BigInt(msg.targetBigIntHex);
        if (msg.diff) currentDiff = msg.diff;
        break;

      case 'SET_INTENSITY':
        intensity = Math.min(100, Math.max(25, Number(msg.intensity) || 95));
        break;

      case 'STOP':
        active = false;
        loopPromise = null;
        break;
    }
  });

  async function runWorkerLoop() {
    let unnotifiedHashes = 0;
    const stride = Math.max(1, totalThreads);
    const offset = globalThreadId % stride;

    while (active) {
      if (!currentJob || !currentJob.jobId || !currentJob.coinb1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const job = currentJob;
      const en2Val = (extranonce2Counter++ >>> 0).toString(16).padStart(extranonce2Size * 2, '0');

      // 1. Build Coinbase Transaction
      const coinbaseHex = job.coinb1 + extranonce1 + en2Val + (job.coinb2 || '');
      const coinbaseHash = dsha256(Buffer.from(coinbaseHex, 'hex'));

      // 2. Build Merkle Root
      const merkleRoot = computeMerkleRoot(coinbaseHash, job.merkleBranch || []);

      // 3. Prepare Block Header
      const prevHashBuf = job.prevHash ? parseStratumPrevHash(job.prevHash) : Buffer.alloc(32);
      const version = job.version || '20000000';
      const ntime = job.ntime || (Math.floor(Date.now() / 1000)).toString(16);
      const nbits = job.nbits || '1b44b419';

      const headerBuf = buildBlockHeader(version, prevHashBuf, merkleRoot, ntime, nbits, 0);

      // 4. Batch Nonce Scan
      const batchSize = Math.max(200, Math.floor(1200 * (intensity / 100)));
      const baseNonce = (Math.floor(Math.random() * 0x1000000) * stride) >>> 0;

      for (let i = 0; i < batchSize; i++) {
        if (!active) break;

        const nonce = (baseNonce + (i * stride) + offset) >>> 0;
        headerBuf.writeUInt32LE(nonce, 76);

        const hash = dsha256(headerBuf);
        unnotifiedHashes++;

        if (hashMeetsTarget(hash, currentTargetBigInt)) {
          const nonceHex = nonce.toString(16).padStart(8, '0');
          parentPort?.postMessage({
            type: 'SHARE_FOUND',
            nodeIndex,
            globalThreadId,
            jobId: job.jobId,
            extranonce2: en2Val,
            ntime,
            nonceHex,
            diff: currentDiff
          });
        }
      }

      // Flush hash count to parent
      if (unnotifiedHashes >= 2000) {
        parentPort?.postMessage({
          type: 'HASH_BATCH',
          nodeIndex,
          globalThreadId,
          count: unnotifiedHashes
        });
        unnotifiedHashes = 0;
      }

      // Yield CPU according to intensity
      if (intensity >= 100) {
        await new Promise((resolve) => setImmediate(resolve));
      } else {
        const sleepMs = Math.max(1, Math.floor((100 - intensity) / 10));
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }

    if (unnotifiedHashes > 0) {
      parentPort?.postMessage({
        type: 'HASH_BATCH',
        nodeIndex,
        globalThreadId,
        count: unnotifiedHashes
      });
      unnotifiedHashes = 0;
    }
  }
}
