import assert from "node:assert/strict";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileMemory } from "../src/memory.ts";
import { PermissionGate } from "../src/security.ts";
import { compactMessages, JsonlSessionStore } from "../src/session.ts";

test("JSONL 会话可恢复并容忍被中断的最后一行", async () => {
  const actualDir = join(tmpdir(), `minicode-session-${crypto.randomUUID()}`);
  await mkdir(actualDir, { recursive: true });
  const path = join(actualDir, "session.jsonl");
  const store = new JsonlSessionStore(path);
  await store.append({
    type: "message",
    at: new Date(0).toISOString(),
    message: { role: "user", content: "hello" },
  });
  await writeFile(path, `${await readFile(path, "utf8")}{broken`, "utf8");
  const loaded = await store.load();
  assert.equal(loaded.events.length, 1);
  assert.equal(loaded.ignoredTrailingLine, true);
  assert.equal((await store.messages())[0]?.content, "hello");
});

test("上下文压缩保留最近消息并显式生成摘要", () => {
  const messages = Array.from({ length: 12 }, (_, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `m${index}`,
  }));
  const compacted = compactMessages(messages, 4);
  assert.equal(compacted.length, 5);
  assert.match(compacted[0]?.content ?? "", /m0/);
  assert.equal(compacted.at(-1)?.content, "m11");
});

test("权限闸门拦截路径穿越和越界符号链接", async () => {
  const workspace = join(tmpdir(), `minicode-workspace-${crypto.randomUUID()}`);
  const outside = join(tmpdir(), `minicode-outside-${crypto.randomUUID()}`);
  await mkdir(workspace, { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, "secret.txt"), "secret", "utf8");
  await symlink(join(outside, "secret.txt"), join(workspace, "escape"));
  const gate = new PermissionGate(workspace);
  await assert.rejects(() => gate.resolvePath("../outside.txt"), /越出工作区/);
  await assert.rejects(() => gate.resolvePath("escape"), /符号链接越出工作区/);
});

test("写操作、执行和网络默认需要审批", async () => {
  const workspace = join(
    tmpdir(),
    `minicode-permission-${crypto.randomUUID()}`,
  );
  await mkdir(workspace, { recursive: true });
  const denied = new PermissionGate(workspace);
  await assert.rejects(
    () => denied.authorize({ capability: "write", target: "note.md" }),
    /未批准/,
  );
  await assert.rejects(
    () => denied.authorize({ capability: "execute", target: "npm test" }),
    /未批准/,
  );
  const approved = new PermissionGate(workspace, async () => true);
  await approved.authorize({ capability: "write", target: "note.md" });
  await approved.authorize({
    capability: "network",
    target: "https://example.test",
  });
});

test("文件记忆按 key 更新并保留来源", async () => {
  const dir = join(tmpdir(), `minicode-memory-${crypto.randomUUID()}`);
  const memory = new FileMemory(join(dir, "memory.json"));
  await memory.upsert({
    key: "style",
    value: "tabs",
    source: "user",
    updatedAt: new Date(0).toISOString(),
  });
  await memory.upsert({
    key: "style",
    value: "spaces",
    source: "user-correction",
    updatedAt: new Date(1).toISOString(),
  });
  const found = await memory.search("spaces");
  assert.equal(found.length, 1);
  assert.equal(found[0]?.source, "user-correction");
});
