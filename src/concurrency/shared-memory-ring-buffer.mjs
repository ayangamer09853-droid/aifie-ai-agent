/**
 * Zero-Copy SharedArrayBuffer Lockless Ring Buffer v1.0
 * Pure Native Node.js ESM - Zero External Dependencies
 * 
 * High-frequency IPC mechanism using SharedArrayBuffer & Atomics for sub-microsecond
 * tick data streaming between worker threads and main event loop.
 */

export class SharedMemoryRingBuffer {
  /**
   * @param {number|Object} capacityOrOptions - Number of records or options object
   * @param {number} [recordSize=1] - Number of Float64 elements per record
   * @param {SharedArrayBuffer} [existingBuffer=null]
   */
  constructor(capacityOrOptions = 1024, recordSize = 1, existingBuffer = null) {
    let capacity = 1024;
    let size = 1;
    let buf = null;

    if (typeof capacityOrOptions === "object" && capacityOrOptions !== null) {
      capacity = capacityOrOptions.capacity || 1024;
      size = capacityOrOptions.recordSize || 1;
      buf = capacityOrOptions.existingBuffer || null;
    } else {
      capacity = Number(capacityOrOptions) || 1024;
      size = Number(recordSize) || 1;
      buf = existingBuffer;
    }

    this.capacity = capacity;
    this.recordSize = size;
    this.headerElements = 8; // 8 Int32 slots = 32 bytes (which is 4 Float64 elements)
    
    // Total bytes = header (32 bytes) + data (capacity * recordSize * 8 bytes)
    const dataByteLength = this.capacity * this.recordSize * Float64Array.BYTES_PER_ELEMENT;
    const totalByteLength = 32 + dataByteLength;

    if (buf instanceof SharedArrayBuffer) {
      this.sharedBuffer = buf;
    } else {
      this.sharedBuffer = new SharedArrayBuffer(totalByteLength);
    }

    this.headerInt32 = new Int32Array(this.sharedBuffer, 0, 8); // Atomics operate on Int32
    this.dataFloat64 = new Float64Array(this.sharedBuffer, 32, this.capacity * this.recordSize);

    // If newly created, initialize header
    if (!buf) {
      Atomics.store(this.headerInt32, 0, 0); // writeIndex
      Atomics.store(this.headerInt32, 1, 0); // readIndex
      Atomics.store(this.headerInt32, 2, this.capacity);
      Atomics.store(this.headerInt32, 3, this.recordSize);
    }
  }

  getCount() {
    const writeIdx = Atomics.load(this.headerInt32, 0);
    const readIdx = Atomics.load(this.headerInt32, 1);
    return Math.max(0, writeIdx - readIdx);
  }

  /**
   * Writes a record or number locklessly using Atomics
   * @param {number|number[]} record
   * @returns {boolean} - true if written, false if buffer full
   */
  write(record) {
    const writeIdx = Atomics.load(this.headerInt32, 0);
    const readIdx = Atomics.load(this.headerInt32, 1);

    if ((writeIdx - readIdx) >= this.capacity) {
      return false; // overflow protection
    }

    const slot = writeIdx % this.capacity;
    const offset = slot * this.recordSize;

    if (Array.isArray(record)) {
      for (let i = 0; i < this.recordSize; i++) {
        this.dataFloat64[offset + i] = Number(record[i] || 0);
      }
    } else {
      this.dataFloat64[offset] = Number(record || 0);
    }

    Atomics.add(this.headerInt32, 0, 1);
    return true;
  }

  push(value) {
    return this.write(value);
  }

  /**
   * Reads next available record or float from buffer
   * @returns {number|number[]|null}
   */
  read() {
    const writeIdx = Atomics.load(this.headerInt32, 0);
    const readIdx = Atomics.load(this.headerInt32, 1);

    if (readIdx >= writeIdx) {
      return null; // empty
    }

    const slot = readIdx % this.capacity;
    const offset = slot * this.recordSize;

    let result;
    if (this.recordSize === 1) {
      result = this.dataFloat64[offset];
    } else {
      result = new Array(this.recordSize);
      for (let i = 0; i < this.recordSize; i++) {
        result[i] = this.dataFloat64[offset + i];
      }
    }

    Atomics.add(this.headerInt32, 1, 1);
    return result;
  }

  pop() {
    return this.read();
  }

  /**
   * Drains up to maxCount records (or all available if omitted)
   * @param {number} [maxCount]
   * @returns {Array}
   */
  drain(maxCount = Infinity) {
    const batch = [];
    let item;
    let count = 0;
    while (count < maxCount && (item = this.read()) !== null) {
      batch.push(item);
      count++;
    }
    return batch;
  }

  getMetrics() {
    const writeIdx = Atomics.load(this.headerInt32, 0);
    const readIdx = Atomics.load(this.headerInt32, 1);
    const count = Math.max(0, writeIdx - readIdx);

    return {
      capacity: this.capacity,
      recordSize: this.recordSize,
      availableCount: count,
      count,
      occupancyPercent: Number(((count / this.capacity) * 100).toFixed(2)),
      totalWrites: writeIdx,
      totalReads: readIdx
    };
  }

  getTelemetry() {
    return this.getMetrics();
  }
}
