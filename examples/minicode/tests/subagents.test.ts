import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import {
  countOwnershipConflicts,
  SubagentOrchestrator,
  type TaskContract,
  type Worker,
} from "../src/subagents.ts";

function contract(id: string, ownedPaths: string[] = []): TaskContract {
  return {
    id,
    goal: `完成 ${id}`,
    nonGoals: ["不修改范围外文件"],
    input: {},
    ownedPaths,
    budget: { maxSteps: 5, maxTokens: 1_000, deadlineMs: 1_000 },
  };
}

const worker: Worker = async (task) => ({
  taskId: task.id,
  status: "ok",
  summary: `${task.goal} 已完成`,
  evidence: [{ uri: `file://${task.id}`, summary: "测试证据" }],
  usage: { steps: 2, tokens: 100 },
});

test("子 Agent 保持输入顺序并计算证据指标", async () => {
  const report = await new SubagentOrchestrator(2).run(
    [contract("a"), contract("b")],
    worker,
  );
  assert.deepEqual(
    report.results.map((result) => result.taskId),
    ["a", "b"],
  );
  assert.equal(report.metrics.successRate, 1);
  assert.equal(report.metrics.evidenceCoverage, 1);
  assert.equal(report.metrics.duplicateEvidenceRate, 0);
});

test("部分失败不会抹掉成功结果", async () => {
  const flaky: Worker = async (task, signal, meter) => {
    if (task.id === "bad") throw new Error("worker failed");
    return worker(task, signal, meter);
  };
  const report = await new SubagentOrchestrator(2).run(
    [contract("ok"), contract("bad")],
    flaky,
  );
  assert.equal(report.results[0]?.status, "ok");
  assert.equal(report.results[1]?.status, "failed");
  assert.equal(report.metrics.successRate, 0.5);
});

test("重叠写入所有权在执行前失败", async () => {
  const tasks = [
    contract("a", ["src/shared.ts"]),
    contract("b", ["src/shared.ts"]),
  ];
  assert.equal(countOwnershipConflicts(tasks), 1);
  await assert.rejects(
    () => new SubagentOrchestrator().run(tasks, worker),
    /所有权冲突/,
  );
});

test("每个子任务独立核算预算", async () => {
  const overBudget: Worker = async (task) => ({
    taskId: task.id,
    status: "ok",
    summary: "声称完成",
    evidence: [],
    usage: { steps: 99, tokens: 50_000 },
  });
  const report = await new SubagentOrchestrator().run(
    [contract("expensive"), contract("other")],
    overBudget,
  );
  assert.equal(report.results[0]?.status, "failed");
  assert.equal(report.results[1]?.status, "failed");
  assert.match(report.results[0]?.error ?? "", /独立预算/);
});

test("父任务取消会传播到所有运行中的子任务", async () => {
  const slow: Worker = async (task, signal, meter) => {
    await delay(5_000, undefined, { signal });
    return worker(task, signal, meter);
  };
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error("parent cancelled")), 10);
  const report = await new SubagentOrchestrator(2).run(
    [contract("a"), contract("b")],
    slow,
    controller.signal,
  );
  assert.ok(report.results.every((result) => result.status === "cancelled"));
});
