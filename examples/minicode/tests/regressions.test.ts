import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AgentLoop } from "../src/agent.ts";
import { FakeModel } from "../src/fake-model.ts";
import { FileMemory } from "../src/memory.ts";
import { PermissionGate } from "../src/security.ts";
import { compactMessages, JsonlSessionStore } from "../src/session.ts";
import {
  SubagentOrchestrator,
  type TaskContract,
  type Worker,
} from "../src/subagents.ts";
import { numberPair, ToolRegistry } from "../src/tools.ts";

const task = (id: string, ownedPaths: string[] = []): TaskContract => ({
  id,
  goal: id,
  nonGoals: [],
  input: {},
  ownedPaths,
  budget: { maxSteps: 2, maxTokens: 100, deadlineMs: 20 },
});
const worker: Worker = async (contract) => ({
  taskId: contract.id,
  status: "ok",
  summary: "done",
  evidence: [{ uri: "test:proof", summary: "assertions" }],
  usage: { steps: 1, tokens: 1 },
});

test("预先取消不会启动 worker；排队任务同样取消", async () => {
  const controller = new AbortController();
  controller.abort(new Error("stop"));
  let started = 0;
  const report = await new SubagentOrchestrator(1).run(
    [task("a"), task("b")],
    async (...args) => {
      started++;
      return worker(...args);
    },
    controller.signal,
  );
  assert.equal(started, 0);
  assert.ok(report.results.every((result) => result.status === "cancelled"));
});

test("不响应 AbortSignal 的 worker 超时后停止等待", async () => {
  const report = await new SubagentOrchestrator().run(
    [task("a")],
    () => new Promise(() => {}),
  );
  assert.equal(report.results[0]?.status, "cancelled");
  assert.match(report.results[0]?.error ?? "", /超时/);
});

test("父子目录、规范化路径都算写冲突，兄弟目录不冲突", async () => {
  const orchestrator = new SubagentOrchestrator();
  await assert.rejects(
    () =>
      orchestrator.run([task("a", ["src/"]), task("b", ["src/x.ts"])], worker),
    /冲突/,
  );
  await assert.rejects(
    () =>
      orchestrator.run(
        [task("a", ["src/../docs/a.md"]), task("b", ["docs/a.md"])],
        worker,
      ),
    /冲突/,
  );
  assert.equal(
    (
      await orchestrator.run(
        [task("a", ["src/a"]), task("b", ["src/ab"])],
        worker,
      )
    ).metrics.successRate,
    1,
  );
  await assert.rejects(
    () => orchestrator.run([task("a", ["../secret"])], worker),
    /相对路径/,
  );
  await assert.rejects(
    () => orchestrator.run([task("a"), task("a")], worker),
    /唯一/,
  );
});

test("无证据的成功、错误结构和负 usage 被拒绝", async () => {
  const orchestrator = new SubagentOrchestrator();
  const empty = await orchestrator.run([task("a")], async (...args) => ({
    ...(await worker(...args)),
    evidence: [],
  }));
  assert.equal(empty.results[0]?.status, "failed");
  const negative = await orchestrator.run([task("b")], async (...args) => ({
    ...(await worker(...args)),
    usage: { steps: -1, tokens: 0 },
  }));
  assert.match(negative.results[0]?.error ?? "", /结构/);
});

test("增量计量超预算不能靠低报 usage 绕过", async () => {
  const report = await new SubagentOrchestrator().run(
    [task("a")],
    async (contract, signal, meter) => {
      meter.charge(1, 50);
      try {
        meter.charge(2, 60);
      } catch {
        /* malicious under-report */
      }
      return worker(contract, signal, meter);
    },
  );
  assert.equal(report.results[0]?.status, "failed");
  assert.equal(report.results[0]?.usage.tokens, 110);
});

