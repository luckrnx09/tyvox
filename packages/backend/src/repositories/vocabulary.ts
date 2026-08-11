import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { VocabularyData, VocabularyRepository } from "./types.js";
import { createKeyedLocks } from "../utils/locks.js";
import { isFileMissing, writeFileAtomic } from "./fs.js";
import { getLogger } from "../utils/logger.js";

const VOCABULARY_FILE = "vocabulary.json";

const vocabularyLogger = getLogger("vocabulary-repository");

export function createFileVocabularyRepository(usersRoot: string): VocabularyRepository {
  const withLock = createKeyedLocks();

  function filePath(userId: string): string {
    return join(usersRoot, userId, VOCABULARY_FILE);
  }

  function findKey(data: VocabularyData, entry: string): string | null {
    const lower = entry.toLowerCase();
    for (const key of Object.keys(data.vocabulary)) {
      if (key.toLowerCase() === lower) return key;
    }
    return null;
  }

  async function readData(path: string): Promise<VocabularyData> {
    let parsed: VocabularyData;
    try {
      parsed = JSON.parse(await readFile(path, "utf8")) as VocabularyData;
    } catch (error) {
      if (!isFileMissing(error)) {
        vocabularyLogger.error(error, "Failed to load vocabulary");
      }
      return { vocabulary: {} };
    }
    const data: VocabularyData = { vocabulary: parsed.vocabulary ?? {} };
    let migrated = false;
    for (const item of Object.values(data.vocabulary)) {
      if (!item.lastSeen) {
        item.lastSeen = new Date().toISOString();
        migrated = true;
      }
    }
    if (migrated) await writeData(path, data);
    return data;
  }

  async function writeData(path: string, data: VocabularyData): Promise<void> {
    await writeFileAtomic(path, JSON.stringify(data, null, 2));
  }

  return {
    read(userId) {
      return withLock(userId, () => readData(filePath(userId)));
    },

    add(userId, entries) {
      return withLock(userId, async () => {
        const path = filePath(userId);
        const data = await readData(path);
        for (const entry of entries) {
          const normalized = entry.trim();
          if (!normalized) continue;
          const existing = findKey(data, normalized);
          const freq = existing ? data.vocabulary[existing].freq + 1 : 1;
          if (existing) delete data.vocabulary[existing];
          data.vocabulary[normalized] = { freq, lastSeen: new Date().toISOString() };
        }
        await writeData(path, data);
      });
    },

    delete(userId, entry) {
      return withLock(userId, async () => {
        const path = filePath(userId);
        const data = await readData(path);
        const existing = findKey(data, entry.trim());
        if (!existing) return;
        delete data.vocabulary[existing];
        await writeData(path, data);
      });
    },

    rename(userId, oldEntry, newEntry) {
      return withLock(userId, async () => {
        const normalizedOld = oldEntry.trim();
        const normalizedNew = newEntry.trim();
        if (!normalizedOld || !normalizedNew) return;
        const path = filePath(userId);
        const data = await readData(path);
        const oldKey = findKey(data, normalizedOld);
        if (!oldKey) return;
        const oldItem = data.vocabulary[oldKey];
        delete data.vocabulary[oldKey];
        const newKey = findKey(data, normalizedNew);
        data.vocabulary[newKey ?? normalizedNew] = {
          freq: oldItem.freq + (newKey ? data.vocabulary[newKey].freq : 0),
          lastSeen: new Date().toISOString(),
        };
        await writeData(path, data);
      });
    },

    clear(userId) {
      return withLock(userId, async () => {
        await writeData(filePath(userId), { vocabulary: {} });
      });
    },
  };
}
