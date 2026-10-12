import assert from 'node:assert/strict';

// Affine matrices use Canvas-style column vectors: [a c e; b d f; 0 0 1].
function invert([a, b, c, d, e, f]) {
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) throw new RangeError('singular transform');
  return [d / det, -b / det, -c / det, a / det,
    (c * f - d * e) / det, (b * e - a * f) / det];
}

function transformPoint([a, b, c, d, e, f], x, y) {
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

function containsLocalPoint(inverseWorld, screenPoint, bounds) {
  const local = transformPoint(inverseWorld, screenPoint.x, screenPoint.y);
  return local.x >= bounds.x && local.x <= bounds.x + bounds.width &&
    local.y >= bounds.y && local.y <= bounds.y + bounds.height;
}

// A translated, rotated, and scaled local box. Transform its center forward,
// then use the inverse to prove hit testing returns to the local box.
const angle = Math.PI / 6;
const scale = 2;
const world = [scale * Math.cos(angle), scale * Math.sin(angle),
  -scale * Math.sin(angle), scale * Math.cos(angle), 40, -12];
const box = { x: 0, y: 0, width: 10, height: 6 };
const center = transformPoint(world, 5, 3);
const inverseWorld = invert(world);

assert.equal(containsLocalPoint(inverseWorld, center, box), true);
assert.equal(containsLocalPoint(inverseWorld, { x: center.x + 40, y: center.y }, box), false);
assert.throws(() => invert([1, 0, 0, 0, 0, 0]), /singular transform/);
console.log('scene hit-test assertions passed');
