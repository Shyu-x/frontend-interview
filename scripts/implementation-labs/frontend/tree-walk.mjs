// Iterative DFS keeps call-stack usage constant and checks cancellation between yields.
export function* walk(root, { signal } = {}) {
  const stack = [root]; const seen = new Set();
  while (stack.length) {
    if (signal?.aborted) return;
    const node = stack.pop(); if (seen.has(node)) continue; seen.add(node);
    yield node;
    const children = node.children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i]);
  }
}
