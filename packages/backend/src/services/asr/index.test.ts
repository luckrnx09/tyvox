import { describe, it, expect, vi } from "vitest";
import { AppError } from "@tyvox/sdk/server";
import { transcribeAudio, listASRModels, prepareASRModel, checkASRReadiness } from "./index.js";
import { createASRProvider, ASR_REGISTRY } from "./registry.js";
import { ProviderNotAvailableError } from "./errors.js";
import { getUserConfig } from "../user-config/index.js";
import { DEFAULT_CONFIG } from "../../repositories/user-config.js";
import type { ASRProvider } from "./provider.js";

vi.mock("./registry.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry.js")>();
  return {
    ...actual,
    createASRProvider: vi.fn(actual.createASRProvider),
    ASR_REGISTRY: {
      whisper: vi.fn(actual.ASR_REGISTRY["whisper"]),
      sensevoice: vi.fn(actual.ASR_REGISTRY["sensevoice"]),
    },
  };
});

vi.mock("../user-config/index.js", () => ({
  getUserConfig: vi.fn(),
}));

describe("createASRProvider", () => {
  it("rejects unknown providers", () => {
    expect(() => createASRProvider({ provider: "unknown:model" as never, languages: [] })).toThrow(
      "Unknown ASR provider",
    );
  });
});

describe("transcribeAudio", () => {
  it("rejects config without a model id", async () => {
    await expect(
      transcribeAudio(Buffer.alloc(0), { provider: "whisper" as never, languages: [] }),
    ).rejects.toThrow(ProviderNotAvailableError);
  });

  it("rejects when the model is not ready", async () => {
    vi.mocked(createASRProvider).mockReturnValue({
      id: "whisper",
      status: vi.fn().mockResolvedValue({ status: "not_ready" }),
    } as unknown as ASRProvider);

    await expect(
      transcribeAudio(Buffer.alloc(0), { provider: "whisper:small", languages: [] }),
    ).rejects.toThrow(ProviderNotAvailableError);
  });
});

describe("listASRModels", () => {
  it("groups models by provider with their status and display names", async () => {
    const groups = await listASRModels({ provider: "whisper:small", languages: [] });
    expect(groups.map((group) => group.id)).toEqual(["whisper", "sensevoice"]);
    const whisper = groups[0];
    expect(whisper.models.map((model) => model.id)).toEqual([
      "whisper:small",
      "whisper:medium",
      "whisper:large-v3",
    ]);
    expect(whisper.models.map((model) => model.name)).toEqual(["small", "medium", "large (v3)"]);
    for (const model of whisper.models) {
      expect(["ready", "not_ready"]).toContain(model.status);
    }
  });
});

describe("prepareASRModel", () => {
  it("rejects unknown models", () => {
    expect(() =>
      prepareASRModel("unknown:model", { provider: "whisper:small", languages: [] }),
    ).toThrow(AppError);
  });

  it("deduplicates concurrent preparations of the same model", () => {
    const prepare = vi.fn().mockReturnValue(new Promise<void>(() => {}));
    vi.mocked(ASR_REGISTRY["whisper"]).mockReturnValue({ prepare } as unknown as ASRProvider);

    prepareASRModel("whisper:small", { provider: "whisper:small", languages: [] });
    prepareASRModel("whisper:small", { provider: "whisper:small", languages: [] });

    expect(prepare).toHaveBeenCalledTimes(1);
  });
});

describe("checkASRReadiness", () => {
  it("returns ready when transcription succeeds", async () => {
    vi.mocked(getUserConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(createASRProvider).mockReturnValue({
      id: "whisper",
      status: vi.fn().mockResolvedValue({ status: "ready" }),
      transcribe: vi.fn().mockResolvedValue({ text: "hi", durationMs: 100, sampleCount: 1600 }),
    } as unknown as ASRProvider);

    const result = await checkASRReadiness("user-1");

    expect(result).toEqual({ ready: true });
  });

  it("returns not ready when transcription fails", async () => {
    vi.mocked(getUserConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(createASRProvider).mockReturnValue({
      id: "whisper",
      status: vi.fn().mockResolvedValue({ status: "not_ready" }),
    } as unknown as ASRProvider);

    const result = await checkASRReadiness("user-1");

    expect(result.ready).toBe(false);
    expect(result.error).toContain("not ready");
  });
});
