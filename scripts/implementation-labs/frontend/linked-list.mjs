export function createList() {
  const root = { value: undefined }; root.next = root; root.prev = root; let size = 0;
  function insertAfter(node, value) { const item = { value, prev: node, next: node.next }; node.next.prev = item; node.next = item; size += 1; return item; }
  function remove(item) { if (item === root || !item.next) return false; item.prev.next = item.next; item.next.prev = item.prev; item.next = null; item.prev = null; size -= 1; return true; }
  return { get size() { return size; }, push(value) { return insertAfter(root.prev, value); }, unshift(value) { return insertAfter(root, value); }, remove, values() { const out = []; for (let n = root.next; n !== root; n = n.next) out.push(n.value); return out; } };
}
