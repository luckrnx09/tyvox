import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RecordingRepository } from "./types.js";
import { createKeyedLocks } from "../utils/locks.js";

const KEEP_RECENT_RECORDINGS = 5;
const RECORDINGS_DIRECTORY = "recordings";

export function createFileRecordingRepository(usersRoot: string): RecordingRepository {
  const withLock = createKeyedLocks();

  return {
    save(userId, sessionId, wav) {
      return withLock(userId, async () => {
        const dir = join(usersRoot, userId, RECORDINGS_DIRECTORY);
        await mkdir(dir, { recursive: true });
        const path = join(dir, `${Date.now()}-${sessionId}.wav`);
        await writeFile(path, wav);

        const files = (await readdir(dir)).filter((file) => file.endsWith(".wav")).sort();
        const excess = files.length - KEEP_RECENT_RECORDINGS;
        for (const file of files.slice(0, Math.max(0, excess))) {
          await rm(join(dir, file), { force: true });
        }

        return path;
      });
    },
  };
}
