import { describe, it, expect, vi } from "vitest";
import { createBinaryASRProvider, type BinaryASRSpec } from "./binary-provider.js";
import { createSenseVoiceProvider } from "./sensevoice.js";

vi.mock("./binary-provider.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./binary-provider.js")>();
  return { ...actual, createBinaryASRProvider: vi.fn(actual.createBinaryASRProvider) };
});

function senseVoiceSpec(): BinaryASRSpec {
  createSenseVoiceProvider({ provider: "sensevoice:small", languages: [] });
  return vi.mocked(createBinaryASRProvider).mock.calls.at(-1)![0];
}

describe("sensevoice spec", () => {
  it("exposes a single model", () => {
    expect(senseVoiceSpec().models()).toEqual([
      { providerId: "sensevoice", modelId: "small", name: "SenseVoice Small" },
    ]);
  });

  it("downloads the int8 model, tokens and vad model with pinned revision", () => {
    const artifacts = senseVoiceSpec().model("small");
    expect(artifacts).toHaveLength(3);
    expect(artifacts[0].urls[0]).toContain("model.int8.onnx");
    expect(artifacts[0].urls[0]).not.toContain("/resolve/main/");
    expect(artifacts[0].urls[1]).toContain("hf-mirror.com");
    expect(artifacts[1].urls[0]).toContain("tokens.txt");
    expect(artifacts[2].urls[0]).toContain("silero_vad.onnx");
  });

  it("rejects unknown models", () => {
    expect(() => senseVoiceSpec().model("large")).toThrow("Unknown sensevoice model");
  });

  it("enables inverse text normalization for punctuation", () => {
    const args = senseVoiceSpec().args("small", "/tmp/a.wav");
    expect(args.find((a) => a.startsWith("--sense-voice-model="))).toContain("model.int8.onnx");
    expect(args).toContain("--sense-voice-use-itn=1");
    expect(args.find((a) => a.startsWith("--silero-vad-model="))).toContain("silero_vad.onnx");
    expect(args.at(-1)).toBe("/tmp/a.wav");
  });
});
