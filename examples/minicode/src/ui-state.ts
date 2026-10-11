/** Framework-independent view state. Render text as text nodes, never as untrusted HTML. */
export type UiEvent =
  | { type: "text:delta"; text: string }
  | { type: "tool:start"; callId: string; name: string }
  | { type: "tool:end"; callId: string; ok: boolean }
  | { type: "permission:request"; requestId: string; description: string }
  | { type: "permission:decision"; requestId: string; approved: boolean }
  | { type: "run:end"; status: "completed" | "cancelled" | "failed" };

export type UiEnvelope = { runId: string; sequence: number; event: UiEvent };
export type UiState = {
  runId: string;
  sequence: number;
  status: "running" | "completed" | "cancelled" | "failed";
  text: string;
  tools: Record<string, { name: string; status: "running" | "ok" | "failed" }>;
  permissions: Record<
    string,
    { description: string; decision: "pending" | "approved" | "denied" }
  >;
};

export function beginUiRun(runId: string): UiState {
  if (!runId.trim()) throw new Error("runId 不能为空");
  return {
    runId,
    sequence: 0,
    status: "running",
    text: "",
    tools: {},
    permissions: {},
  };
}

export function reduceUiEvent(state: UiState, envelope: UiEnvelope): UiState {
  // A late event from the previous run must not overwrite the new run.
  if (envelope.runId !== state.runId) return state;
  if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence < 1)
    throw new Error("事件序号不合法");
  if (envelope.sequence <= state.sequence || state.status !== "running")
    return state;
  if (envelope.sequence !== state.sequence + 1)
    throw new Error("事件缺口：需要重放或全量快照");
  const next = structuredClone(state);
  next.sequence = envelope.sequence;
  const event = envelope.event;
  switch (event.type) {
    case "text:delta":
      next.text += event.text;
      break;
    case "tool:start":
      if (Object.hasOwn(next.tools, event.callId))
        throw new Error("工具调用 ID 重复");
      Object.defineProperty(next.tools, event.callId, {
        value: { name: event.name, status: "running" },
        enumerable: true,
        writable: true,
        configurable: true,
      });
      break;
    case "tool:end": {
      const tool = Object.hasOwn(next.tools, event.callId)
        ? next.tools[event.callId]
        : undefined;
      if (!tool || tool.status !== "running")
        throw new Error("工具结束事件缺少对应 start");
      tool.status = event.ok ? "ok" : "failed";
      break;
    }
    case "permission:request":
      if (Object.hasOwn(next.permissions, event.requestId))
        throw new Error("审批 ID 重复");
      Object.defineProperty(next.permissions, event.requestId, {
        value: { description: event.description, decision: "pending" },
        enumerable: true,
        writable: true,
        configurable: true,
      });
      break;
    case "permission:decision": {
      const request = Object.hasOwn(next.permissions, event.requestId)
        ? next.permissions[event.requestId]
        : undefined;
      if (!request || request.decision !== "pending")
        throw new Error("审批不存在或已经结束");
      request.decision = event.approved ? "approved" : "denied";
      break;
    }
    case "run:end":
      next.status = event.status;
      break;
  }
  return next;
}
