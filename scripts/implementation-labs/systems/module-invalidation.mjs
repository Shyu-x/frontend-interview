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
    // Every invalidated branch must reach an accepting boundary. One accepted
    // sibling cannot make a separate closed importer cycle safe to update.
    const covered = new Set(boundaries);
    const pending = [...boundaries];
    for (let cursor = 0; cursor < pending.length; cursor++) {
      for (const dependency of this.#imports.get(pending[cursor]) ?? []) {
        if (!visited.has(dependency) || covered.has(dependency)) continue;
        covered.add(dependency);
        pending.push(dependency);
      }
    }
    return { fullReload: [...visited].some(id => !covered.has(id)), invalidated: visited, boundaries };
  }
}
