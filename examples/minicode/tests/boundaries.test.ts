import assert from "node:assert/strict";
import test from "node:test";
import { AgentLoop } from "../src/agent.ts";
import { abortable } from "../src/abort.ts";
import { FakeModel } from "../src/fake-model.ts";
import {
  SubagentOrchestrator,
  type TaskContract,
  type Worker,
} from "../src/subagents.ts";
import { ToolRegistry } from "../src/tools.ts";

const task: TaskContract = {
  id: "a",
  goal: "goal",
  nonGoals: [],
  input: {},
  ownedPaths: [],
  budget: { maxSteps: 1, maxTokens: 10, deadlineMs: 1_000 },
};
const worker: Worker = async (contract) => ({
  taskId: contract.id,
  status: "ok",
  summary: "ok",
  evidence: [{ uri: "test:a", summary: "assertion" }],
  usage: { steps: 1, tokens: 1 },
});

test("调用后同步取消不启动尚未执行的 operation", async () => {
  const controller = new AbortController();
  let started = false;
  const pending = abortable(async () => {
    started = true;
    return "done";
  }, controller.signal);
  controller.abort(new Error("cancel before microtask"));
  await assert.rejects(() => pending, /cancel before microtask/);
  assert.equal(started, false);
});

test("合同边界拒绝空目标、非法预算与错误数组", async () => {
  const orchestrator = new SubagentOrchestrator();
  for (const contract of [
    { ...task, id: "" },
    { ...task, goal: "" },
    { ...task, budget: { ...task.budget, maxSteps: 0 } },
    { ...task, nonGoals: null },
  ]) {
    await assert.rejects(() =>
      orchestrator.run([contract as TaskContract], worker),
    );
  }
});

test("所有权拒绝绝对路径、通配符，并规范化反斜杠", async () => {
  const orchestrator = new SubagentOrchestrator();
  for (const path of ["/etc", "C:\\secret", "src/*.ts"])
    await assert.rejects(
      () => orchestrator.run([{ ...task, ownedPaths: [path] }], worker),
      /相对路径/,
    );
  await assert.rejects(
    () =>
      orchestrator.run(
        [
          { ...task, ownedPaths: ["src\\a"] },
          { ...task, id: "b", ownedPaths: ["src/a/index.ts"] },
        ],
        worker,
      ),
    /冲突/,
  );
});

test("错 taskId 与非对象结果记为单项失败", async () => {
  const orchestrator = new SubagentOrchestrator();
  const wrongId = await orchestrator.run([task], async (...args) => ({
    ...(await worker(...args)),
    taskId: "wrong",
  }));
  assert.match(wrongId.results[0]?.error ?? "", /taskId/);
  const malformed = await orchestrator.run([task], async () => null as never);
  assert.equal(malformed.results[0]?.status, "failed");
});

test("重复模型调用 ID 与负 token 不进入工具执行", async () => {
  const call = { id: "a", name: "missing", arguments: {} };
  await assert.rejects(
    () =>
      new AgentLoop(
        new FakeModel([{ content: "", toolCalls: [call, call] }]),
        new ToolRegistry(),
      ).run("x"),
    /结构/,
  );
  await assert.rejects(
    () =>
      new AgentLoop(
        new FakeModel([
          {
            content: "",
            toolCalls: [],
            usage: { inputTokens: -1, outputTokens: 0 },
          },
        ]),
        new ToolRegistry(),
      ).run("x"),
    /结构/,
  );
});

test("同一会话并发运行被拒绝，取消后保留完整 observation", async () => {
  const controller = new AbortController();
  const registry = new ToolRegistry();
  registry.register({
    name: "slow",
    description: "slow",
    inputSchema: {},
    mutates: false,
    validate: (input: unknown): input is object => typeof input === "object",
    execute: () => new Promise(() => {}),
  });
  const model = new FakeModel([
    {
      content: "",
      toolCalls: [
        { id: "a", name: "slow", arguments: {} },
        { id: "b", name: "slow", arguments: {} },
      ],
    },
  ]);
  const agent = new AgentLoop(model, registry);
  const pending = agent.run("x", controller.signal);
  await assert.rejects(() => agent.run("y"), /并发/);
  // Let the model response append its tool requests before cancelling.
  await new Promise((resolve) => setTimeout(resolve, 5));
  controller.abort(new Error("cancelled"));
  await assert.rejects(() => pending, /cancelled/);
  assert.deepEqual(
    agent.messages
      .filter((message) => message.role === "tool")
      .map((message) => message.toolCallId),
    ["a", "b"],
  );
});
