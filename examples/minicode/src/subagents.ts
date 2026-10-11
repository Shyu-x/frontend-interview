import { posix } from "node:path";
import { abortable } from "./abort.ts";

export type Evidence = {
  uri: string;
  summary: string;
};

export type TaskContract = {
  id: string;
  goal: string;
  nonGoals: string[];
  input: Record<string, unknown>;
  ownedPaths: string[];
  budget: { maxSteps: number; maxTokens: number; deadlineMs: number };
};

export type WorkerResult = {
  taskId: string;
  status: "ok" | "failed" | "cancelled";
  summary: string;
  evidence: Evidence[];
  usage: { steps: number; tokens: number };
  error?: string;
};

export type BudgetMeter = { charge(steps: number, tokens: number): void };
export type Worker = (
  contract: TaskContract,
  signal: AbortSignal,
  meter: BudgetMeter,
) => Promise<WorkerResult>;

export type OrchestrationReport = {
  results: WorkerResult[];
  metrics: {
    successRate: number;
    evidenceCoverage: number;
    duplicateEvidenceRate: number;
    writeConflictCount: number;
  };
};

export class SubagentOrchestrator {
  readonly concurrency: number;

  constructor(concurrency = 3) {
    if (!Number.isInteger(concurrency) || concurrency < 1)
      throw new Error("concurrency 必须是正整数");
    this.concurrency = concurrency;
  }

  async run(
    contracts: readonly TaskContract[],
    worker: Worker,
    parentSignal?: AbortSignal,
  ): Promise<OrchestrationReport> {
    contracts = structuredClone(contracts);
    const ids = new Set<string>();
    for (const contract of contracts) {
      if (
        !contract ||
        typeof contract.id !== "string" ||
        typeof contract.goal !== "string" ||
        !Array.isArray(contract.nonGoals) ||
        !contract.nonGoals.every((item) => typeof item === "string") ||
        !contract.input ||
        typeof contract.input !== "object" ||
        Array.isArray(contract.input) ||
        !Array.isArray(contract.ownedPaths) ||
        !contract.ownedPaths.every((item) => typeof item === "string") ||
        !contract.budget ||
        ![
          contract.budget.maxSteps,
          contract.budget.maxTokens,
          contract.budget.deadlineMs,
        ].every((value) => Number.isSafeInteger(value) && value >= 1)
      )
        throw new Error("任务合同结构不合法");
      if (!contract.id.trim() || ids.has(contract.id))
        throw new Error("任务 ID 必须非空且唯一");
      ids.add(contract.id);
      if (contract.budget.deadlineMs > 2_147_483_647)
        throw new Error("截止时间超过 Node 定时器范围");
      if (!contract.goal.trim()) throw new Error("任务目标不能为空");
      for (const value of Object.values(contract.budget)) {
        if (!Number.isSafeInteger(value) || value < 1)
          throw new Error("任务预算必须为正整数");
      }
      contract.ownedPaths.forEach(normalizeOwnedPath);
    }
    const writeConflictCount = countOwnershipConflicts(contracts);
    if (writeConflictCount > 0)
      throw new Error(`检测到 ${writeConflictCount} 个写入所有权冲突`);

    const results = new Array<WorkerResult>(contracts.length);
    let cursor = 0;
    const runners = Array.from(
      { length: Math.min(this.concurrency, contracts.length) },
      async () => {
        while (cursor < contracts.length) {
          const index = cursor++;
          const contract = contracts[index];
          if (!contract) return;
          results[index] = await this.#runOne(contract, worker, parentSignal);
        }
      },
    );
    await Promise.all(runners);
    return { results, metrics: calculateMetrics(results, writeConflictCount) };
  }

