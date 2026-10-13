// Convert a canvas point to a node-local point using the inverse 2D affine matrix.
// Matrices follow Canvas DOMMatrix ordering: [a,b,c,d,e,f].
export function inversePoint([a, b, c, d, e, f], x, y) {
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;
  const px = x - e, py = y - f;
  return { x: (d * px - c * py) / determinant, y: (-b * px + a * py) / determinant };
}

export function hitTestRect(matrix, point, rect) {
  const local = inversePoint(matrix, point.x, point.y);
  return local !== null && local.x >= rect.x && local.y >= rect.y && local.x <= rect.x + rect.width && local.y <= rect.y + rect.height;
}
