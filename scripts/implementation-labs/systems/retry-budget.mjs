// Decide retries under one request-wide time budget; per-attempt limits alone can multiply latency.
export function nextRetry({ attempt, startedAt, now, deadlineAt, baseDelayMs = 100, maxDelayMs = 5000, random = Math.random }) {
  for (const n of [attempt, startedAt, now, deadlineAt, baseDelayMs, maxDelayMs]) if (!Number.isFinite(n)) throw new TypeError('retry inputs must be finite');
  if (!Number.isSafeInteger(attempt) || attempt < 1 || now < startedAt || deadlineAt < startedAt || baseDelayMs < 0 || maxDelayMs < baseDelayMs) throw new RangeError('invalid retry budget');
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.min(attempt - 1, 30));
  const sample = random();
  if (!(sample >= 0 && sample <= 1)) throw new RangeError('random must return a value in [0, 1]');
  const delayMs = Math.min(cap, Math.floor(sample * (cap + 1)));
  return now + delayMs < deadlineAt ? { retry: true, delayMs } : { retry: false, delayMs: null };
}
