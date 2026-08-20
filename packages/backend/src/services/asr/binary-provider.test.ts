import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, mkdir, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { downloadAtomic, setExecutableIfNeeded } from "./download.js";
import { NoSpeechError, TranscriptionError } from "./errors.js";
import { createBinaryASRProvider, type BinaryASRSpec } from "./binary-provider.js";

vi.mock("./download.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./download.js")>();
  return {
    ...actual,
    downloadAtomic: vi.fn(),
    setExecutableIfNeeded: vi.fn(),
  };
});

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

function createSpec(dir: string, overrides?: Partial<BinaryASRSpec>): BinaryASRSpec {
  return {
    id: "test-asr",
    config: { provider: "test-asr:base" as never, languages: [] },
    models: () => [{ providerId: "test-asr", modelId: "base" }],
    binary: () => ({
      path: join(dir, "bin", "cli"),
      urls: ["https://example.com/cli"],
      size: 100,
      sha256: "a".repeat(64),
      executable: true,
    }),
    model: () => [
      {
        path: join(dir, "models", "model.bin"),
        urls: ["https://example.com/model"],
        size: 300,
        sha256: "b".repeat(64),
      },
    ],
    args: () => ["-m", "model"],
    parse: (stdout) => stdout.trim(),
    ...overrides,
  };
}

function mockDownloadCreatesFile(): void {
  vi.mocked(downloadAtomic).mockImplementation(async (_urls, destination, onProgress) => {
    onProgress?.(1, 1);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, "artifact");
  });
}

function mockSpawn(stdout: string, exitCode: number, stderr = ""): void {
  vi.mocked(spawn).mockImplementation(() => {
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: () => void;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = () => {};
    setImmediate(() => {
      if (stdout) proc.stdout.emit("data", Buffer.from(stdout));
      if (stderr) proc.stderr.emit("data", Buffer.from(stderr));
      proc.emit("close", exitCode);
    });
    return proc as unknown as ReturnType<typeof spawn>;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("status", () => {
  it("reports ready when binary and model exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    const spec = createSpec(dir);
    await mkdir(join(dir, "bin"), { recursive: true });
    await mkdir(join(dir, "models"), { recursive: true });
    await writeFile(spec.binary().path, "x");
    await writeFile(spec.model("base")[0].path, "x");
    const provider = createBinaryASRProvider(spec);
    expect(await provider.status("base")).toEqual({ status: "ready" });
  });

  it("reports not_ready when any model file is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    const spec = createSpec(dir, {
      model: () => [
        {
          path: join(dir, "models", "a.onnx"),
          urls: ["https://example.com/a"],
          sha256: "a".repeat(64),
        },
        {
          path: join(dir, "models", "b.onnx"),
          urls: ["https://example.com/b"],
          sha256: "b".repeat(64),
        },
      ],
    });
    await mkdir(join(dir, "bin"), { recursive: true });
    await mkdir(join(dir, "models"), { recursive: true });
    await writeFile(spec.binary().path, "x");
    await writeFile(join(dir, "models", "a.onnx"), "x");
    const provider = createBinaryASRProvider(spec);
    expect(await provider.status("base")).toEqual({ status: "not_ready" });
  });

  it("reports error when the model is unknown", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    const provider = createBinaryASRProvider(
      createSpec(dir, {
        model: () => {
          throw new Error("unknown model");
        },
      }),
    );
    const status = await provider.status("unknown");
    expect(status.status).toBe("error");
  });
});

