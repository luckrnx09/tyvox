import type { SpeechConfig } from "@tyvox/sdk/contracts";
import { parseModelId } from "./model-reference.js";
import type { ASRProvider } from "./provider.js";
import { ProviderInitError, NoSpeechError, TranscriptionError } from "./errors.js";
import type { ModelStatus, TranscriptionResult } from "./types.js";

export interface ApiASRSpec {
  id: string;
  config: SpeechConfig;
  defaultEndpoint: string;
  defaultModel: string;
}

const TRANSCRIBE_TIMEOUT_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;

export function createApiASRProvider(spec: ApiASRSpec): ASRProvider {
  function endpoint(): string {
    return spec.config.url ?? spec.defaultEndpoint;
  }

  function modelId(): string {
    return parseModelId(spec.config.provider) ?? spec.defaultModel;
  }

  async function probeEndpoint(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      const response = await fetch(`${endpoint().replace(/\/audio\/transcriptions$/, "")}/models`, {
        headers: { Authorization: `Bearer ${spec.config.apiKey}` },
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  async function status(): Promise<ModelStatus> {
    if (!spec.config.apiKey) {
      return { status: "not_ready", error: "API key is required" };
    }

    const ready = await probeEndpoint();
    if (!ready) {
      return { status: "not_ready", error: "Endpoint is unreachable" };
    }

    return { status: "ready" };
  }

  async function prepare(): Promise<void> {
    const current = await status();
    if (current.status !== "ready") {
      throw new ProviderInitError(current.error ?? "API provider is not ready", spec.id);
    }
  }

  async function transcribe(audio: Buffer, signal?: AbortSignal): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const sampleCount = Math.floor(audio.length / 2);

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), "audio.wav");
    formData.append("model", modelId());
    formData.append("response_format", "json");

    const controller = new AbortController();
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const timeout = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint(), {
        body: formData,
        headers: { Authorization: `Bearer ${spec.config.apiKey}` },
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new TranscriptionError(
          `${spec.id} returned ${response.status}: ${errorText}`,
          spec.id,
        );
      }

      const data: { text?: string } = await response.json();
      if (!data.text?.trim()) {
        throw new NoSpeechError();
      }

      return {
        durationMs: Date.now() - startTime,
        sampleCount,
        text: data.text.trim(),
      };
    } catch (error) {
      if (error instanceof NoSpeechError || error instanceof TranscriptionError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new TranscriptionError(`${spec.id} transcription timed out after 30s`, spec.id);
      }
      throw new TranscriptionError(`${spec.id} failed: ${String(error)}`, spec.id);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    id: spec.id,
    models: () => [{ providerId: spec.id, modelId: modelId() }],
    status,
    prepare,
    transcribe,
  };
}