test("真实并发峰值不超过设定值（合作 worker）", async () => {
  let active = 0;
  let peak = 0;
  const contracts = Array.from({ length: 5 }, (_, i) => ({
    ...task(String(i)),
    budget: { maxSteps: 2, maxTokens: 100, deadlineMs: 1_000 },
  }));
  await new SubagentOrchestrator(2).run(contracts, async (...args) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return worker(...args);
  });
  assert.equal(peak, 2);
});

test("工具审批在执行之前；非有限数字不通过验证", async () => {
  assert.equal(numberPair({ a: NaN, b: 1 }), false);
  let executed = false;
  const registry = new ToolRegistry();
  registry.register({
    name: "write",
    description: "write",
    inputSchema: {},
    mutates: true,
    validate: numberPair,
    execute: async () => {
      executed = true;
    },
  });
  await assert.rejects(
    () => registry.call("write", { a: 1, b: 1 }, { runId: "a" }),
    /权限审批/,
  );
  assert.equal(executed, false);
});

test("历史保留 assistant tool_calls 与每条 observation；token预算独立", async () => {
  const registry = new ToolRegistry();
  registry.register({
    name: "add",
    description: "add",
    inputSchema: {},
    mutates: false,
    validate: numberPair,
    execute: async ({ a, b }) => a + b,
  });
  const model = new FakeModel([
    {
      content: "",
      toolCalls: [
        { id: "a", name: "add", arguments: { a: 1, b: 2 } },
        { id: "b", name: "add", arguments: { a: 3, b: 4 } },
      ],
    },
  ]);
  const result = await new AgentLoop(model, registry, { maxToolCalls: 1 }).run(
    "test",
  );
  assert.equal(result.messages[1]?.toolCalls?.length, 2);
  assert.equal(
    result.messages.filter((message) => message.role === "tool").length,
    2,
  );
  const expensive = new FakeModel([
    {
      content: "answer",
      toolCalls: [],
      usage: { inputTokens: 2, outputTokens: 2 },
    },
  ]);
  assert.equal(
    (await new AgentLoop(expensive, registry, { maxTokens: 1 }).run("test"))
      .reason,
    "token_budget",
  );
});

test("摘要有长度上限且不拆开工具调用轮次", () => {
  const messages = [
    { role: "user" as const, content: "a".repeat(10_000) },
    { role: "assistant" as const, content: "old" },
    { role: "user" as const, content: "new" },
    {
      role: "assistant" as const,
      content: "tool",
      toolCalls: [{ id: "a", name: "x", arguments: {} }],
    },
    { role: "tool" as const, toolCallId: "a", content: "done" },
  ];
  const compacted = compactMessages(messages, 1, 100);
  assert.ok(compacted[0]!.content.length < 120);
  assert.equal(compacted[1]?.role, "user");
  assert.equal(compacted[2]?.toolCalls?.[0]?.id, "a");
  assert.throws(() => compactMessages(messages, 0), /不合法/);
});

test("会话结构、文件记忆结构校验与并发同实例更新", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "minicode-regression-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "session.jsonl");
  await writeFile(file, '{"type":"message","at":"not-a-date"}\n');
  await assert.rejects(() => new JsonlSessionStore(file).load(), /时间/);
  await writeFile(
    file,
    '{broken}\n{"type":"checkpoint","at":"2026-10-11","label":"ok"}\n',
  );
  await assert.rejects(() => new JsonlSessionStore(file).load(), /第 1 行损坏/);
  const memory = new FileMemory(join(directory, "memory.json"));
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      memory.upsert({
        key: String(i),
        value: "v",
        source: "test",
        updatedAt: new Date(0).toISOString(),
      }),
    ),
  );
  assert.equal((await memory.list()).length, 5);
  await mkdir(join(directory, "..notes"));
  assert.equal(
    await new PermissionGate(directory).resolvePath("..notes"),
    join(directory, "..notes"),
  );
  const denied = new PermissionGate(directory, async () => true, ["execute"]);
  assert.equal(
    denied.decision({ capability: "execute", target: "command" }),
    "deny",
  );
  await assert.rejects(
    () => denied.authorize({ capability: "execute", target: "command" }),
    /权限拒绝/,
  );
});
