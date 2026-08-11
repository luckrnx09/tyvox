import type { LLMConfig, ReadinessOutput } from "@tyvox/sdk/contracts";
import { getUserConfig } from "../user-config/index.js";
import { withTimeout } from "../../utils/with-timeout.js";
import { getLogger } from "../../utils/logger.js";
import { streamChatCompletion, type ChatMessage } from "./client.js";
import { getLLMProviders } from "./providers/registry.js";
import { createThinkTagStripper, stripThinkTags } from "./strip-think-tags.js";

export type { ChatMessage };
export { getLLMProviders };

export interface ChatOptions {
  readonly onChunk?: (partial: string) => void;
  readonly onData?: () => void;
  readonly abortSignal?: AbortSignal;
  readonly thinkingEnabled?: boolean;
}

export interface LLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  chatStream(
    messages: ChatMessage[],
    options?: Omit<ChatOptions, "onChunk">,
  ): AsyncGenerator<string>;
}

export type ChatProvider = Pick<LLMProvider, "chat">;

export function createLLMProvider(config: LLMConfig): LLMProvider {
  return {
    async chat(messages, options) {
      let accumulated = "";
      for await (const chunk of streamChatCompletion({
        config,
        messages,
        thinkingEnabled: options?.thinkingEnabled,
        onData: options?.onData,
        abortSignal: options?.abortSignal,
      })) {
        accumulated += chunk;
        options?.onChunk?.(accumulated);
      }
      return stripThinkTags(accumulated);
    },
    chatStream(messages, options) {
      return (async function* () {
        const stripper = createThinkTagStripper();
        const stream = streamChatCompletion({
          config,
          messages,
          thinkingEnabled: options?.thinkingEnabled,
          onData: options?.onData,
          abortSignal: options?.abortSignal,
        });
        for await (const chunk of stream) {
          const visible = stripper.push(chunk);
          if (visible) yield visible;
        }
        const tail = stripper.flush();
        if (tail) yield tail;
      })();
    },
  };
}

const LLM_READINESS_TIMEOUT_MS = 10_000;
const logger = getLogger("system");

export async function checkLLMReadiness(userId: string): Promise<ReadinessOutput> {
  try {
    const config = await getUserConfig(userId);
    await withTimeout(
      createLLMProvider(config.llm).chat([{ content: "ping", role: "user" }], {
        thinkingEnabled: false,
      }),
      LLM_READINESS_TIMEOUT_MS,
      "LLM readiness check",
    );
    return { ready: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn({ userId, error: message }, "LLM readiness check failed");
    return { ready: false, error: message };
  }
}
