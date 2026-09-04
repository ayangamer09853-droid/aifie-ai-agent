import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  QuantumVault,
  encryptWithQuantumResistantVault,
  decryptWithQuantumResistantVault,
  splitSecretShamir,
  reconstructSecretShamir,
  generateLatticeKemKeyPair,
  encapsulateLatticeSecret,
  signLatticeData,
  verifyLatticeSignature,
  AntiTamperMemoryGuard,
  memoryGuard
} from '../src/quantum-resistant-vault.mjs';

test('Phase 8: Authenticated AES-256-GCM Envelope Encryption and Decryption', () => {
  const masterKey = 'MILITARY_GRADE_AIFIE_VAULT_KEY_9999!';
  const secretPayload = 'ALPACA_SECRET_KEY_LIVE_9823471098237410982374';
  const aad = 'USER:ALFIE_SOVEREIGN_NODE_1';

  const envelope = encryptWithQuantumResistantVault(secretPayload, masterKey, aad);

  assert.equal(envelope.algorithm, 'AES-256-GCM+PBKDF2-SHA512');
  assert.ok(envelope.ciphertext);
  assert.ok(envelope.salt);
  assert.ok(envelope.iv);
  assert.ok(envelope.tag);
  assert.equal(envelope.aad, aad);

  const decrypted = decryptWithQuantumResistantVault(envelope, masterKey);
  assert.equal(decrypted, secretPayload);
});

test('Phase 8: Tamper Detection rejects tampered ciphertext or authentication tag', () => {
  const masterKey = 'SECURE_PASSPHRASE_ALPHA_OMEGA';
  const secretPayload = 'BINANCE_API_KEY_LIVE_777777777777';

  const envelope = encryptWithQuantumResistantVault(secretPayload, masterKey);

  // Tamper with ciphertext by modifying last byte
  const tamperedEnvelope = {
    ...envelope,
    ciphertext: envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa')
  };

  assert.throws(() => {
    decryptWithQuantumResistantVault(tamperedEnvelope, masterKey);
  }, /TAMPER_DETECTED/);

  // Wrong password
  assert.throws(() => {
    decryptWithQuantumResistantVault(envelope, 'INCORRECT_MASTER_PASSPHRASE');
  }, /TAMPER_DETECTED/);
});

test('Phase 8: Shamir (3-of-5) Secret Splitting and Polynomial Reconstruction', () => {
  const originalSecret = 'CRYPTO_COLD_WALLET_SEED_PHRASE_2026';
  const n = 5;
  const k = 3;

  const shares = splitSecretShamir(originalSecret, n, k);
  assert.equal(shares.length, 5);

  // Reconstruct using any 3 shares (e.g. shares 0, 2, 4)
  const subsetShares = [shares[0], shares[2], shares[4]];
  const recovered = reconstructSecretShamir(subsetShares);
  assert.equal(recovered, originalSecret);

  // Reconstruct using another 3 shares (e.g. shares 1, 3, 4)
  const subsetShares2 = [shares[1], shares[3], shares[4]];
  const recovered2 = reconstructSecretShamir(subsetShares2);
  assert.equal(recovered2, originalSecret);
});

test('Phase 8: Lattice-Based Post-Quantum KEM and Signature Verification', () => {
  // Lattice Key Encapsulation Mechanism
  const kemKeys = generateLatticeKemKeyPair(4);
  assert.equal(kemKeys.algorithm, 'ML-KEM-768-LATTICE');
  assert.ok(kemKeys.publicKey);
  assert.ok(kemKeys.privateKey);

  const kemEncapsulation = encapsulateLatticeSecret(kemKeys.publicKey);
  assert.ok(kemEncapsulation.sharedSecret);
  assert.ok(kemEncapsulation.ciphertext);

  // Lattice Digital Signature (ML-DSA / Dilithium)
  const message = 'ORDER_INTENT:BUY_100_BTC_AT_SUPPORT';
  const sig = signLatticeData(message, kemKeys.privateKey);
  assert.equal(sig.algorithm, 'ML-DSA-65-DILITHIUM');

  const isValid = verifyLatticeSignature(message, sig.signature, kemKeys.privateKey);
  assert.equal(isValid, true);

  const isInvalid = verifyLatticeSignature('TAMPERED_ORDER_MESSAGE', sig.signature, kemKeys.privateKey);
  assert.equal(isInvalid, false);
});

test('Phase 8: Anti-Tamper Memory Guard zeroizes buffers on command', () => {
  const localGuard = new AntiTamperMemoryGuard();
  const secretBuf = Buffer.from('CRITICAL_API_SECRET_IN_MEMORY', 'utf8');

  localGuard.track(secretBuf);
  assert.equal(localGuard.getHealth().activeBuffers, 1);

  // Explicit wipe
  localGuard.wipeAll();
  assert.equal(localGuard.getHealth().isCompromised, true);
  // Verify buffer was zero-filled
  assert.ok(secretBuf.every(byte => byte === 0));
});

