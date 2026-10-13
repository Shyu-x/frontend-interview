const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const digits = new Map([...alphabet].map((char, index) => [char, index]));

// Decode Source Map Base64 VLQ values, preserving continuation and sign-bit semantics.
export function decodeVlq(segment) {
  const values = []; let value = 0n, shift = 0n, continued = false;
  for (const char of segment) {
    const digit = digits.get(char);
    if (digit === undefined) throw new TypeError(`invalid base64 VLQ character: ${char}`);
    continued = Boolean(digit & 32);
    value |= BigInt(digit & 31) << shift;
    if (continued) { shift += 5n; if (shift > 60n) throw new RangeError('VLQ continuation is too long'); continue; }
    const magnitude = value >> 1n;
    if (magnitude > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('VLQ exceeds safe integer range');
    values.push(Number(value & 1n ? -magnitude : magnitude));
    value = 0n; shift = 0n;
  }
  if (continued) throw new TypeError('truncated VLQ continuation');
  return values;
}

export function encodeVlq(number) {
  if (!Number.isSafeInteger(number)) throw new TypeError('VLQ input must be a safe integer');
  let value = (BigInt(Math.abs(number)) * 2n) + (number < 0 ? 1n : 0n), out = '';
  do {
    let digit = Number(value % 32n); value /= 32n;
    if (value) digit |= 32;
    out += alphabet[digit];
  } while (value !== 0n);
  return out;
}
