import { SSEResponse } from "@tyvox/sdk/client";
import type { LLMConfig } from "@tyvox/sdk/contracts";
import { ProviderInitError } from "../errors.js";
import { TransformError } from "./errors.js";
import { LLM_TEMPERATURE } from "./constants.js";
import { resolveStrategy } from "./providers/registry.js";
import { getLogger } from "../../utils/logger.js";

const ERROR_BODY_LOG_CHARS = 500;
const RETRYABLE_INVALID_REQUEST_STATUS = new Set([400, 422]);
const logger = getLogger("system");

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface ChatCompletionRequest {
  readonly config: LLMConfig;
  readonly messages: ChatMessage[];
  readonly thinkingEnabled: boolean | undefined;
  readonly maxTokens?: number;
  readonly onData?: () => void;
  readonly abortSignal?: AbortSignal;
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: { content?: string | null; reasoning_content?: string | null };
    finish_reason?: string | null;
  }>;
}

function normalizeBaseUrl(config: LLMConfig): string {
  const trimmed = config.baseUrl.replace(/\/+$/, "");
  if (!trimmed) {
    throw new ProviderInitError("baseUrl is required", config.provider);
  }
  try {
    new URL(trimmed);
  } catch {
    throw new ProviderInitError(`Invalid baseUrl: ${trimmed}`, config.provider);
  }
  return trimmed;
}

function parseExtraBody(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    logger.warn("Ignoring invalid extraBody JSON");
    return {};
  }
}

async function postChatCompletion(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: abortSignal ?? null,
  });
}

async function throwForErrorResponse(response: Response, provider: string): Promise<never> {
  const text = await response.text().catch(() => "");
  throw new TransformError(
    `LLM request failed (HTTP ${response.status}): ${text.slice(0, ERROR_BODY_LOG_CHARS)}`,
    provider,
  );
}

export async function* streamChatCompletion(
  request: ChatCompletionRequest,
): AsyncGenerator<string> {
  const { config } = request;
  try {
    const baseUrl = normalizeBaseUrl(config);
    const strategy = resolveStrategy(config.provider, baseUrl);

    const body: Record<string, unknown> = {
      model: config.model,
      messages: request.messages.map((m) => ({ content: m.content, role: m.role })),
      temperature: LLM_TEMPERATURE,
      stream: true,
    };
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    const thinkingFields =
      request.thinkingEnabled !== undefined
        ? strategy.thinkingBody({
            model: config.model,
            enabled: request.thinkingEnabled,
          })
        : null;
    const injectedKeys: string[] = [];
    if (thinkingFields) {
      for (const [key, value] of Object.entries(thinkingFields)) {
        body[key] = value;
        injectedKeys.push(key);
      }
    }
    if (config.provider === "custom") {
      Object.assign(body, parseExtraBody(config.extraBody));
    }
    strategy.customizeBody(body, config.model);

    const url = `${baseUrl}/chat/completions`;
    let response = await postChatCompletion(url, config.apiKey, body, request.abortSignal);

    if (RETRYABLE_INVALID_REQUEST_STATUS.has(response.status) && injectedKeys.length > 0) {
      logger.info(
        { provider: config.provider, status: response.status, stripped: injectedKeys },
        "LLM rejected thinking fields, retrying without them",
      );
      for (const key of injectedKeys) delete body[key];
      response = await postChatCompletion(url, config.apiKey, body, request.abortSignal);
    }
    if (!response.ok) {
      await throwForErrorResponse(response, config.provider);
    }

    let content = "";
    let reasoning = "";
    let finishReason: string | null = null;

    for await (const event of new SSEResponse<{ event: string; data: ChatCompletionChunk }>(
      response,
    )) {
      const choice = event.data?.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;
      if (delta?.content) {
        request.onData?.();
        content += delta.content;
        yield delta.content;
      }
      if (delta?.reasoning_content) {
        request.onData?.();
        reasoning += delta.reasoning_content;
      }
      if (choice.finish_reason) finishReason = choice.finish_reason;
    }

    logger.info({ finishReason }, "LLM stream finished");
    if (finishReason === "length" && !content) {
      throw new TransformError(
        "LLM output was truncated before producing any text; reasoning may have consumed the budget.",
        config.provider,
      );
    }

    if (!content && reasoning) {
      logger.warn(
        { provider: config.provider, reasoningChars: reasoning.length },
        "LLM content empty, using reasoning_content as output",
      );
      yield reasoning;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new TransformError("LLM request timed out", config.provider);
    }
    throw error;
  }
}