test('Phase 8: QuantumVault State Manager handles secure storage and master key rotation', () => {
  const vault = new QuantumVault('INITIAL_PASSPHRASE_V1');
  const storeRes = vault.storeSecret('BINANCE_API_KEY', 'TEST_BINANCE_SECRET_12345');
  assert.equal(storeRes.status, 'SECURED');
  assert.equal(storeRes.version, 1);

  const retrieved = vault.retrieveSecret('BINANCE_API_KEY');
  assert.equal(retrieved, 'TEST_BINANCE_SECRET_12345');

  // Rotate key to V2
  const rotateRes = vault.rotateMasterKey('NEW_POST_QUANTUM_PASSPHRASE_V2');
  assert.equal(rotateRes.status, 'KEY_ROTATED');
  assert.equal(rotateRes.newVersion, 2);

  const retrievedAfterRotate = vault.retrieveSecret('BINANCE_API_KEY');
  assert.equal(retrievedAfterRotate, 'TEST_BINANCE_SECRET_12345');

  const status = vault.getStatus();
  assert.equal(status.vaultStatus, 'QUANTUM_ENCRYPTED_ACTIVE');
  assert.equal(status.keyVersion, 2);
  assert.equal(status.totalSecrets, 1);
});

test('Server Integration: Phase 8 Quantum-Resistant Security Vault Endpoints', async () => {
  const { app } = await import('../server.mjs');
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. POST /api/security/vault/encrypt
    const encRes = await fetch(`${baseUrl}/api/security/vault/encrypt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plaintext: 'SUPER_SECRET_PAYLOAD', masterPassword: 'TEST_KEY' })
    });
    assert.equal(encRes.status, 200);
    const encData = await encRes.json();
    assert.equal(encData.success, true);
    assert.ok(encData.envelope.ciphertext);

    // 2. POST /api/security/vault/decrypt
    const decRes = await fetch(`${baseUrl}/api/security/vault/decrypt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope: encData.envelope, masterPassword: 'TEST_KEY' })
    });
    assert.equal(decRes.status, 200);
    const decData = await decRes.json();
    assert.equal(decData.success, true);
    assert.equal(decData.decrypted, 'SUPER_SECRET_PAYLOAD');

    // 3. POST /api/security/vault/split-secret
    const splitRes = await fetch(`${baseUrl}/api/security/vault/split-secret`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'MY_SECRET_KEY', n: 5, k: 3 })
    });
    assert.equal(splitRes.status, 200);
    const splitData = await splitRes.json();
    assert.equal(splitData.success, true);
    assert.equal(splitData.count, 5);
    assert.equal(splitData.shares.length, 5);

    // 4. POST /api/security/vault/recover-secret
    const recRes = await fetch(`${baseUrl}/api/security/vault/recover-secret`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shares: [splitData.shares[0], splitData.shares[1], splitData.shares[4]] })
    });
    assert.equal(recRes.status, 200);
    const recData = await recRes.json();
    assert.equal(recData.success, true);
    assert.equal(recData.secret, 'MY_SECRET_KEY');

    // 5. POST /api/security/vault/kem-keypair
    const kemRes = await fetch(`${baseUrl}/api/security/vault/kem-keypair`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dimension: 4 })
    });
    assert.equal(kemRes.status, 200);
    const kemData = await kemRes.json();
    assert.equal(kemData.success, true);
    assert.ok(kemData.publicKey);

    // 6. POST /api/security/vault/kem-encapsulate
    const encapRes = await fetch(`${baseUrl}/api/security/vault/kem-encapsulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicKey: kemData.publicKey })
    });
    assert.equal(encapRes.status, 200);
    const encapData = await encapRes.json();
    assert.equal(encapData.success, true);
    assert.ok(encapData.sharedSecret);

    // 7. POST /api/security/vault/sign
    const signRes = await fetch(`${baseUrl}/api/security/vault/sign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'TRADE:BUY:ETH', privateKey: kemData.privateKey })
    });
    assert.equal(signRes.status, 200);
    const signData = await signRes.json();
    assert.equal(signData.success, true);
    assert.ok(signData.signature);

    // 8. POST /api/security/vault/verify
    const verRes = await fetch(`${baseUrl}/api/security/vault/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'TRADE:BUY:ETH', signature: signData.signature, privateKey: kemData.privateKey })
    });
    assert.equal(verRes.status, 200);
    const verData = await verRes.json();
    assert.equal(verData.success, true);
    assert.equal(verData.valid, true);

    // 9. GET /api/security/vault/status
    const statRes = await fetch(`${baseUrl}/api/security/vault/status`);
    assert.equal(statRes.status, 200);
    const statData = await statRes.json();
    assert.equal(statData.success, true);
    assert.equal(statData.vaultStatus, 'QUANTUM_ENCRYPTED_ACTIVE');
  } finally {
    server.close();
  }
});
