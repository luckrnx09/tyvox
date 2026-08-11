import { cpus } from "node:os";
import { join } from "node:path";
import type { SpeechConfig } from "@tyvox/sdk/contracts";
import type { ASRProvider } from "./provider.js";
import {
  createBinaryASRProvider,
  MODELS_DIRECTORY,
  type BinaryArtifact,
} from "./binary-provider.js";
import {
  huggingFaceWithMirror,
  parseSherpaVadOutput,
  sherpaVadBinary,
  sileroVadModel,
} from "./sherpa.js";
import { ProviderNotAvailableError } from "./errors.js";
import type { ASRModelRef } from "./types.js";

const PROVIDER_ID = "whisper";

const HUGGING_FACE_REPO = "https://huggingface.co/csukuangfj";

interface WhisperModel {
  name: string;
  repo: string;
  revision: string;
  prefix: string;
  encoderSize: number;
  encoderSha256: string;
  decoderSize: number;
  decoderSha256: string;
  tokensSize: number;
}

const TOKENS_SHA256 = "b34b360dbb493e781e479794586d661700670d65564001f23024971d1f2fa126";

const MODELS: Record<string, WhisperModel> = {
  small: {
    name: "small",
    repo: "sherpa-onnx-whisper-small",
    revision: "8f3c18b358db4d1f2fc1eae49d75cd20989e4309",
    prefix: "small",
    encoderSize: 112_442_483,
    encoderSha256: "4cbe7b22fa9026b843b60a68640c747de05bafb1a11b57edc0e66c232d9f33a9",
    decoderSize: 262_226_114,
    decoderSha256: "acad50b5c782696e91b55914cc5ab4f756f1532f76e22aa6fc615f39fb69a8ee",
    tokensSize: 816_730,
  },
  medium: {
    name: "medium",
    repo: "sherpa-onnx-whisper-medium",
    revision: "8c31d28503847560985df21f90e14f0c736e075e",
    prefix: "medium",
    encoderSize: 374_196_283,
    encoderSha256: "1c54582b4d829de0089f6cb63bbbdb3bf7555398bacaf855fbecf1a84dfd193e",
    decoderSize: 571_059_257,
    decoderSha256: "595d00a338a365a7bfa0ca7f296cabc639583bef770ab6130df90f49a6412747",
    tokensSize: 816_730,
  },
  "large-v3": {
    name: "large (v3)",
    repo: "sherpa-onnx-whisper-large-v3",
    revision: "2a6507094dd6020d939d78e3f1834a1d06267fca",
    prefix: "large-v3",
    encoderSize: 766_671_985,
    encoderSha256: "d531cf17248acc43e8c09b472a0877055e770877857a5332fc1304b36534ec85",
    decoderSize: 1_008_265_203,
    decoderSha256: "ebc6bfd88e162a46cb3edee8a7e727e1dcbc65cabecb19e2573695e4d495e1af",
    tokensSize: 816_730,
  },
};

function lookup(modelId: string): WhisperModel {
  const model = MODELS[modelId];
  if (!model) {
    throw new ProviderNotAvailableError(`Unknown whisper model: ${modelId}`, PROVIDER_ID);
  }
  return model;
}

function model(modelId: string): BinaryArtifact[] {
  const entry = lookup(modelId);
  const files: Array<[file: string, size: number, sha256: string]> = [
    [`${entry.prefix}-encoder.int8.onnx`, entry.encoderSize, entry.encoderSha256],
    [`${entry.prefix}-decoder.int8.onnx`, entry.decoderSize, entry.decoderSha256],
    [`${entry.prefix}-tokens.txt`, entry.tokensSize, TOKENS_SHA256],
  ];
  return [
    ...files.map(([file, size, sha256]) => ({
      urls: huggingFaceWithMirror(
        `${HUGGING_FACE_REPO}/${entry.repo}/resolve/${entry.revision}/${file}`,
      ),
      path: join(MODELS_DIRECTORY, PROVIDER_ID, modelId, file),
      size,
      sha256,
    })),
    sileroVadModel(),
  ];
}

function args(modelId: string, audioPath: string): string[] {
  const [encoder, decoder, tokens, vad] = model(modelId);
  return [
    `--whisper-encoder=${encoder.path}`,
    `--whisper-decoder=${decoder.path}`,
    `--tokens=${tokens.path}`,
    `--silero-vad-model=${vad.path}`,
    `--num-threads=${Math.max(1, Math.floor(cpus().length / 2))}`,
    audioPath,
  ];
}

function models(): ASRModelRef[] {
  return Object.entries(MODELS).map(([modelId, entry]) => ({
    providerId: PROVIDER_ID,
    modelId,
    name: entry.name,
  }));
}

export function createWhisperProvider(config: SpeechConfig): ASRProvider {
  return createBinaryASRProvider({
    id: PROVIDER_ID,
    config,
    models,
    binary: sherpaVadBinary,
    model,
    args,
    parse: parseSherpaVadOutput,
  });
}
