import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function writeTempAudio(buffer: Buffer): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const directory = await mkdtemp(join(tmpdir(), "tyvox-asr-"));
  const path = join(directory, "audio.wav");
  await writeFile(path, buffer, { mode: 0o600 });

  return {
    path,
    cleanup: async () => {
      await rm(directory, { recursive: true, force: true }).catch(() => {});
    },
  };
}
