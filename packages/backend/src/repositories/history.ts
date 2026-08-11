import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HistoryEntry, HistoryRepository } from "./types.js";
import { createKeyedLocks } from "../utils/locks.js";
import { isFileMissing, writeFileAtomic } from "./fs.js";

const HISTORY_FILE = "history.jsonl";

export function createFileHistoryRepository(usersRoot: string): HistoryRepository {
  const withLock = createKeyedLocks();

  function filePath(userId: string): string {
    return join(usersRoot, userId, HISTORY_FILE);
  }

  async function readEntries(path: string): Promise<HistoryEntry[]> {
    try {
      const raw = await readFile(path, "utf8");
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as HistoryEntry);
    } catch (error) {
      if (isFileMissing(error)) return [];
      throw error;
    }
  }

  return {
    list(userId) {
      return withLock(userId, () => readEntries(filePath(userId)));
    },

    add(userId, entry) {
      return withLock(userId, async () => {
        const path = filePath(userId);
        await mkdir(dirname(path), { recursive: true });
        await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
      });
    },

    delete(userId, ids) {
      return withLock(userId, async () => {
        const path = filePath(userId);
        const entries = await readEntries(path);
        if (entries.length === 0) return;
        const removed = new Set(ids);
        const remaining = entries.filter((entry) => !removed.has(entry.id));
        await writeFileAtomic(
          path,
          remaining.map((entry) => JSON.stringify(entry) + "\n").join(""),
        );
      });
    },
  };
}
