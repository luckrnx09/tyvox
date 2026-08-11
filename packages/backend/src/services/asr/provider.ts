import type { ASRModelRef, ModelStatus, TranscriptionResult } from "./types.js";

export interface ASRProvider {
  readonly id: string;
  models(): ASRModelRef[];
  status(modelId: string): Promise<ModelStatus>;
  prepare(modelId: string, onProgress?: (progress: number) => void): Promise<void>;
  transcribe(audio: Buffer, signal?: AbortSignal): Promise<TranscriptionResult>;
}
