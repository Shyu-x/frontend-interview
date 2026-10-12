const corePattern = '(0|[1-9][0-9]*)';
const pattern = new RegExp(`^${corePattern}\\.${corePattern}\\.${corePattern}(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$`);
const numeric = value => /^[0-9]+$/.test(value);
const order = (a, b) => a === b ? 0 : a < b ? -1 : 1;

export function parseVersion(value) {
  // 教学实现的资源上限，不是 SemVer 规范限制。
  if (typeof value !== 'string' || value.length > 512) throw new TypeError('invalid version');
  const match = pattern.exec(value);
  if (!match || match[0] !== value) throw new TypeError('invalid version');
  const prerelease = match[4]?.split('.') ?? [];
  if (prerelease.some(part => numeric(part) && part.length > 1 && part[0] === '0')) {
    throw new TypeError('numeric prerelease must not have leading zeros');
  }
  return { core: match.slice(1, 4).map(BigInt), prerelease, build: match[5]?.split('.') ?? [] };
}

export function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right);
  for (let index = 0; index < 3; index++) {
    const difference = order(a.core[index], b.core[index]);
    if (difference) return difference;
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length ? -1 : 1;
  }
  for (let index = 0; index < Math.min(a.prerelease.length, b.prerelease.length); index++) {
    const x = a.prerelease[index], y = b.prerelease[index];
    if (x === y) continue;
    const nx = numeric(x), ny = numeric(y);
    if (nx && ny) return order(BigInt(x), BigInt(y));
    if (nx !== ny) return nx ? -1 : 1;
    return order(x, y); // 输入被限制为 ASCII，与 locale 无关。
  }
  return order(a.prerelease.length, b.prerelease.length);
}