describe("prepare", () => {
  it("downloads artifacts with size-weighted progress", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    mockDownloadCreatesFile();
    const provider = createBinaryASRProvider(createSpec(dir));

    const progress: number[] = [];
    await provider.prepare("base", (p) => progress.push(p));

    expect(progress[0]).toBeLessThanOrEqual(0.25);
    expect(progress[progress.length - 1]).toBe(1);
    const sorted = [...progress].sort((a, b) => a - b);
    expect(progress).toEqual(sorted);
    expect(setExecutableIfNeeded).toHaveBeenCalledWith(join(dir, "bin", "cli"));
  });

  it("downloads every file of a multi-file model", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    mockDownloadCreatesFile();
    const provider = createBinaryASRProvider(
      createSpec(dir, {
        model: () => [
          {
            path: join(dir, "models", "a.onnx"),
            urls: ["https://example.com/a"],
            sha256: "a".repeat(64),
          },
          {
            path: join(dir, "models", "b.onnx"),
            urls: ["https://example.com/b"],
            sha256: "b".repeat(64),
          },
        ],
      }),
    );

    await provider.prepare("base");

    const downloaded = vi.mocked(downloadAtomic).mock.calls.map((call) => call[0][0]);
    expect(downloaded).toEqual([
      "https://example.com/cli",
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });

  it("extracts archives with tar into the archive directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    vi.mocked(downloadAtomic).mockResolvedValue(undefined);
    mockSpawn("", 0);
    const provider = createBinaryASRProvider(
      createSpec(dir, {
        binary: () => ({
          path: join(dir, "bin", "root", "bin", "cli"),
          urls: ["https://example.com/cli.tar.bz2"],
          sha256: "a".repeat(64),
          executable: true,
          archiveDirectory: join(dir, "bin"),
        }),
      }),
    );

    await provider.prepare("base");

    const tarCall = vi
      .mocked(spawn)
      .mock.calls.find((call) => call[0] === "tar" && call[1][0] === "-xf");
    expect(tarCall).toBeDefined();
    expect(tarCall![1]).toContain(join(dir, "bin"));
    expect(setExecutableIfNeeded).toHaveBeenCalledWith(join(dir, "bin", "root", "bin", "cli"));
  });

  it("reports tar stderr when archive extraction fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    vi.mocked(downloadAtomic).mockResolvedValue(undefined);
    mockSpawn("", 1, "tar: Permission denied");
    const provider = createBinaryASRProvider(
      createSpec(dir, {
        binary: () => ({
          path: join(dir, "bin", "root", "bin", "cli"),
          urls: ["https://example.com/cli.tar.bz2"],
          sha256: "a".repeat(64),
          executable: true,
          archiveDirectory: join(dir, "bin"),
        }),
      }),
    );

    await expect(provider.prepare("base")).rejects.toThrow("tar: Permission denied");
  });

  it("removes the archive directory when extraction fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    vi.mocked(downloadAtomic).mockResolvedValue(undefined);
    mockSpawn("", 1, "boom");
    const archiveDirectory = join(dir, "bin");
    const provider = createBinaryASRProvider(
      createSpec(dir, {
        binary: () => ({
          path: join(dir, "bin", "root", "bin", "cli"),
          urls: ["https://example.com/cli.tar.bz2"],
          sha256: "a".repeat(64),
          executable: true,
          archiveDirectory,
        }),
      }),
    );

    await expect(provider.prepare("base")).rejects.toThrow("tar exited with code 1");
    await expect(access(archiveDirectory)).rejects.toThrow();
  });

  it("skips download for existing artifacts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    const spec = createSpec(dir);
    await mkdir(join(dir, "bin"), { recursive: true });
    await mkdir(join(dir, "models"), { recursive: true });
    await writeFile(spec.binary().path, "x");
    await writeFile(spec.model("base")[0].path, "x");

    const provider = createBinaryASRProvider(spec);
    const progress: number[] = [];
    await provider.prepare("base", (p) => progress.push(p));

    expect(downloadAtomic).not.toHaveBeenCalled();
    expect(progress[progress.length - 1]).toBe(1);
  });

  it("throws when an artifact has no download url", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    const provider = createBinaryASRProvider(
      createSpec(dir, {
        binary: () => ({ urls: [], path: join(dir, "bin", "cli"), sha256: "" }),
      }),
    );
    await expect(provider.prepare("base")).rejects.toThrow("No download URL");
  });

  it("downloads a shared artifact only once under concurrency", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    mockDownloadCreatesFile();
    const provider = createBinaryASRProvider(createSpec(dir));

    await Promise.all([provider.prepare("base"), provider.prepare("base")]);

    const binaryDownloads = vi
      .mocked(downloadAtomic)
      .mock.calls.filter((call) => call[0][0] === "https://example.com/cli");
    expect(binaryDownloads).toHaveLength(1);
  });
});

describe("transcribe", () => {
  it("rejects when the config has no model id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    const provider = createBinaryASRProvider(
      createSpec(dir, { config: { provider: "test-asr" as never, languages: [] } }),
    );
    await expect(provider.transcribe(Buffer.alloc(4))).rejects.toThrow(TranscriptionError);
  });

  it("returns parsed text from cli output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    mockSpawn("hello world", 0);
    const provider = createBinaryASRProvider(createSpec(dir));

    const result = await provider.transcribe(Buffer.alloc(100));
    expect(result.text).toBe("hello world");
    expect(result.sampleCount).toBe(50);
  });

  it("rejects with NoSpeechError on empty output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    mockSpawn("", 0);
    const provider = createBinaryASRProvider(createSpec(dir));
    await expect(provider.transcribe(Buffer.alloc(100))).rejects.toThrow(NoSpeechError);
  });

  it("rejects with TranscriptionError on non-zero exit", async () => {
    const dir = await mkdtemp(join(tmpdir(), "asr-"));
    mockSpawn("", 1);
    const provider = createBinaryASRProvider(createSpec(dir));
    await expect(provider.transcribe(Buffer.alloc(100))).rejects.toThrow(TranscriptionError);
  });
});
