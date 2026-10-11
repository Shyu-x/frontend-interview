import { lstat, realpath } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

export type PermissionDecision = "allow" | "ask" | "deny";

export type PermissionRequest = {
  capability: "read" | "write" | "execute" | "network";
  target: string;
  destructive?: boolean;
};

export class PermissionGate {
  readonly workspace: string;
  readonly approve: (request: PermissionRequest) => Promise<boolean>;
  readonly #denied: Set<PermissionRequest["capability"]>;

  constructor(
    workspace: string,
    approve: (request: PermissionRequest) => Promise<boolean> = async () =>
      false,
    deniedCapabilities: readonly PermissionRequest["capability"][] = [],
  ) {
    this.workspace = workspace;
    this.approve = approve;
    this.#denied = new Set(deniedCapabilities);
  }

  decision(request: PermissionRequest): PermissionDecision {
    if (this.#denied.has(request.capability)) return "deny";
    if (
      request.destructive ||
      request.capability === "network" ||
      request.capability === "write"
    )
      return "ask";
    if (request.capability === "execute") return "ask";
    return "allow";
  }

  async authorize(request: PermissionRequest): Promise<void> {
    if (request.capability === "read" || request.capability === "write")
      await this.resolvePath(request.target);
    const decision = this.decision(request);
    if (decision === "deny") throw new Error(`权限拒绝: ${request.capability}`);
    if (decision === "ask" && !(await this.approve(request))) {
      throw new Error(`用户未批准: ${request.capability}`);
    }
  }

  async resolvePath(candidate: string): Promise<string> {
    const root = await realpath(this.workspace);
    const absolute = resolve(
      root,
      isAbsolute(candidate) ? relative(root, candidate) : candidate,
    );
    if (absolute === root) return root;
    const parent = await realpath(dirname(absolute));
    const resolved = resolve(parent, basename(absolute));
    const rel = relative(root, resolved);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
      throw new Error("路径越出工作区");

    try {
      const stat = await lstat(resolved);
      if (stat.isSymbolicLink()) {
        const target = await realpath(resolved);
        const targetRel = relative(root, target);
        if (
          targetRel === ".." ||
          targetRel.startsWith(`..${sep}`) ||
          isAbsolute(targetRel)
        )
          throw new Error("符号链接越出工作区");
        return target;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return resolved;
  }
}
