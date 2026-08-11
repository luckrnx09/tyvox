import { cors } from "hono/cors";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createApiRouter, onError, type Services, type AppEnv } from "@tyvox/sdk/server";
import { userMiddleware } from "./middleware/user.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { sendTranscribeChunk, finalizeTranscribe } from "./services/transcribe/index.js";
import {
  getVocabulary,
  clearVocabulary,
  addEntry,
  deleteEntry,
  renameEntry,
} from "./services/vocabulary/index.js";
import { getUserConfig, updateUserConfig } from "./services/user-config/index.js";
import { transformText } from "./services/transform/index.js";
import { listASRModels, prepareASRModel, checkASRReadiness } from "./services/asr/index.js";
import { checkLLMReadiness } from "./services/llm/index.js";
import { getLLMProviders } from "./services/llm/providers/registry.js";
import { clientLogService } from "./services/logs/index.js";

const services: Services = {
  transcribeService: {
    sendChunk: sendTranscribeChunk,
    finalize: finalizeTranscribe,
  },
  vocabularyService: {
    get: getVocabulary,
    clear: clearVocabulary,
    add: addEntry,
    delete: deleteEntry,
    rename: renameEntry,
  },
  userConfigService: {
    get: getUserConfig,
    update: updateUserConfig,
  },
  transformService: {
    run: transformText,
  },
  asrService: {
    listModels: listASRModels,
    prepareModel: prepareASRModel,
    checkReadiness: checkASRReadiness,
  },
  clientLogService,
  llmProviderService: {
    listProviders: async () => getLLMProviders(),
    checkReadiness: checkLLMReadiness,
  },
};

export function createApp() {
  const registerApiRoutes = createApiRouter(services, {
    middlewares: [
      cors({
        origin: "*",
        allowHeaders: ["Content-Type", "X-User-ID", "X-Source", "X-Session-Id"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      }),
      userMiddleware,
    ],
  });

  const app = new OpenAPIHono<AppEnv>();

  app.use("*", loggerMiddleware);
  app.onError(onError);
  app.use(
    "/health",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "X-User-ID", "X-Source", "X-Session-Id"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );
  app.get("/health", (c) => c.json({ status: "ok", version: "0.0.1" }, 200));

  registerApiRoutes(app);

  return app;
}
