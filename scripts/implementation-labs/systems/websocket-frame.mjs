// Decode one unfragmented WebSocket frame. Message fragmentation and extensions are deliberately left to a higher layer.
export function decodeFrame(buffer, { maxPayload = 1024 * 1024 } = {}) {
  if (buffer.length < 2) return null;
  const first = buffer[0], second = buffer[1], fin = Boolean(first & 0x80), opcode = first & 0x0f, masked = Boolean(second & 0x80);
  if ((first & 0x70) !== 0 || !fin) throw new Error('RSV bits and fragmented frames are unsupported');
  if (![1, 2, 8, 9, 10].includes(opcode)) throw new Error('unsupported opcode');
  if (!masked) throw new Error('client-to-server frame must be masked');
  let length = second & 0x7f, offset = 2;
  if (length === 126) { if (buffer.length < 4) return null; length = buffer.readUInt16BE(2); offset = 4; if (length < 126) throw new Error('non-minimal payload length'); }
  else if (length === 127) { if (buffer.length < 10) return null; const n = buffer.readBigUInt64BE(2); if (n < 65536n || n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('invalid 64-bit payload length'); length = Number(n); offset = 10; }
  if (opcode >= 8 && length > 125) throw new Error('control frame payload exceeds 125 bytes');
  if (opcode === 8 && length === 1) throw new Error('close payload cannot contain a one-byte status code');
  if (length > maxPayload) throw new Error('payload exceeds configured limit');
  if (buffer.length < offset + 4 + length) return null;
  const mask = buffer.subarray(offset, offset + 4), payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length));
  for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
  return { frame: { fin, opcode, payload }, bytesRead: offset + 4 + length };
}
