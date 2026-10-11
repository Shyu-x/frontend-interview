export type TextMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type ModelResponse = {
  content: string;
  toolCalls: ToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
};

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export interface ModelAdapter {
  complete(
    messages: readonly TextMessage[],
    tools: readonly ToolDescriptor[],
    signal?: AbortSignal,
  ): Promise<ModelResponse>;
}

export type AgentEvent =
  | { type: "turn:start"; turn: number }
  | { type: "model:end"; turn: number; toolCalls: number }
  | { type: "tool:start"; turn: number; callId: string; tool: string }
  | {
      type: "tool:end";
      turn: number;
      callId: string;
      tool: string;
      ok: boolean;
    }
  | { type: "run:end"; reason: RunResult["reason"] };

export type RunResult = {
  reason: "final" | "max_turns" | "tool_budget" | "token_budget";
  answer: string;
  messages: TextMessage[];
  turns: number;
  toolCalls: number;
  tokenUsage: number;
};
