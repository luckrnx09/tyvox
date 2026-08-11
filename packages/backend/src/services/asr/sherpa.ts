import { arch, platform } from "node:os";
import { join } from "node:path";
import { BINARY_DIRECTORY, MODELS_DIRECTORY, type BinaryArtifact } from "./binary-provider.js";

const SHERPA_VERSION = "1.13.4";

const GITHUB_RELEASE = `https://github.com/k2-fsa/sherpa-onnx/releases/download/v${SHERPA_VERSION}`;
const GITHUB_MIRRORS = ["https://ghproxy.net/", "https://gh-proxy.com/"];

const ARCHIVES: Record<string, { name: string; size: number; sha256: string }> = {
  "linux-x64": {
    name: `sherpa-onnx-v${SHERPA_VERSION}-linux-x64-static.tar.bz2`,
    size: 384_752_102,
    sha256: "c98b4d91edbcba5087e7847e07529337001b834fe352931ff008ac7c5722fa6f",
  },
  "linux-arm64": {
    name: `sherpa-onnx-v${SHERPA_VERSION}-linux-aarch64-static.tar.bz2`,
    size: 337_820_882,
    sha256: "418bda59e5d02b16d309c6c7850d967c5c855e71184ab6ac6a9b1c79456b2d8f",
  },
  "darwin-x64": {
    name: `sherpa-onnx-v${SHERPA_VERSION}-osx-x64-static.tar.bz2`,
    size: 254_918_578,
    sha256: "15cf31d64456ae033c9d81c52df796d9bf003893ed060eb8434012a297945103",
  },
  "darwin-arm64": {
    name: `sherpa-onnx-v${SHERPA_VERSION}-osx-arm64-static.tar.bz2`,
    size: 231_438_974,
    sha256: "b1830ce2f19169070c23c2a44b70e1d416e0265e98870a2f62f7aa94811db342",
  },
  "win32-x64": {
    name: `sherpa-onnx-v${SHERPA_VERSION}-win-x64-static-MD-Release.tar.bz2`,
    size: 204_426_106,
    sha256: "273c9b6e74870d59959618bad688c38742178ee016b5035b8e042865a0a91b75",
  },
  "win32-arm64": {
    name: `sherpa-onnx-v${SHERPA_VERSION}-win-arm64-static-MD-Release.tar.bz2`,
    size: 201_561_604,
    sha256: "7baae6021c4d4be3a51a52bc9d9da744bdbc7f8c143225154da1b0216aba252a",
  },
};

export function githubWithMirrors(url: string): string[] {
  return [url, ...GITHUB_MIRRORS.map((mirror) => `${mirror}${url}`)];
}

export function huggingFaceWithMirror(url: string): string[] {
  return [url, url.replace("https://huggingface.co/", "https://hf-mirror.com/")];
}

const SILERO_VAD_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx";
const SILERO_VAD_SIZE = 643_854;
const SILERO_VAD_SHA256 = "9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6";

function sherpaCliArtifact(binaryName: string): BinaryArtifact {
  const archive = ARCHIVES[`${platform()}-${arch()}`];
  const extension = platform() === "win32" ? ".exe" : "";
  const root = (archive?.name ?? `sherpa-onnx-v${SHERPA_VERSION}-unsupported`).replace(
    /\.tar\.bz2$/,
    "",
  );
  const path = join(BINARY_DIRECTORY, root, "bin", `${binaryName}${extension}`);
  if (!archive) {
    return { urls: [], path, sha256: "" };
  }
  return {
    urls: githubWithMirrors(`${GITHUB_RELEASE}/${archive.name}`),
    path,
    size: archive.size,
    sha256: archive.sha256,
    executable: true,
    archiveDirectory: BINARY_DIRECTORY,
  };
}

export function sherpaVadBinary(): BinaryArtifact {
  return sherpaCliArtifact("sherpa-onnx-vad-with-offline-asr");
}

export function sileroVadModel(): BinaryArtifact {
  return {
    urls: githubWithMirrors(SILERO_VAD_URL),
    path: join(MODELS_DIRECTORY, "silero-vad", "silero_vad.onnx"),
    size: SILERO_VAD_SIZE,
    sha256: SILERO_VAD_SHA256,
  };
}

const VAD_SEGMENT_PATTERN = /^\d+\.\d+ -- \d+\.\d+: (.*)$/;
const CJK_CHAR = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/;

export function parseSherpaVadOutput(stdout: string): string {
  let result = "";
  for (const line of stdout.split("\n")) {
    const text = VAD_SEGMENT_PATTERN.exec(line.trim())?.[1]?.trim();
    if (!text) continue;
    const lastChar = result.at(-1) ?? "";
    const needsSpace = result.length > 0 && !CJK_CHAR.test(lastChar) && !CJK_CHAR.test(text[0]!);
    result += (needsSpace ? " " : "") + text;
  }
  return result;
}
