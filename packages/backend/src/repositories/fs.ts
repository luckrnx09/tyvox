import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function isFileMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export async function writeFileAtomic(path: string, data: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, data, "utf8");
  await rename(tempPath, path);
}
