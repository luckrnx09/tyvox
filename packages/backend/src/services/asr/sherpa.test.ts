import { describe, it, expect } from "vitest";
import { platform } from "node:os";
import {
  githubWithMirrors,
  huggingFaceWithMirror,
  parseSherpaVadOutput,
  sherpaVadBinary,
  sileroVadModel,
} from "./sherpa.js";

describe("githubWithMirrors", () => {
  it("puts the original url first followed by mirrors", () => {
    const url = "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.4/a.tar.bz2";
    const urls = githubWithMirrors(url);
    expect(urls[0]).toBe(url);
    expect(urls.length).toBeGreaterThan(1);
    for (const mirror of urls.slice(1)) {
      expect(mirror).toContain(url);
    }
  });
});

describe("huggingFaceWithMirror", () => {
  it("adds hf-mirror.com as the fallback", () => {
    const url = "https://huggingface.co/csukuangfj/repo/resolve/main/model.onnx";
    const urls = huggingFaceWithMirror(url);
    expect(urls).toEqual([url, "https://hf-mirror.com/csukuangfj/repo/resolve/main/model.onnx"]);
  });
});

describe("sherpaVadBinary", () => {
  it("targets the vad cli in the same archive", () => {
    const artifact = sherpaVadBinary();
    expect(artifact.urls[0]).toContain("github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.4");
    expect(artifact.path).toContain(
      platform() === "win32"
        ? "sherpa-onnx-vad-with-offline-asr.exe"
        : "sherpa-onnx-vad-with-offline-asr",
    );
    expect(artifact.executable).toBe(true);
    expect(artifact.archiveDirectory).toBeDefined();
  });
});

describe("sileroVadModel", () => {
  it("pins the asr-models release asset with mirror fallbacks", () => {
    const artifact = sileroVadModel();
    expect(artifact.urls[0]).toBe(
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx",
    );
    expect(artifact.urls.length).toBeGreaterThan(1);
    expect(artifact.path).toContain("silero_vad.onnx");
    expect(artifact.size).toBe(643_854);
  });
});

describe("parseSherpaVadOutput", () => {
  it("joins segment lines without a space for cjk text", () => {
    const stdout = ["0.000 -- 2.500: 你好", "2.500 -- 5.000: 世界"].join("\n");
    expect(parseSherpaVadOutput(stdout)).toBe("你好世界");
  });

  it("inserts a space between ascii word boundaries", () => {
    const stdout = ["0.000 -- 2.500: hello", "2.500 -- 5.000: world"].join("\n");
    expect(parseSherpaVadOutput(stdout)).toBe("hello world");
  });

  it("inserts a space after sentence-ending punctuation", () => {
    const stdout = ["0.000 -- 2.500: It ended.", "2.500 -- 5.000: After that"].join("\n");
    expect(parseSherpaVadOutput(stdout)).toBe("It ended. After that");
  });

  it("joins cjk punctuation without a space", () => {
    const stdout = ["0.000 -- 2.500: 说完了。", "2.500 -- 5.000: 然后呢"].join("\n");
    expect(parseSherpaVadOutput(stdout)).toBe("说完了。然后呢");
  });

  it("skips empty segments and non-segment lines", () => {
    const stdout = [
      "Creating recognizer ...",
      "0.000 -- 2.500: ",
      "2.500 -- 5.000: ok",
      "Done!",
    ].join("\n");
    expect(parseSherpaVadOutput(stdout)).toBe("ok");
  });

  it("returns empty string when no segment line exists", () => {
    expect(parseSherpaVadOutput("no segments here")).toBe("");
  });
});
