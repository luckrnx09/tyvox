import { LLMProviderSchema, type LLMConfig } from "@tyvox/sdk/contracts";
import { DEFAULT_CONFIG } from "../repositories/index.js";

export function loadEnvConfig(): { llmConfig: LLMConfig; judgeModel: string } {
  const {
    EVAL_LLM_PROVIDER: evalProvider,
    EVAL_LLM_BASE_URL: baseUrl,
    EVAL_LLM_MODEL: model,
    EVAL_LLM_API_KEY: apiKey,
    EVAL_JUDGE_MODEL: judgeModel,
  } = process.env;
  if (!baseUrl || !model) {
    throw new Error("EVAL_LLM_BASE_URL and EVAL_LLM_MODEL are required");
  }
  const parsedProvider = LLMProviderSchema.safeParse(evalProvider);
  if (evalProvider && !parsedProvider.success) {
    throw new Error(`Invalid EVAL_LLM_PROVIDER: ${evalProvider}`);
  }
  return {
    llmConfig: {
      ...DEFAULT_CONFIG.llm,
      provider: parsedProvider.success ? parsedProvider.data : DEFAULT_CONFIG.llm.provider,
      baseUrl,
      model,
      apiKey: apiKey ?? "",
    },
    judgeModel: judgeModel ?? model,
  };
}
