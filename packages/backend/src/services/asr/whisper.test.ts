import { describe, it, expect, vi } from "vitest";
import { createBinaryASRProvider, type BinaryASRSpec } from "./binary-provider.js";
import { createWhisperProvider } from "./whisper.js";

vi.mock("./binary-provider.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./binary-provider.js")>();
  return { ...actual, createBinaryASRProvider: vi.fn(actual.createBinaryASRProvider) };
});

function whisperSpec(): BinaryASRSpec {
  createWhisperProvider({ provider: "whisper:small", languages: [] });
  return vi.mocked(createBinaryASRProvider).mock.calls.at(-1)![0];
}

describe("whisper spec", () => {
  it("lists small, medium and large-v3 with display names", () => {
    expect(whisperSpec().models()).toEqual([
      { providerId: "whisper", modelId: "small", name: "small" },
      { providerId: "whisper", modelId: "medium", name: "medium" },
      { providerId: "whisper", modelId: "large-v3", name: "large (v3)" },
    ]);
  });

  it("downloads encoder, decoder, tokens and vad model with pinned revisions", () => {
    const artifacts = whisperSpec().model("small");
    expect(artifacts).toHaveLength(4);
    const [encoder, decoder, tokens, vad] = artifacts;
    expect(encoder.urls[0]).toContain("sherpa-onnx-whisper-small");
    expect(encoder.urls[0]).toContain("small-encoder.int8.onnx");
    expect(encoder.urls[0]).not.toContain("/resolve/main/");
    expect(encoder.urls[1]).toContain("hf-mirror.com");
    expect(decoder.urls[0]).toContain("small-decoder.int8.onnx");
    expect(tokens.urls[0]).toContain("small-tokens.txt");
    expect(vad.urls[0]).toContain("silero_vad.onnx");
  });

  it("rejects unknown models", () => {
    expect(() => whisperSpec().model("tiny")).toThrow("Unknown whisper model");
  });

  it("passes model files to the vad cli flags", () => {
    const args = whisperSpec().args("small", "/tmp/a.wav");
    expect(args.find((a) => a.startsWith("--whisper-encoder="))).toContain(
      "small-encoder.int8.onnx",
    );
    expect(args.find((a) => a.startsWith("--whisper-decoder="))).toContain(
      "small-decoder.int8.onnx",
    );
    expect(args.find((a) => a.startsWith("--tokens="))).toContain("small-tokens.txt");
    expect(args.find((a) => a.startsWith("--silero-vad-model="))).toContain("silero_vad.onnx");
    expect(args.at(-1)).toBe("/tmp/a.wav");
  });
});
