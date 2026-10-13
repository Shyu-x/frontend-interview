export function shortestPath(graph, start, goal) {
  if (!graph.has(start) || !graph.has(goal)) return null;
  const queue = [start]; let head = 0; const parent = new Map([[start, null]]);
  while (head < queue.length) {
    const node = queue[head++]; if (node === goal) break;
    for (const next of graph.get(node) ?? []) if (!parent.has(next)) { parent.set(next, node); queue.push(next); }
  }
  if (!parent.has(goal)) return null;
  const path = []; for (let node = goal; node !== null; node = parent.get(node)) path.push(node);
  return path.reverse();
}
