import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, chmod, mkdir, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function downloadAtomic(
  urls: string[],
  destination: string,
  onProgress?: (downloaded: number, total: number) => void,
  sha256?: string,
): Promise<void> {
  const tempPath = `${destination}.download`;
  const errors: string[] = [];

  for (const url of urls) {
    try {
      await downloadToFile(url, tempPath, onProgress);
      if (sha256) {
        await verifySha256(tempPath, sha256);
      }
      await rename(tempPath, destination);
      return;
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
      await unlink(tempPath).catch(() => {});
    }
  }

  throw new Error(`Download failed from all sources:\n${errors.join("\n")}`);
}

async function verifySha256(path: string, expected: string): Promise<void> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }
  const actual = hash.digest("hex");
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${path}: expected ${expected}, got ${actual}`);
  }
}

export async function setExecutableIfNeeded(path: string): Promise<void> {
  if (process.platform === "win32") {
    return;
  }
  await chmod(path, 0o755);
}

async function downloadToFile(
  url: string,
  destination: string,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const total = Number(response.headers.get("content-length") ?? "0");
  const body = response.body;
  if (!body) {
    throw new Error(`No response body for ${url}`);
  }

  await mkdir(dirname(destination), { recursive: true });
  const source = Readable.fromWeb(body as import("node:stream/web").ReadableStream);
  const file = createWriteStream(destination);
  let downloaded = 0;

  source.on("data", (chunk: Buffer) => {
    downloaded += chunk.length;
    onProgress?.(downloaded, total);
  });

  await pipeline(source, file);
}
