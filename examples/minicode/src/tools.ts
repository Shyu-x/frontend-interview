import type { ToolDescriptor } from "./types.ts";

export type ToolContext = {
  signal?: AbortSignal;
  runId: string;
};

export type ToolDefinition<T = unknown> = ToolDescriptor & {
  mutates: boolean;
  validate(input: unknown): input is T;
  execute(input: T, context: ToolContext): Promise<unknown>;
};

export class ToolRegistry {
  #tools = new Map<string, ToolDefinition>();
  readonly #authorize: (
    tool: ToolDefinition,
    input: unknown,
    context: ToolContext,
  ) => Promise<void>;

  constructor(
    authorize?: (
      tool: ToolDefinition,
      input: unknown,
      context: ToolContext,
    ) => Promise<void>,
  ) {
    this.#authorize =
      authorize ??
      (async (tool) => {
        if (tool.mutates) throw new Error("写入工具必须配置权限审批");
      });
  }

  register<T>(tool: ToolDefinition<T>): void {
    if (this.#tools.has(tool.name))
      throw new Error(`工具重复注册: ${tool.name}`);
    this.#tools.set(tool.name, tool as ToolDefinition);
  }

  descriptors(): ToolDescriptor[] {
    return [...this.#tools.values()].map(
      ({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      }),
    );
  }

  async call(
    name: string,
    input: unknown,
    context: ToolContext,
  ): Promise<unknown> {
    context.signal?.throwIfAborted();
    const tool = this.#tools.get(name);
    if (!tool) throw new Error(`未知工具: ${name}`);
    if (!tool.validate(input)) throw new Error(`工具 ${name} 参数校验失败`);
    await this.#authorize(tool, input, context);
    context.signal?.throwIfAborted();
    return tool.execute(input, context);
  }
}

export function numberPair(input: unknown): input is { a: number; b: number } {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  return (
    typeof value.a === "number" &&
    Number.isFinite(value.a) &&
    typeof value.b === "number" &&
    Number.isFinite(value.b)
  );
}
