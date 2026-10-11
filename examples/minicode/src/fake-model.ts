import type {
  ModelAdapter,
  ModelResponse,
  TextMessage,
  ToolDescriptor,
} from "./types.ts";

export class FakeModel implements ModelAdapter {
  readonly requests: TextMessage[][] = [];
  readonly tools: ToolDescriptor[][] = [];
  #responses: ModelResponse[];

  constructor(responses: readonly ModelResponse[]) {
    this.#responses = responses.map((response) => structuredClone(response));
  }

  async complete(
    messages: readonly TextMessage[],
    tools: readonly ToolDescriptor[],
    signal?: AbortSignal,
  ): Promise<ModelResponse> {
    signal?.throwIfAborted();
    this.requests.push(structuredClone([...messages]));
    this.tools.push(structuredClone([...tools]));
    const response = this.#responses.shift();
    if (!response) throw new Error("FakeModel 响应队列已耗尽");
    return structuredClone(response);
  }
}
