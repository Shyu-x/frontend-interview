export function moveActive(options, active, key, { composing = false } = {}) {
  if (composing || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return active;
  const enabled = options.flatMap((option, index) => option.disabled ? [] : [index]);
  if (!enabled.length) return -1;
  if (key === 'Home') return enabled[0]; if (key === 'End') return enabled.at(-1);
  const position = enabled.indexOf(active); const delta = key === 'ArrowDown' ? 1 : -1;
  return enabled[(position + delta + enabled.length) % enabled.length];
}
