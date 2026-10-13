// Compute RFC 9111 current_age from the four timing observations.
// Keep milliseconds internally so tests can use a fake clock without rounding drift.
export function currentAgeMs({ dateMs, ageSeconds = 0, requestMs, responseMs, nowMs }) {
  for (const [name, value] of Object.entries({ dateMs, ageSeconds, requestMs, responseMs, nowMs })) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and non-negative`);
  }
  const apparentAge = Math.max(0, responseMs - dateMs);
  const responseDelay = Math.max(0, responseMs - requestMs);
  const correctedAgeValue = ageSeconds * 1000 + responseDelay;
  const correctedInitialAge = Math.max(apparentAge, correctedAgeValue);
  const residentTime = Math.max(0, nowMs - responseMs);
  return correctedInitialAge + residentTime;
}

export function freshness({ ageMs, maxAgeSeconds, shared = false, sMaxageSeconds }) {
  const lifetime = shared && Number.isFinite(sMaxageSeconds) ? sMaxageSeconds : maxAgeSeconds;
  if (!Number.isFinite(ageMs) || ageMs < 0 || !Number.isFinite(lifetime) || lifetime < 0) {
    throw new RangeError('ageMs and the selected lifetime must be finite and non-negative');
  }
  return { fresh: ageMs < lifetime * 1000, remainingMs: Math.max(0, lifetime * 1000 - ageMs) };
}
