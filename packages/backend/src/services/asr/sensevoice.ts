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

const PROVIDER_ID = "sensevoice";
const MODEL_ID = "small";

const HUGGING_FACE_REPO =
  "https://huggingface.co/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve";
const MODEL_REVISION = "2365baeacb507f821a0c8120fcee3d484dba7a07";

const FILES: Array<[file: string, size: number, sha256: string]> = [
  [
    "model.int8.onnx",
    239_233_841,
    "c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51",
  ],
  ["tokens.txt", 315_894, "f449eb28dc567533d7fa59be34e2abca8784f771850c78a47fb731a31429a1dc"],
];

function model(modelId: string): BinaryArtifact[] {
  if (modelId !== MODEL_ID) {
    throw new ProviderNotAvailableError(`Unknown sensevoice model: ${modelId}`, PROVIDER_ID);
  }
  return [
    ...FILES.map(([file, size, sha256]) => ({
      urls: huggingFaceWithMirror(`${HUGGING_FACE_REPO}/${MODEL_REVISION}/${file}`),
      path: join(MODELS_DIRECTORY, PROVIDER_ID, file),
      size,
      sha256,
    })),
    sileroVadModel(),
  ];
}

function args(modelId: string, audioPath: string): string[] {
  const [modelFile, tokens, vad] = model(modelId);
  return [
    `--sense-voice-model=${modelFile.path}`,
    `--tokens=${tokens.path}`,
    "--sense-voice-use-itn=1",
    `--silero-vad-model=${vad.path}`,
    `--num-threads=${Math.max(1, Math.floor(cpus().length / 2))}`,
    audioPath,
  ];
}

function models(): ASRModelRef[] {
  return [{ providerId: PROVIDER_ID, modelId: MODEL_ID, name: "SenseVoice Small" }];
}

export function createSenseVoiceProvider(config: SpeechConfig): ASRProvider {
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
