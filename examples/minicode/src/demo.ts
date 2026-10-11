import { AgentLoop } from "./agent.ts";
import { FakeModel } from "./fake-model.ts";
import { numberPair, ToolRegistry } from "./tools.ts";

const model = new FakeModel([
  {
    content: "我先调用加法工具。",
    toolCalls: [{ id: "call-1", name: "add", arguments: { a: 2, b: 3 } }],
    usage: { inputTokens: 20, outputTokens: 8 },
  },
  {
    content: "2 + 3 = 5",
    toolCalls: [],
    usage: { inputTokens: 30, outputTokens: 6 },
  },
]);

const tools = new ToolRegistry();
tools.register({
  name: "add",
  description: "计算两个数的和",
  inputSchema: {
    type: "object",
    properties: { a: { type: "number" }, b: { type: "number" } },
    required: ["a", "b"],
  },
  mutates: false,
  validate: numberPair,
  execute: async ({ a, b }) => a + b,
});

const agent = new AgentLoop(model, tools, {
  onEvent: (event) => console.log(event),
});
const result = await agent.run("计算 2 加 3");
console.log(result.answer);
