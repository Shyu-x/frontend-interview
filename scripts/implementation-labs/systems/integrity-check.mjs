import { createHash, timingSafeEqual } from 'node:crypto';

// Verify a fetched tarball against one SRI token. Unknown algorithms and malformed encodings fail closed.
export function verifyIntegrity(bytes, sri) {
  const tokens = sri.trim().split(/\s+/).map((token) => /^([a-z0-9]+)-([A-Za-z0-9+/]+={0,2})$/.exec(token));
  if (tokens.some((token) => !token) || tokens.length === 0) throw new TypeError('invalid SRI token list');
  const algorithms = [...new Set(tokens.map((token) => token[1]))];
  const strongest = algorithms.sort((a, b) => ({ sha512: 3, sha384: 2, sha256: 1 }[b] ?? 0) - ({ sha512: 3, sha384: 2, sha256: 1 }[a] ?? 0))[0];
  if (!['sha256', 'sha384', 'sha512'].includes(strongest)) throw new TypeError('unsupported SRI algorithm');
  const expected = tokens.filter((token) => token[1] === strongest).map((token) => Buffer.from(token[2], 'base64'));
  const actual = createHash(strongest).update(bytes).digest();
  return expected.some((candidate) => candidate.length === actual.length && timingSafeEqual(candidate, actual));
}
