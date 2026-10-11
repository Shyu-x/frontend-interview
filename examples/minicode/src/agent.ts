import { randomUUID } from "node:crypto";
import type {
  AgentEvent,
  ModelAdapter,
  RunResult,
  TextMessage,
  ToolCall,
} from "./types.ts";
import { ToolRegistry } from "./tools.ts";
import { abortable } from "./abort.ts";

export type AgentOptions = {
  maxTurns?: number;
  maxToolCalls?: number;
  maxTokens?: number;
  onEvent?: (event: AgentEvent) => void;
};

export class AgentLoop {
  readonly messages: TextMessage[];
  readonly #model: ModelAdapter;
  readonly #registry: ToolRegistry;
  readonly #options: Required<Omit<AgentOptions, "onEvent">> &
    Pick<AgentOptions, "onEvent">;
  #running = false;

  constructor(
    model: ModelAdapter,
    registry: ToolRegistry,
    options: AgentOptions = {},
    initialMessages: readonly TextMessage[] = [],
  ) {
    this.#model = model;
    this.#registry = registry;
    this.#options = {
      maxTurns: options.maxTurns ?? 8,
      maxToolCalls: options.maxToolCalls ?? 16,
      maxTokens: options.maxTokens ?? 32_000,
      ...(options.onEvent ? { onEvent: options.onEvent } : {}),
    };
    this.messages = structuredClone([...initialMessages]);
    for (const value of [
      this.#options.maxTurns,
      this.#options.maxToolCalls,
      this.#options.maxTokens,
    ]) {
      if (!Number.isSafeInteger(value) || value < 1)
        throw new Error("预算必须是正整数");
    }
  }

  async run(userInput: string, signal?: AbortSignal): Promise<RunResult> {
    if (this.#running) throw new Error("同一 Agent 会话不能并发运行");
    this.#running = true;
    try {
      return await this.#run(userInput, signal);
    } finally {
      this.#running = false;
    }
  }

  async #run(userInput: string, signal?: AbortSignal): Promise<RunResult> {
    signal?.throwIfAborted();
    this.messages.push({ role: "user", content: userInput });
    let toolCalls = 0;
    let tokenUsage = 0;
    const runId = randomUUID();

    for (let turn = 1; turn <= this.#options.maxTurns; turn += 1) {
      signal?.throwIfAborted();
      this.#emit({ type: "turn:start", turn });
      const response = await abortable(
        () =>
          this.#model.complete(
            this.messages,
            this.#registry.descriptors(),
            signal,
          ),
        signal,
      );
      if (
        !response ||
        typeof response.content !== "string" ||
        !Array.isArray(response.toolCalls) ||
        !response.toolCalls.every(
          (call) =>
            call &&
            typeof call.id === "string" &&
            call.id.trim() &&
            typeof call.name === "string" &&
            call.name.trim() &&
            "arguments" in call,
        ) ||
        new Set(response.toolCalls.map((call) => call.id)).size !==
          response.toolCalls.length ||
        (response.usage &&
          ![response.usage.inputTokens, response.usage.outputTokens].every(
            (value) => Number.isSafeInteger(value) && value >= 0,
          ))
      ) {
        throw new Error("模型响应结构不合法");
      }
      tokenUsage +=
        (response.usage?.inputTokens ?? 0) +
        (response.usage?.outputTokens ?? 0);
      if (tokenUsage > this.#options.maxTokens) {
        return this.#finish(
          "token_budget",
          "token 预算已耗尽",
          turn,
          toolCalls,
          tokenUsage,
        );
      }

      this.messages.push({
        role: "assistant",
        content: response.content,
        toolCalls: structuredClone(response.toolCalls),
      });
      this.#emit({
        type: "model:end",
        turn,
        toolCalls: response.toolCalls.length,
      });
      if (response.toolCalls.length === 0) {
        return this.#finish(
          "final",
          response.content,
          turn,
          toolCalls,
          tokenUsage,
        );
      }

      const toolResultsStart = this.messages.length;
      try {
        for (const call of response.toolCalls) {
          if (toolCalls >= this.#options.maxToolCalls) {
            this.messages.push({
              role: "tool",
              toolCallId: call.id,
              content: JSON.stringify({
                ok: false,
                error: "工具调用预算已耗尽",
              }),
            });
            continue;
          }
          toolCalls += 1;
          await this.#executeTool(call, turn, runId, signal);
        }
      } catch (error) {
        // A cancelled run must still leave a valid tool-call/observation transcript.
        const answered = new Set(
          this.messages
            .slice(toolResultsStart)
            .filter((message) => message.role === "tool")
            .map((message) => message.toolCallId),
        );
        for (const call of response.toolCalls) {
          if (!answered.has(call.id))
            this.messages.push({
              role: "tool",
              toolCallId: call.id,
              content: JSON.stringify({
                ok: false,
                error: "运行已取消，未获得工具结果",
              }),
            });
        }
        throw error;
      }
      if (toolCalls >= this.#options.maxToolCalls) {
        return this.#finish(
          "tool_budget",
          "工具调用预算已耗尽",
          turn,
          toolCalls,
          tokenUsage,
        );
      }
    }

    return this.#finish(
      "max_turns",
      "达到最大轮数，返回当前中间结果",
      this.#options.maxTurns,
      toolCalls,
      tokenUsage,
    );
  }

  async #executeTool(
    call: ToolCall,
    turn: number,
    runId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    this.#emit({ type: "tool:start", turn, callId: call.id, tool: call.name });
    try {
      const output = await abortable(
        () =>
          this.#registry.call(call.name, call.arguments, {
            ...(signal ? { signal } : {}),
            runId,
          }),
        signal,
      );
      this.messages.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify({ ok: true, output }),
      });
      this.#emit({
        type: "tool:end",
        turn,
        callId: call.id,
        tool: call.name,
        ok: true,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.messages.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify({ ok: false, error: message }),
      });
      this.#emit({
        type: "tool:end",
        turn,
        callId: call.id,
        tool: call.name,
        ok: false,
      });
    }
  }

  #finish(
    reason: RunResult["reason"],
    answer: string,
    turns: number,
    toolCalls: number,
    tokenUsage: number,
  ): RunResult {
    this.#emit({ type: "run:end", reason });
    return {
      reason,
      answer,
      messages: structuredClone(this.messages),
      turns,
      toolCalls,
      tokenUsage,
    };
  }

  #emit(event: AgentEvent): void {
    this.#options.onEvent?.(event);
  }
}