  async #runOne(
    contract: TaskContract,
    worker: Worker,
    parentSignal?: AbortSignal,
  ): Promise<WorkerResult> {
    const controller = new AbortController();
    const onParentAbort = () => controller.abort(parentSignal?.reason);
    parentSignal?.addEventListener("abort", onParentAbort, { once: true });
    if (parentSignal?.aborted) onParentAbort();
    const timer = setTimeout(
      () => controller.abort(new Error("子任务超时")),
      contract.budget.deadlineMs,
    );
    let steps = 0;
    let tokens = 0;
    const meter: BudgetMeter = {
      charge(nextSteps, nextTokens) {
        if (
          ![nextSteps, nextTokens].every(
            (value) => Number.isSafeInteger(value) && value >= 0,
          )
        ) {
          throw new Error("预算计量必须是非负整数");
        }
        controller.signal.throwIfAborted();
        steps += nextSteps;
        tokens += nextTokens;
        if (
          steps > contract.budget.maxSteps ||
          tokens > contract.budget.maxTokens
        ) {
          throw new Error("子任务超出独立预算");
        }
      },
    };
    try {
      controller.signal.throwIfAborted();
      const result = structuredClone(
        await abortable(
          () => worker(structuredClone(contract), controller.signal, meter),
          controller.signal,
        ),
      );
      validateResult(result);
      if (result.taskId !== contract.id)
        throw new Error("worker 返回了错误的 taskId");
      result.usage = {
        steps: Math.max(steps, result.usage.steps),
        tokens: Math.max(tokens, result.usage.tokens),
      };
      if (
        result.usage.steps > contract.budget.maxSteps ||
        result.usage.tokens > contract.budget.maxTokens
      ) {
        return {
          ...result,
          status: "failed",
          error: "子任务超出独立预算",
        };
      }
      if (result.status === "ok" && result.evidence.length === 0)
        throw new Error("成功结果必须提供证据");
      return result;
    } catch (error) {
      return {
        taskId: contract.id,
        status: controller.signal.aborted ? "cancelled" : "failed",
        summary: "",
        evidence: [],
        usage: { steps, tokens },
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onParentAbort);
    }
  }
}

export function countOwnershipConflicts(
  contracts: readonly TaskContract[],
): number {
  let conflicts = 0;
  for (let left = 0; left < contracts.length; left += 1) {
    for (let right = left + 1; right < contracts.length; right += 1) {
      const a = contracts[left];
      const b = contracts[right];
      if (!a || !b) continue;
      if (
        a.ownedPaths.some((path) =>
          b.ownedPaths.some((other) => overlaps(path, other)),
        )
      )
        conflicts += 1;
    }
  }
  return conflicts;
}

function normalizeOwnedPath(path: string): string {
  const normalized = posix
    .normalize(path.replaceAll("\\", "/"))
    .replace(/\/$/, "");
  if (
    !path.trim() ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    /[*?\[\]]/.test(normalized)
  ) {
    throw new Error("所有权路径必须是工作区相对路径，不支持通配符");
  }
  return normalized;
}

function overlaps(left: string, right: string): boolean {
  const a = normalizeOwnedPath(left);
  const b = normalizeOwnedPath(right);
  return (
    a === "." ||
    b === "." ||
    a === b ||
    a.startsWith(`${b}/`) ||
    b.startsWith(`${a}/`)
  );
}

function validateResult(result: WorkerResult): void {
  if (
    !result ||
    typeof result.taskId !== "string" ||
    !["ok", "failed", "cancelled"].includes(result.status) ||
    typeof result.summary !== "string" ||
    !Array.isArray(result.evidence) ||
    !result.evidence.every(
      (item) =>
        item &&
        typeof item.uri === "string" &&
        item.uri.trim() &&
        typeof item.summary === "string" &&
        item.summary.trim(),
    ) ||
    !result.usage ||
    ![result.usage.steps, result.usage.tokens].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
  ) {
    throw new Error("worker 返回结构不合法");
  }
}

function calculateMetrics(
  results: readonly WorkerResult[],
  writeConflictCount: number,
) {
  const succeeded = results.filter((result) => result.status === "ok");
  const evidence = succeeded.flatMap((result) =>
    result.evidence.map((item) => item.uri),
  );
  const uniqueEvidence = new Set(evidence);
  return {
    successRate: results.length === 0 ? 1 : succeeded.length / results.length,
    evidenceCoverage:
      succeeded.length === 0
        ? 0
        : succeeded.filter((result) => result.evidence.length > 0).length /
          succeeded.length,
    duplicateEvidenceRate:
      evidence.length === 0
        ? 0
        : (evidence.length - uniqueEvidence.size) / evidence.length,
    writeConflictCount,
  };
}
