import { z } from "zod";

// ─── Config ────────────────────────────────────────────────

export const ASRProviderSchema = z.enum([
  "whisper:small",
  "whisper:medium",
  "whisper:large-v3",
  "sensevoice:small",
]);

export const ToneSchema = z.enum(["professional", "casual", "concise", "formal"]);

export const LLMProviderSchema = z.enum([
  "ark",
  "deepseek",
  "siliconflow",
  "openai",
  "openrouter",
  "minimax",
  "stepfun",
  "dashscope",
  "zhipu",
  "moonshot",
  "ollama",
  "gemini",
  "groq",
  "custom",
]);

export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema,
  apiKey: z.string(),
  baseUrl: z.string(),
  model: z.string(),
  tone: ToneSchema,
  thinkingEnabled: z.boolean().default(false),
  extraBody: z.string().optional(),
});

export const LLMProviderInfoSchema = z.object({
  id: LLMProviderSchema,
  name: z.string(),
  defaultBaseUrl: z.string(),
});

export const ListLLMProvidersOutputSchema = z.array(LLMProviderInfoSchema);

export const SpeechConfigSchema = z.object({
  provider: ASRProviderSchema,
  apiKey: z.string().optional(),
  url: z.string().optional(),
  languages: z.array(z.string()).max(3),
});

export const TranslatePayloadSchema = z.object({
  target: z.string(),
});

export const ActionsConfigSchema = z.object({
  basic: z.object({
    hotkey: z.object({ accelerator: z.string() }),
  }),
  translate: z.object({
    hotkey: z.object({ accelerator: z.string() }),
    payload: TranslatePayloadSchema,
  }),
});

export const ActionTypeSchema = ActionsConfigSchema.keyof();

export const DesktopConfigSchema = z.object({
  hotkey: z.object({ mode: z.enum(["ptt", "toggle"]) }),
  actions: ActionsConfigSchema,
  microphone: z.object({
    deviceId: z.string(),
  }),
  uiLocale: z.enum(["en", "zh"]),
});

export const UserConfigSchema = z.object({
  version: z.literal(1),
  desktop: DesktopConfigSchema,
  llm: LLMConfigSchema,
  speech: SpeechConfigSchema,
});

type DeepPartial<T> = T extends unknown[]
  ? T
  : { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function deepPartial(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(schema.shape).map(([key, value]) => [
        key,
        deepPartial(value as z.ZodType).optional(),
      ]),
    );
    return z.object(shape);
  }
  return schema;
}

export const UserConfigPartialSchema = deepPartial(UserConfigSchema) as z.ZodType<
  DeepPartial<UserConfig>
>;

export type ASRProvider = z.infer<typeof ASRProviderSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type SpeechConfig = z.infer<typeof SpeechConfigSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type TranslatePayload = z.infer<typeof TranslatePayloadSchema>;
export type ActionsConfig = z.infer<typeof ActionsConfigSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type DesktopConfig = z.infer<typeof DesktopConfigSchema>;
export type UserConfig = z.infer<typeof UserConfigSchema>;
export type UserConfigPartial = z.infer<typeof UserConfigPartialSchema>;

// ─── Transform ─────────────────────────────────────────────

export const TransformTextEnrichOptionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("translate"), payload: TranslatePayloadSchema }),
]);

export const TransformTextInputSchema = z.object({
  text: z.string().min(1),
  enrichOptions: z.array(TransformTextEnrichOptionSchema),
  timeoutScale: z.number().int().min(1).max(5).optional(),
});

export const TransformTextStreamEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("thinking"), data: z.object({}).passthrough() }),
  z.object({ event: z.literal("chunk"), data: z.object({ text: z.string() }) }),
  z.object({ event: z.literal("done"), data: z.object({ text: z.string() }) }),
  z.object({
    event: z.literal("error"),
    data: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export type TransformTextStreamEvent = z.infer<typeof TransformTextStreamEventSchema>;
export type TransformTextEnrichOption = z.infer<typeof TransformTextEnrichOptionSchema>;
export type TransformTextInput = z.infer<typeof TransformTextInputSchema>;

// ─── Transcribe ────────────────────────────────────────────

export const SendTranscribeChunkOutputSchema = z.object({
  receivedBytes: z.number().int(),
});

export const FinalizeTranscribeOutputSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  durationMs: z.number().int(),
});

export type SendTranscribeChunkOutput = z.infer<typeof SendTranscribeChunkOutputSchema>;
export type FinalizeTranscribeOutput = z.infer<typeof FinalizeTranscribeOutputSchema>;

// ─── Vocabulary ────────────────────────────────────────────

export const GetVocabularyOutputSchema = z.object({
  vocabulary: z.record(z.string(), z.number()),
});

export const RenameEntryInputSchema = z.object({
  newEntry: z.string().min(1),
});

export type GetVocabularyOutput = z.infer<typeof GetVocabularyOutputSchema>;
export type RenameEntryInput = z.infer<typeof RenameEntryInputSchema>;

// ─── User Config ───────────────────────────────────────────

export const GetUserConfigOutputSchema = UserConfigSchema;

export const UpdateUserConfigInputSchema = UserConfigPartialSchema;

export const UpdateUserConfigOutputSchema = UserConfigSchema;

export type GetUserConfigOutput = z.infer<typeof GetUserConfigOutputSchema>;
export type UpdateUserConfigInput = z.infer<typeof UpdateUserConfigInputSchema>;
export type UpdateUserConfigOutput = z.infer<typeof UpdateUserConfigOutputSchema>;

// ─── ASR Models ────────────────────────────────────────────

export const ASRModelStatusSchema = z.enum(["not_ready", "preparing", "ready", "error"]);

export const ASRModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ASRModelStatusSchema,
  progress: z.number().min(0).max(1).optional(),
  error: z.string().optional(),
});

export const ASRProviderGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  modelSelection: z.enum(["fixed", "custom"]),
  models: z.array(ASRModelSchema),
});

export const ListASRModelsOutputSchema = z.array(ASRProviderGroupSchema);

export type ASRModelStatus = z.infer<typeof ASRModelStatusSchema>;
export type ASRModel = z.infer<typeof ASRModelSchema>;
export type ASRProviderGroup = z.infer<typeof ASRProviderGroupSchema>;
export type ListASRModelsOutput = z.infer<typeof ListASRModelsOutputSchema>;

// ─── Health ────────────────────────────────────────────────

export const HealthCheckOutputSchema = z.object({
  status: z.string(),
  version: z.string(),
});

export type HealthCheckOutput = z.infer<typeof HealthCheckOutputSchema>;

export const ReadinessOutputSchema = z.object({
  ready: z.boolean(),
  error: z.string().optional(),
});

export type ReadinessOutput = z.infer<typeof ReadinessOutputSchema>;

// ─── Logs ──────────────────────────────────────────────────

export const ClientLogLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export const ClientLogEntrySchema = z.object({
  level: ClientLogLevelSchema,
  message: z.string(),
  sessionId: z.string().optional(),
  stack: z.string().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type ClientLogLevel = z.infer<typeof ClientLogLevelSchema>;
export type ClientLogEntry = z.infer<typeof ClientLogEntrySchema>;

// ─── Error ─────────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type LLMProviderInfo = z.infer<typeof LLMProviderInfoSchema>;
export type ListLLMProvidersOutput = z.infer<typeof ListLLMProvidersOutputSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
