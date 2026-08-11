import { randomUUID } from "node:crypto";
import type { TransformTextEnrichOption } from "@tyvox/sdk/contracts";
import {
  historyRepository,
  personaRepository,
  recentHistoryRepository,
} from "../../repositories/index.js";
import { createLLMProvider } from "../llm/index.js";
import { LLM_TIMEOUT_SECONDS } from "../llm/constants.js";
import { buildTransformPrompt } from "./prompts/index.js";
import { buildRecentHistorySection } from "./prompts/recent-history.js";
import { TONE_PRESETS } from "./prompts/tone.js";
import { getUserConfig } from "../user-config/index.js";
import { getVocabularyMarkdown } from "../vocabulary/index.js";
import { getLogger } from "../../utils/logger.js";

const STALL_TIMEOUT_MS = 10_000;
const FIRST_TOKEN_TIMEOUT_CAP_SECONDS = 120;
const CHARS_PER_FIRST_TOKEN_SECOND = 10;
const systemLogger = getLogger("system");

export function computeFirstTokenTimeoutSeconds(
  textLength: number,
  configuredSeconds: number,
): number {
  const lengthBasedSeconds = Math.ceil(textLength / CHARS_PER_FIRST_TOKEN_SECOND);
  return Math.min(FIRST_TOKEN_TIMEOUT_CAP_SECONDS, Math.max(configuredSeconds, lengthBasedSeconds));
}

function createTimeoutController(timeoutSeconds: number) {
  const controller = new AbortController();
  let firstTokenTimer: ReturnType<typeof setTimeout> | null = setTimeout(
    () => controller.abort(),
    timeoutSeconds * 1000,
  );
  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  const onData = (): void => {
    if (firstTokenTimer) {
      clearTimeout(firstTokenTimer);
      firstTokenTimer = null;
    }
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  };

  const clear = (): void => {
    if (firstTokenTimer) clearTimeout(firstTokenTimer);
    if (stallTimer) clearTimeout(stallTimer);
  };

  return { clear, controller, onData };
}

export async function transformText(
  userId: string,
  text: string,
  enrichOptions: TransformTextEnrichOption[],
  timeoutScale = 1,
): Promise<AsyncGenerator<string>> {
  const startTime = Date.now();
  systemLogger.info(
    { userId, text, textLength: text.length, enrichOptions, timeoutScale },
    "Transform started",
  );

  const config = await getUserConfig(userId);
  const [persona, vocabulary, recentEntries] = await Promise.all([
    personaRepository.read(userId),
    getVocabularyMarkdown(userId),
    recentHistoryRepository.list(userId),
  ]);

  const systemPrompt = buildTransformPrompt(enrichOptions, {
    persona,
    vocabulary,
    tone: TONE_PRESETS[config.llm.tone],
    languages: config.speech.languages.join(", ") || "",
    recentHistory: buildRecentHistorySection(recentEntries),
  });

  const provider = createLLMProvider(config.llm);
  const baseTimeoutSeconds = computeFirstTokenTimeoutSeconds(text.length, LLM_TIMEOUT_SECONDS);
  const firstTokenTimeoutSeconds = Math.min(
    FIRST_TOKEN_TIMEOUT_CAP_SECONDS,
    baseTimeoutSeconds * timeoutScale,
  );
  const {
    clear: clearTimers,
    controller,
    onData,
  } = createTimeoutController(firstTokenTimeoutSeconds);

  return (async function* () {
    let polished = "";
    try {
      const stream = provider.chatStream(
        [
          { content: systemPrompt, role: "system" },
          { content: text, role: "user" },
        ],
        {
          abortSignal: controller.signal,
          onData,
          thinkingEnabled: config.llm.thinkingEnabled,
        },
      );

      for await (const chunk of stream) {
        polished += chunk;
        yield chunk;
      }
      systemLogger.info(
        { userId, durationMs: Date.now() - startTime, text, output: polished },
        "Transform finished",
      );
    } catch (error) {
      systemLogger.error(
        {
          userId,
          durationMs: Date.now() - startTime,
          text,
          textLength: text.length,
          error: String(error),
        },
        "Transform failed",
      );
      throw error;
    } finally {
      clearTimers();
      const trimmed = polished.trim();
      if (trimmed) {
        const timestamp = new Date().toISOString();
        void historyRepository
          .add(userId, {
            id: randomUUID(),
            input: text,
            output: trimmed,
            duration: Date.now() - startTime,
            timestamp,
          })
          .catch(() => {});
        void recentHistoryRepository.add(userId, { output: trimmed, timestamp }).catch(() => {});
      }
    }
  })();
}
