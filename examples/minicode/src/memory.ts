import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

export type MemoryRecord = {
  key: string;
  value: string;
  source: string;
  updatedAt: string;
};

export class FileMemory {
  readonly path: string;
  #pending: Promise<void> = Promise.resolve();

  constructor(path: string) {
    this.path = path;
  }

  async list(): Promise<MemoryRecord[]> {
    try {
      const records: unknown = JSON.parse(await readFile(this.path, "utf8"));
      if (!Array.isArray(records)) throw new Error("记忆文件不是数组");
      records.forEach(validateRecord);
      return records as MemoryRecord[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async upsert(record: MemoryRecord): Promise<void> {
    validateRecord(record);
    const snapshot = structuredClone(record);
    const operation = this.#pending.then(() => this.#write(snapshot));
    this.#pending = operation.catch(() => {});
    return operation;
  }

  async #write(record: MemoryRecord): Promise<void> {
    const records = await this.list();
    const index = records.findIndex((item) => item.key === record.key);
    if (index >= 0) records[index] = record;
    else records.push(record);
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await rename(temporary, this.path);
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async search(query: string): Promise<MemoryRecord[]> {
    const normalized = query.toLocaleLowerCase();
    return (await this.list()).filter((record) =>
      `${record.key} ${record.value}`.toLocaleLowerCase().includes(normalized),
    );
  }
}

function validateRecord(record: unknown): asserts record is MemoryRecord {
  if (!record || typeof record !== "object") throw new Error("记忆记录不合法");
  const value = record as Partial<MemoryRecord>;
  if (
    typeof value.key !== "string" ||
    !value.key.trim() ||
    typeof value.value !== "string" ||
    typeof value.source !== "string" ||
    !value.source.trim() ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt))
  )
    throw new Error("记忆记录不合法");
}
