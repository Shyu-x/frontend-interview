import assert from "node:assert/strict";
import test from "node:test";
import { beginUiRun, reduceUiEvent } from "../src/ui-state.ts";

test("流式事件重放幂等且旧运行不会覆盖新运行", () => {
  const original = beginUiRun("new");
  const envelope = {
    runId: "new",
    sequence: 1,
    event: { type: "text:delta" as const, text: "<script>not HTML</script>" },
  };
  const state = reduceUiEvent(original, envelope);
  assert.equal(original.text, "");
  assert.equal(state.text, envelope.event.text);
  assert.equal(reduceUiEvent(state, envelope), state);
  assert.equal(
    reduceUiEvent(state, { ...envelope, runId: "old", sequence: 2 }),
    state,
  );
});

test("序号缺口要求重放，结束状态拒绝晚到事件", () => {
  const state = beginUiRun("a");
  assert.throws(
    () =>
      reduceUiEvent(state, {
        runId: "a",
        sequence: 2,
        event: { type: "text:delta", text: "gap" },
      }),
    /缺口/,
  );
  const done = reduceUiEvent(state, {
    runId: "a",
    sequence: 1,
    event: { type: "run:end", status: "cancelled" },
  });
  assert.equal(
    reduceUiEvent(done, {
      runId: "a",
      sequence: 2,
      event: { type: "text:delta", text: "late" },
    }),
    done,
  );
});

test("权限审批按 requestId 关联且不能重复审批", () => {
  let state = beginUiRun("a");
  state = reduceUiEvent(state, {
    runId: "a",
    sequence: 1,
    event: {
      type: "permission:request",
      requestId: "__proto__",
      description: "写入报告",
    },
  });
  state = reduceUiEvent(state, {
    runId: "a",
    sequence: 2,
    event: {
      type: "permission:decision",
      requestId: "__proto__",
      approved: false,
    },
  });
  assert.equal(state.permissions["__proto__"]?.decision, "denied");
  assert.equal(Object.getPrototypeOf(state.permissions), Object.prototype);
  assert.throws(
    () =>
      reduceUiEvent(state, {
        runId: "a",
        sequence: 3,
        event: {
          type: "permission:decision",
          requestId: "__proto__",
          approved: true,
        },
      }),
    /已经结束/,
  );
});

test("工具失败保留可观察状态，不接受孤立的结束事件", () => {
  const initial = beginUiRun("a");
  assert.throws(
    () =>
      reduceUiEvent(initial, {
        runId: "a",
        sequence: 1,
        event: { type: "tool:end", callId: "x", ok: true },
      }),
    /start/,
  );
  const running = reduceUiEvent(initial, {
    runId: "a",
    sequence: 1,
    event: { type: "tool:start", callId: "x", name: "read" },
  });
  const done = reduceUiEvent(running, {
    runId: "a",
    sequence: 2,
    event: { type: "tool:end", callId: "x", ok: false },
  });
  assert.equal(done.tools.x?.status, "failed");
});
