export function lengthPrefixedDecoder(maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > 16 * 1024 * 1024) {
    throw new RangeError('maxBytes must be between 0 and 16 MiB');
  }
  const header = new Uint8Array(4);
  let headerUsed = 0;
  let payload = null;
  let payloadUsed = 0;
  let state = 'open';
  function checkOpen() {
    if (state !== 'open') throw new Error(`decoder ${state}`);
  }
  function fail(error) {
    state = 'failed';
    payload = null;
    payloadUsed = headerUsed = 0;
    throw error;
  }
  return {
    feed(chunk) {
      checkOpen();
      if (!(chunk instanceof Uint8Array)) return fail(new TypeError('chunk must be Uint8Array'));
      const output = [];
      let offset = 0;
      while (offset < chunk.length) {
        if (payload === null) {
          const take = Math.min(4 - headerUsed, chunk.length - offset);
          header.set(chunk.subarray(offset, offset + take), headerUsed);
          offset += take;
          headerUsed += take;
          if (headerUsed !== 4) continue;
          const length = new DataView(header.buffer).getUint32(0, false);
          if (length > maxBytes) return fail(new RangeError('frame exceeds maxBytes'));
          headerUsed = 0;
          payload = new Uint8Array(length);
          if (length === 0) { output.push(payload); payload = null; }
        } else {
          const take = Math.min(payload.length - payloadUsed, chunk.length - offset);
          payload.set(chunk.subarray(offset, offset + take), payloadUsed);
          payloadUsed += take;
          offset += take;
          if (payloadUsed === payload.length) {
            output.push(payload);
            payload = null;
            payloadUsed = 0;
          }
        }
      }
      return output;
    },
    end() {
      if (state === 'ended') return;
      checkOpen();
      if (headerUsed || payload !== null) return fail(new SyntaxError('truncated frame at EOF'));
      state = 'ended';
    },
    snapshot() { return { state, bufferedBytes: headerUsed + payloadUsed, allocatedBytes: payload?.length ?? 0 }; },
  };
}

export function createVersionedStore(entries) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  const records = new Map();
  function checkId(id) {
    if (typeof id !== 'string' || !id.length) throw new TypeError('id must be a nonempty string');
  }
  for (const entry of entries) {
    checkId(entry?.id);
    if (records.has(entry.id)) throw new RangeError('duplicate id');
    records.set(entry.id, { value: structuredClone(entry.value), version: 0 });
  }
  function record(id) {
    checkId(id);
    const current = records.get(id);
    if (!current) throw new RangeError('unknown id');
    return current;
  }
  return {
    read(id) { const current = record(id); return { id, version: current.version, value: structuredClone(current.value) }; },
    compareAndSwap(id, expectedVersion, newValue) {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new RangeError('invalid expectedVersion');
      const current = record(id);
      if (current.version !== expectedVersion) return { ok: false, currentVersion: current.version };
      if (current.version === Number.MAX_SAFE_INTEGER) throw new RangeError('version overflow');
      const copiedValue = structuredClone(newValue);
      current.value = copiedValue;
      current.version++;
      return { ok: true, version: current.version };
    },
  };
}

export function createHandlePool(capacity) {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100_000) throw new RangeError('capacity must be 1–100000');
  const slots = Array.from({ length: capacity }, () => ({ generation: 0, used: false, value: undefined }));
  const available = Array.from({ length: capacity }, (_, index) => capacity - index - 1);
  function slotFor(handle) {
    if (!handle || !Number.isInteger(handle.slot) || !Number.isSafeInteger(handle.generation)) throw new RangeError('invalid handle');
    const slot = slots[handle.slot];
    if (!slot || !slot.used || slot.generation !== handle.generation) throw new RangeError('stale handle');
    return slot;
  }
  return {
    allocate(value) {
      if (!available.length) throw new RangeError('pool full');
      const index = available.pop();
      const slot = slots[index];
      slot.used = true;
      slot.value = value;
      return Object.freeze({ slot: index, generation: slot.generation });
    },
    get(handle) { return slotFor(handle).value; },
    release(handle) {
      const slot = slotFor(handle);
      slot.value = undefined;
      slot.used = false;
      // Exhausted generations retire their slot; wrapping would resurrect an old handle.
      if (slot.generation !== Number.MAX_SAFE_INTEGER) {
        slot.generation++;
        available.push(handle.slot);
      }
    },
    snapshot() { return slots.map(({ generation, used }) => ({ generation, used })); },
  };
}
