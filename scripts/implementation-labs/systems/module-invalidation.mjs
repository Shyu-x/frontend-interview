// Track importer edges and return the minimum affected HMR set after a changed module.
export class ModuleGraph {
  #imports = new Map(); #importers = new Map();
  add(id, dependencies = []) {
    // Remove stale reverse edges before replacing dependencies; otherwise old importers survive graph updates.
    for (const dependency of this.#imports.get(id) ?? []) {
      const parents = this.#importers.get(dependency);
      parents?.delete(id);
      if (parents?.size === 0) this.#importers.delete(dependency);
    }
    this.#imports.set(id, new Set(dependencies));
    for (const dependency of dependencies) {
      if (!this.#importers.has(dependency)) this.#importers.set(dependency, new Set());
      this.#importers.get(dependency).add(id);
    }
  }
  invalidate(changed, accepts = new Set()) {
    const visited = new Set(), queue = [changed], boundaries = new Set();
    while (queue.length) {
      const id = queue.shift(); if (visited.has(id)) continue;
      visited.add(id);
      if (accepts.has(id)) { boundaries.add(id); continue; }
      const parents = this.#importers.get(id);
      if (!parents?.size) return { fullReload: true, invalidated: visited, boundaries };
      queue.push(...parents);
    }
    // A closed cycle with no accept boundary cannot produce a safe update either.
    return { fullReload: boundaries.size === 0, invalidated: visited, boundaries };
  }
}
