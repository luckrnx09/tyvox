import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { RecentHistoryEntry, RecentHistoryRepository } from "./types.js";
import { createKeyedLocks } from "../utils/locks.js";
import { isFileMissing, writeFileAtomic } from "./fs.js";

export const RECENT_HISTORY_WINDOW_MS = 30 * 60 * 1000;

const RECENT_HISTORY_FILE = "recent-history.jsonl";

export function createFileRecentHistoryRepository(usersRoot: string): RecentHistoryRepository {
  const withLock = createKeyedLocks();

  function filePath(userId: string): string {
    return join(usersRoot, userId, RECENT_HISTORY_FILE);
  }

  async function readEntries(path: string): Promise<RecentHistoryEntry[]> {
    try {
      const raw = await readFile(path, "utf8");
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as RecentHistoryEntry);
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
        const cutoff = Date.now() - RECENT_HISTORY_WINDOW_MS;
        const entries = (await readEntries(path)).filter(
          (existing) => Date.parse(existing.timestamp) >= cutoff,
        );
        entries.push(entry);
        await mkdir(dirname(path), { recursive: true });
        await writeFileAtomic(
          path,
          entries.map((existing) => JSON.stringify(existing) + "\n").join(""),
        );
      });
    },
  };
}
