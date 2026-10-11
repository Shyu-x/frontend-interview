import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { TextMessage } from "./types.ts";

export type SessionEvent =
  | { type: "message"; at: string; message: TextMessage }
  | { type: "checkpoint"; at: string; label: string };

export class JsonlSessionStore {
  readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  async append(event: SessionEvent): Promise<void> {
    validateEvent(event);
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(event)}\n`, "utf8");
  }

  async load(): Promise<{
    events: SessionEvent[];
    ignoredTrailingLine: boolean;
  }> {
    let source: string;
    try {
      source = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { events: [], ignoredTrailingLine: false };
      }
      throw error;
    }

    const lines = source.split("\n");
    const events: SessionEvent[] = [];
    let ignoredTrailingLine = false;
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        const isTrailing = index === lines.length - 1;
        if (!isTrailing)
          throw new Error(`会话日志第 ${index + 1} 行损坏`, { cause: error });
        ignoredTrailingLine = true;
        continue;
      }
      validateEvent(parsed);
      events.push(parsed);
    }
    return { events, ignoredTrailingLine };
  }

  async messages(): Promise<TextMessage[]> {
    const { events } = await this.load();
    return events
      .filter(
        (event): event is Extract<SessionEvent, { type: "message" }> =>
          event.type === "message",
      )
      .map((event) => event.message);
  }
}

export function compactMessages(
  messages: readonly TextMessage[],
  keepLatest = 8,
  maxSummaryChars = 1_024,
): TextMessage[] {
  if (
    !Number.isSafeInteger(keepLatest) ||
    keepLatest < 1 ||
    !Number.isSafeInteger(maxSummaryChars) ||
    maxSummaryChars < 64
  ) {
    throw new Error("压缩参数不合法");
  }
  if (messages.length <= keepLatest) return structuredClone([...messages]);
  // Keep complete user turns: never split an assistant tool call from its observations.
  let cut = messages.length - keepLatest;
  while (cut > 0 && messages[cut]?.role !== "user") cut -= 1;
  if (cut === 0) return structuredClone([...messages]);
  const dropped = messages.slice(0, cut);
  const prefix = `[历史有损摘录；省略 ${dropped.length} 条消息；不保留工具调用状态]\n`;
  const excerpt = dropped
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  const summary = (prefix + excerpt).slice(0, maxSummaryChars);
  return [
    { role: "assistant", content: `[历史摘要]\n${summary}` },
    ...structuredClone(messages.slice(cut)),
  ];
}

function validateEvent(value: unknown): asserts value is SessionEvent {
  if (!value || typeof value !== "object")
    throw new Error("会话事件结构不合法");
  const event = value as Partial<SessionEvent>;
  if (typeof event.at !== "string" || !Number.isFinite(Date.parse(event.at)))
    throw new Error("会话事件时间不合法");
  if (event.type === "checkpoint" && typeof event.label === "string") return;
  if (event.type === "message" && event.message) {
    const message = event.message;
    if (
      ["user", "assistant", "tool"].includes(message.role) &&
      typeof message.content === "string" &&
      (message.role !== "tool" || typeof message.toolCallId === "string") &&
      (message.toolCalls === undefined ||
        (Array.isArray(message.toolCalls) &&
          message.toolCalls.every(
            (call) =>
              call &&
              typeof call.id === "string" &&
              typeof call.name === "string" &&
              "arguments" in call,
          )))
    )
      return;
  }
  throw new Error("会话事件结构不合法");
}
