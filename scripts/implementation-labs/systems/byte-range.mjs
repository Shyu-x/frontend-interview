// Parse one RFC 9110 byte range against a known representation length.
// Returning null means the range is unsatisfiable; malformed syntax throws so callers can distinguish 400 from 416.
export function parseByteRange(header, size) {
  if (!Number.isSafeInteger(size) || size < 0) throw new RangeError('size must be a non-negative safe integer');
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!match || (!match[1] && !match[2])) throw new TypeError('expected one bytes=a-b range');
  const [, startText, endText] = match;
  if (!startText) {
    const suffix = Number(endText);
    if (!Number.isSafeInteger(suffix) || suffix <= 0 || size === 0) return null;
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(startText);
  const requestedEnd = endText ? Number(endText) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= size || requestedEnd < start) return null;
  return { start, end: Math.min(requestedEnd, size - 1) };
}
