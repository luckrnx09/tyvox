import { spawn } from "node:child_process";
import { mkdir, rm, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SpeechConfig } from "@tyvox/sdk/contracts";
import type { ASRProvider } from "./provider.js";
import { NoSpeechError, TranscriptionError } from "./errors.js";
import { writeTempAudio } from "./write-temp-audio.js";
import { downloadAtomic, fileExists, setExecutableIfNeeded } from "./download.js";
import { createKeyedLocks } from "../../utils/locks.js";
import type { ASRModelRef, ModelStatus, TranscriptionResult } from "./types.js";
import { parseModelId } from "./model-reference.js";

import { APP_DATA_DIR } from "../../paths.js";

export const BINARY_DIRECTORY = join(APP_DATA_DIR, "asr", "bin");
export const MODELS_DIRECTORY = join(APP_DATA_DIR, "asr", "models");

export interface BinaryArtifact {
  urls: string[];
  path: string;
  size?: number;
  sha256: string;
  executable?: boolean;
  archiveDirectory?: string;
}

export interface BinaryASRSpec {
  id: string;
  config: SpeechConfig;
  models(): ASRModelRef[];
  binary(): BinaryArtifact;
  model(modelId: string): BinaryArtifact[];
  args(modelId: string, audioPath: string): string[];
  parse(stdout: string): string;
}

const artifactLocks = createKeyedLocks();

async function extractArchive(archivePath: string, destinationDirectory: string): Promise<void> {
  await mkdir(destinationDirectory, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const childProcess = spawn("tar", ["-xf", archivePath, "-C", destinationDirectory], {
      stdio: ["ignore", "inherit", "pipe"],
    });
    let stderr = "";
    childProcess.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    childProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`tar exited with code ${code}: ${stderr.trim()}`));
        return;
      }
      resolve();
    });
    childProcess.on("error", reject);
  });
}

export function createBinaryASRProvider(spec: BinaryASRSpec): ASRProvider {
  async function status(modelId: string): Promise<ModelStatus> {
    try {
      const artifacts = [spec.binary(), ...spec.model(modelId)];
      for (const artifact of artifacts) {
        if (!(await fileExists(artifact.path))) {
          return { status: "not_ready" };
        }
      }
      return { status: "ready" };
    } catch (error) {
      return { status: "error", error: String(error) };
    }
  }

  async function prepareArtifact(
    artifact: BinaryArtifact,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (await fileExists(artifact.path)) {
      onProgress?.(1);
      return;
    }
    if (artifact.urls.length === 0) {
      throw new Error(`No download URL for ${artifact.path}`);
    }

    await artifactLocks(artifact.path, async () => {
      if (await fileExists(artifact.path)) return;

      await mkdir(dirname(artifact.path), { recursive: true });
      const expectedSize = artifact.size ?? 0;
      const report = (downloaded: number, total: number) => {
        const effectiveTotal = total > 0 ? total : expectedSize;
        onProgress?.(effectiveTotal > 0 ? Math.min(1, downloaded / effectiveTotal) : 0);
      };

      if (artifact.archiveDirectory) {
        const archivePath = `${artifact.path}.archive`;
        await downloadAtomic(artifact.urls, archivePath, report, artifact.sha256);
        try {
          await extractArchive(archivePath, artifact.archiveDirectory);
        } catch (error) {
          await rm(artifact.archiveDirectory, { recursive: true, force: true });
          throw error;
        } finally {
          await unlink(archivePath).catch(() => {});
        }
      } else {
        await downloadAtomic(artifact.urls, artifact.path, report, artifact.sha256);
      }

      if (artifact.executable) {
        await setExecutableIfNeeded(artifact.path);
      }
    });

    onProgress?.(1);
  }

  async function prepare(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    const artifacts = [spec.binary(), ...spec.model(modelId)];
    const sizes = artifacts.map((artifact) => artifact.size ?? 0);
    const totalSize = Math.max(
      1,
      sizes.reduce((sum, size) => sum + size, 0),
    );

    let completedSize = 0;
    for (const [index, artifact] of artifacts.entries()) {
      const artifactSize = sizes[index];
      await prepareArtifact(artifact, (artifactProgress) => {
        onProgress?.((completedSize + artifactProgress * artifactSize) / totalSize);
      });
      completedSize += artifactSize;
    }

    onProgress?.(1);
  }

  function runCli(modelId: string, audioPath: string, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(spec.binary().path, spec.args(modelId, audioPath), {
        stdio: ["ignore", "pipe", "pipe"],
      });

      if (signal) {
        signal.addEventListener("abort", () => childProcess.kill("SIGTERM"), { once: true });
      }

      let stdout = "";
      let stderr = "";
      childProcess.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      childProcess.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      childProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new TranscriptionError(`${spec.id} exited with code ${code}: ${stderr}`, spec.id));
          return;
        }
        resolve(stdout);
      });

      childProcess.on("error", (error) => {
        reject(new TranscriptionError(`Failed to spawn ${spec.id}: ${error.message}`, spec.id));
      });
    });
  }

  async function transcribe(audio: Buffer, signal?: AbortSignal): Promise<TranscriptionResult> {
    const modelId = parseModelId(spec.config.provider);
    if (!modelId) {
      throw new TranscriptionError("ASR model not specified", spec.id);
    }

    const startTime = Date.now();
    const sampleCount = Math.floor(audio.length / 2);

    const { path: audioPath, cleanup } = await writeTempAudio(audio);
    try {
      const stdout = await runCli(modelId, audioPath, signal);
      const text = spec.parse(stdout).trim();
      if (!text) {
        throw new NoSpeechError();
      }
      return {
        durationMs: Date.now() - startTime,
        language: undefined,
        sampleCount,
        text,
      };
    } finally {
      await cleanup();
    }
  }

  return { id: spec.id, models: spec.models, status, prepare, transcribe };
}
