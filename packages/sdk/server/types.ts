import type {
  SpeechConfig,
  ClientLogEntry,
  FinalizeTranscribeOutput,
  GetVocabularyOutput,
  ListASRModelsOutput,
  ListLLMProvidersOutput,
  ReadinessOutput,
  TransformTextEnrichOption,
  UserConfig,
  UserConfigPartial,
} from "../contracts/index.js";

export interface UserContext {
  id: string;
}

export type AppEnv = {
  Variables: {
    user: UserContext;
  };
};

export interface Services {
  transcribeService: {
    sendChunk(userId: string, sessionId: string, chunk: Buffer): Promise<{ receivedBytes: number }>;
    finalize(userId: string, sessionId: string): Promise<FinalizeTranscribeOutput>;
  };
  clientLogService: {
    write(source: string, entries: ClientLogEntry[]): Promise<void>;
  };
  vocabularyService: {
    get(userId: string): Promise<GetVocabularyOutput>;
    clear(userId: string): Promise<void>;
    add(userId: string, vocabulary: string): Promise<void>;
    delete(userId: string, vocabulary: string): Promise<void>;
    rename(userId: string, oldVocabulary: string, newVocabulary: string): Promise<void>;
  };
  userConfigService: {
    get(userId: string): Promise<UserConfig>;
    update(userId: string, partial: UserConfigPartial): Promise<UserConfig>;
  };
  transformService: {
    run(
      userId: string,
      text: string,
      enrichOptions?: TransformTextEnrichOption[],
      timeoutScale?: number,
    ): Promise<AsyncGenerator<string>>;
  };
  asrService: {
    listModels(config: SpeechConfig): Promise<ListASRModelsOutput>;
    prepareModel(id: string, config: SpeechConfig): void;
    checkReadiness(userId: string): Promise<ReadinessOutput>;
  };
  llmProviderService: {
    listProviders(): Promise<ListLLMProvidersOutput>;
    checkReadiness(userId: string): Promise<ReadinessOutput>;
  };
}
