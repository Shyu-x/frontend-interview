export function uniqueWindowSummary(items) {
  if (!Array.isArray(items)) throw new TypeError('expected array');
  const lastSeen = new Map();
  let left = 0, maxLength = 0, start = 0, total = 0n;
  for (let right = 0; right < items.length; right++) {
    const previous = lastSeen.get(items[right]);
    if (previous !== undefined) left = Math.max(left, previous + 1);
    lastSeen.set(items[right], right);
    const length = right - left + 1;
    total += BigInt(length);
    if (length > maxLength) { maxLength = length; start = left; }
  }
  return { maxLength, start, end: start + maxLength, total };
}
