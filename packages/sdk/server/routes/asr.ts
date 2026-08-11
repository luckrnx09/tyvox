import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  ListASRModelsOutputSchema,
  SendTranscribeChunkOutputSchema,
  FinalizeTranscribeOutputSchema,
  ReadinessOutputSchema,
  ErrorResponseSchema,
} from "../../contracts/index.js";
import type { AppEnv, Services } from "../types.js";

const sessionIdParam = z.object({ sessionId: z.string().uuid() });

export function asrRoutes(services: Services): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: "get",
      path: "/readiness",
      operationId: "checkASRReadiness",
      tags: ["ASR"],
      summary: "Check ASR provider readiness",
      responses: {
        200: {
          content: { "application/json": { schema: ReadinessOutputSchema } },
          description: "ASR readiness",
        },
      },
    }),
    async (c) => {
      const user = c.get("user");
      return c.json(await services.asrService.checkReadiness(user.id), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/models",
      operationId: "listASRModels",
      tags: ["ASR"],
      summary: "List ASR providers and model statuses",
      responses: {
        200: {
          content: { "application/json": { schema: ListASRModelsOutputSchema } },
          description: "Provider groups",
        },
      },
    }),
    async (c) => {
      const user = c.get("user");
      const config = await services.userConfigService.get(user.id);
      return c.json(await services.asrService.listModels(config.speech), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/models/{id}/prepare",
      operationId: "prepareASRModel",
      tags: ["ASR"],
      summary: "Prepare an ASR model",
      request: { params: z.object({ id: z.string() }) },
      responses: {
        200: { description: "Preparation triggered" },
        404: {
          content: { "application/json": { schema: ErrorResponseSchema } },
          description: "Model not found",
        },
      },
    }),
    async (c) => {
      const user = c.get("user");
      const config = await services.userConfigService.get(user.id);
      services.asrService.prepareModel(c.req.valid("param").id, config.speech);
      return c.body(null, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/transcribe/{sessionId}/chunk",
      operationId: "sendTranscribeChunk",
      tags: ["ASR"],
      summary: "Upload audio chunk during recording",
      request: {
        params: sessionIdParam,
        body: {
          content: {
            "audio/pcm": {
              schema: z.instanceof(Blob).openapi({ type: "string", format: "binary" }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          content: { "application/json": { schema: SendTranscribeChunkOutputSchema } },
          description: "Chunk received",
        },
      },
    }),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const user = c.get("user");
      const body = await c.req.arrayBuffer();
      const result = await services.transcribeService.sendChunk(
        user.id,
        sessionId,
        Buffer.from(body),
      );
      return c.json(result, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/transcribe/{sessionId}/finalize",
      operationId: "finalizeTranscribe",
      tags: ["ASR"],
      summary: "Finalize recording and run ASR",
      request: { params: sessionIdParam },
      responses: {
        200: {
          content: { "application/json": { schema: FinalizeTranscribeOutputSchema } },
          description: "Transcription result",
        },
        404: {
          content: { "application/json": { schema: ErrorResponseSchema } },
          description: "Session not found",
        },
      },
    }),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const user = c.get("user");
      const result = await services.transcribeService.finalize(user.id, sessionId);
      return c.json(result, 200);
    },
  );

  return app;
}
