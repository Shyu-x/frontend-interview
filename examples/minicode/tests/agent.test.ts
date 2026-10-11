import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { AgentLoop } from "../src/agent.ts";
import { FakeModel } from "../src/fake-model.ts";
import { numberPair, ToolRegistry } from "../src/tools.ts";

function registry(): ToolRegistry {
  const tools = new ToolRegistry();
  tools.register({
    name: "add",
    description: "加法",
    inputSchema: { type: "object" },
    mutates: false,
    validate: numberPair,
    execute: async ({ a, b }) => a + b,
  });
  return tools;
}

test("Agent Loop 执行工具并返回最终回答", async () => {
  const model = new FakeModel([
    {
      content: "调用工具",
      toolCalls: [{ id: "1", name: "add", arguments: { a: 2, b: 3 } }],
    },
    { content: "答案是 5", toolCalls: [] },
  ]);
  const events: string[] = [];
  const agent = new AgentLoop(model, registry(), {
    onEvent: (event) => events.push(event.type),
  });
  const result = await agent.run("计算");

  assert.equal(result.reason, "final");
  assert.equal(result.answer, "答案是 5");
  assert.equal(result.toolCalls, 1);
  assert.match(
    result.messages.find((message) => message.role === "tool")?.content ?? "",
    /"output":5/,
  );
  assert.deepEqual(events, [
    "turn:start",
    "model:end",
    "tool:start",
    "tool:end",
    "turn:start",
    "model:end",
    "run:end",
  ]);
});

test("工具参数错误作为 observation 回灌，而不是让会话崩溃", async () => {
  const model = new FakeModel([
    {
      content: "",
      toolCalls: [{ id: "bad", name: "add", arguments: { a: "2" } }],
    },
    { content: "参数错误，请补充 b", toolCalls: [] },
  ]);
  const result = await new AgentLoop(model, registry()).run("计算");
  const observation = result.messages.find(
    (message) => message.toolCallId === "bad",
  );
  assert.match(observation?.content ?? "", /"ok":false/);
  assert.match(observation?.content ?? "", /参数校验失败/);
  assert.equal(result.reason, "final");
});

test("工具调用预算会确定性终止循环", async () => {
  const response = {
    content: "",
    toolCalls: [{ id: "1", name: "add", arguments: { a: 1, b: 1 } }],
  };
  const model = new FakeModel([
    response,
    { ...response, toolCalls: [{ ...response.toolCalls[0]!, id: "2" }] },
  ]);
  const result = await new AgentLoop(model, registry(), {
    maxToolCalls: 1,
  }).run("一直算");
  assert.equal(result.reason, "tool_budget");
  assert.equal(result.toolCalls, 1);
});

test("取消信号传播到正在运行的工具", async () => {
  const tools = new ToolRegistry();
  tools.register({
    name: "slow",
    description: "慢工具",
    inputSchema: { type: "object" },
    mutates: false,
    validate: (_input: unknown): _input is Record<string, never> => true,
    execute: async (_input, context) => {
      await delay(5_000, undefined, { signal: context.signal });
      return "done";
    },
  });
  const model = new FakeModel([
    { content: "", toolCalls: [{ id: "slow-1", name: "slow", arguments: {} }] },
  ]);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(
    () => new AgentLoop(model, tools).run("慢任务", controller.signal),
    /abort/i,
  );
});
