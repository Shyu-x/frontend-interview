import assert from 'node:assert/strict';

const componentBytes = new Map([[5120, 1], [5121, 1], [5122, 2],
  [5123, 2], [5125, 4], [5126, 4]]);
const components = new Map([['SCALAR', 1], ['VEC2', 2], ['VEC3', 3],
  ['VEC4', 4]]); // 矩阵列 padding 未实现，拒绝而不是返回错误尺寸。

function accessorByteLength(accessor, byteStride) {
  const scalarBytes = componentBytes.get(accessor.componentType);
  const componentCount = components.get(accessor.type);
  if (!scalarBytes || !componentCount || !Number.isInteger(accessor.count) || accessor.count < 1) {
    throw new TypeError('unsupported or invalid accessor');
  }
  const elementBytes = scalarBytes * componentCount;
  const stride = byteStride ?? elementBytes;
  if (!Number.isSafeInteger(stride) || stride < elementBytes || stride % scalarBytes !== 0) {
    throw new RangeError('invalid stride');
  }
  return (accessor.count - 1) * stride + elementBytes;
}

function vertexPayloadBytes({ vertexCount, attributes, indexCount, indexBytes }) {
  const vertexBytes = attributes.reduce((sum, attribute) =>
    sum + accessorByteLength({ ...attribute, count: vertexCount }, attribute.byteStride), 0);
  return vertexBytes + indexCount * indexBytes;
}

// 只支持 float32 VEC3，显式读小端字节并检查 span，非完整 glTF loader。
function readFloatVec3(buffer, byteOffset, count, byteStride = 12) {
  const length = accessorByteLength({ componentType: 5126, type: 'VEC3', count }, byteStride);
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0 || byteOffset % 4 !== 0 ||
      byteOffset + length > buffer.byteLength) throw new RangeError('accessor bounds');
  const view = new DataView(buffer);
  return Array.from({ length: count }, (_, index) => {
    const start = byteOffset + index * byteStride;
    return [0, 4, 8].map(offset => view.getFloat32(start + offset, true));
  });
}

const buffer = new ArrayBuffer(4 + 3 * 16);
const expected = [[1.25, -2, 3], [4, 5.5, 6], [-7, 8, 9]];
const view = new DataView(buffer);
for (let vertex = 0; vertex < expected.length; vertex++) {
  for (let component = 0; component < 3; component++) {
    view.setFloat32(4 + vertex * 16 + component * 4, expected[vertex][component], true);
  }
  view.setUint32(4 + vertex * 16 + 12, 0xff00ffff, true); // 交错颜色，不能当下一位置。
}
assert.deepEqual(readFloatVec3(buffer, 4, 3, 16), expected);
assert.throws(() => readFloatVec3(buffer, 4, 4, 16), /bounds/);
assert.throws(() => readFloatVec3(buffer, 2, 3, 16), /bounds/);
assert.throws(() => accessorByteLength({ componentType: 5121, type: 'MAT3', count: 1 }), /unsupported/);

const positionBytes = accessorByteLength({ componentType: 5126, type: 'VEC3', count: 1000 });
assert.equal(positionBytes, 12_000);
assert.equal(accessorByteLength({ componentType: 5123, type: 'VEC2', count: 10 }, 8), 76);
const meshBytes = vertexPayloadBytes({ vertexCount: 1000,
  attributes: [{ componentType: 5126, type: 'VEC3' }, { componentType: 5121, type: 'VEC4' }],
  indexCount: 3000, indexBytes: 2 });
assert.equal(meshBytes, 22_000);
assert.throws(() => accessorByteLength({ componentType: 5126, type: 'VEC3', count: 10 }, 8), /stride/);
console.log(`position=${positionBytes} B; estimated mesh payload=${meshBytes} B`);
