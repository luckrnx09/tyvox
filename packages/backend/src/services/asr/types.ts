export interface TranscriptionResult {
  readonly text: string;
  readonly language?: string;
  readonly durationMs: number;
  readonly sampleCount: number;
}

export interface ModelStatus {
  readonly status: "not_ready" | "preparing" | "ready" | "error";
  readonly progress?: number;
  readonly error?: string;
}

export interface ASRModelRef {
  readonly providerId: string;
  readonly modelId: string;
  readonly name?: string;
}
