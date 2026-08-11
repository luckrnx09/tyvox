import { AppError } from "@tyvox/sdk/server";
import type {
  SpeechConfig,
  ASRModel,
  ASRProviderGroup,
  ReadinessOutput,
} from "@tyvox/sdk/contracts";
import { ASR_REGISTRY, createASRProvider } from "./registry.js";
import { ProviderNotAvailableError } from "./errors.js";
import { parseModelId, parseProviderId } from "./model-reference.js";
import type { ModelStatus, TranscriptionResult } from "./types.js";
import { EXAMPLE_AUDIO_WAV_BASE64 } from "./example-audio.js";
import { getUserConfig } from "../user-config/index.js";
import { withTimeout } from "../../utils/with-timeout.js";
import { getLogger } from "../../utils/logger.js";

export async function transcribeAudio(
  wavBuffer: Buffer,
  config: SpeechConfig,
): Promise<TranscriptionResult> {
  const provider = createASRProvider(config);
  const modelId = parseModelId(config.provider);
  if (!modelId) {
    throw new ProviderNotAvailableError("ASR model not specified", provider.id);
  }

  const status = await provider.status(modelId);
  if (status.status !== "ready") {
    throw new ProviderNotAvailableError(`ASR model ${config.provider} is not ready`, provider.id);
  }

  return provider.transcribe(wavBuffer, undefined);
}

interface Job {
  status: ModelStatus["status"];
  progress?: number;
  error?: string;
}

const jobs = new Map<string, Job>();

function jobKey(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`;
}

export async function listASRModels(config: SpeechConfig): Promise<ASRProviderGroup[]> {
  return Promise.all(
    Object.entries(ASR_REGISTRY).map(async ([providerId, createProvider]) => {
      const provider = createProvider(config);
      const models = await Promise.all(
        provider.models().map(async (ref) => {
          const key = jobKey(ref.providerId, ref.modelId);
          const job = jobs.get(key);
          const status = job
            ? { status: job.status, progress: job.progress, error: job.error }
            : await provider.status(ref.modelId);
          return {
            id: key,
            name: ref.name ?? ref.modelId,
            status: status.status,
            progress: status.progress,
            error: status.error,
          } satisfies ASRModel;
        }),
      );
      return {
        id: providerId,
        name: providerId,
        modelSelection: "fixed" as const,
        models,
      } satisfies ASRProviderGroup;
    }),
  );
}

export function prepareASRModel(id: string, config: SpeechConfig): void {
  const providerId = parseProviderId(id);
  const modelId = parseModelId(id);
  const createProvider = ASR_REGISTRY[providerId];
  if (!createProvider || !modelId) {
    throw new AppError("MODEL_NOT_FOUND", `Unknown ASR model: ${id}`, 404);
  }

  const key = jobKey(providerId, modelId);
  const existing = jobs.get(key);
  if (existing && existing.status === "preparing") {
    return;
  }

  jobs.set(key, { status: "preparing", progress: 0 });
  const provider = createProvider(config);

  provider
    .prepare(modelId, (progress) => {
      jobs.set(key, { status: "preparing", progress });
    })
    .then(() => {
      jobs.delete(key);
    })
    .catch((error) => {
      jobs.set(key, { status: "error", error: String(error) });
    });
}

const ASR_READINESS_TIMEOUT_MS = 30_000;
const EXAMPLE_AUDIO_WAV = Buffer.from(EXAMPLE_AUDIO_WAV_BASE64, "base64");
const logger = getLogger("system");

export async function checkASRReadiness(userId: string): Promise<ReadinessOutput> {
  try {
    const config = await getUserConfig(userId);
    await withTimeout(
      transcribeAudio(EXAMPLE_AUDIO_WAV, config.speech),
      ASR_READINESS_TIMEOUT_MS,
      "ASR readiness check",
    );
    return { ready: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn({ userId, error: message }, "ASR readiness check failed");
    return { ready: false, error: message };
  }
}
