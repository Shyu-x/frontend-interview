// Cache the object identity until a write changes the version, as useSyncExternalStore requires.
export function createStore(initial) {
  let state = initial; let version = 0; let cachedVersion = -1; let cachedSnapshot;
  const listeners = new Set();
  return {
    getSnapshot() { if (cachedVersion !== version) { cachedVersion = version; cachedSnapshot = state; } return cachedSnapshot; },
    setState(next) { if (Object.is(next, state)) return; state = next; version += 1; for (const listener of [...listeners]) listener(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
