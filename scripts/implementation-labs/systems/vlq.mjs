const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const digits = new Map([...alphabet].map((char, index) => [char, index]));

// ECMA-426 uses signed 32-bit values. BigInt avoids intermediate bitwise
// truncation but does not expand the format's permitted integer domain.
export function decodeVlq(segment) {
  const values = []; let value = 0n, shift = 0n, continued = false;
  for (const char of segment) {
    const digit = digits.get(char);
    if (digit === undefined) throw new TypeError(`invalid base64 VLQ character: ${char}`);
    continued = Boolean(digit & 32);
    value |= BigInt(digit & 31) << shift;
    if (continued) { shift += 5n; if (shift > 60n) throw new RangeError('VLQ continuation is too long'); continue; }
    const magnitude = value >> 1n;
    if (magnitude >= 2n ** 31n) throw new RangeError('VLQ exceeds ECMA-426 signed 32-bit range');
    // The sign-only value (B) represents -2^31, not JavaScript negative zero.
    values.push(value === 1n ? -(2 ** 31) : Number(value & 1n ? -magnitude : magnitude));
    value = 0n; shift = 0n;
  }
  if (continued) throw new TypeError('truncated VLQ continuation');
  return values;
}

export function encodeVlq(number) {
  if (!Number.isSafeInteger(number)) throw new TypeError('VLQ input must be a safe integer');
  if (number < -(2 ** 31) || number >= 2 ** 31) throw new RangeError('VLQ input exceeds ECMA-426 signed 32-bit range');
  let value = number === -(2 ** 31) ? 1n : (BigInt(Math.abs(number)) * 2n) + (number < 0 ? 1n : 0n), out = '';
  do {
    let digit = Number(value % 32n); value /= 32n;
    if (value) digit |= 32;
    out += alphabet[digit];
  } while (value !== 0n);
  return out;
}
