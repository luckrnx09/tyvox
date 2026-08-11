import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  TransformTextInputSchema,
  TransformTextStreamEventSchema,
  ErrorResponseSchema,
} from "../../contracts/index.js";
import type { AppEnv, Services } from "../types.js";

function streamLLMResponse(context: Context, generator: AsyncGenerator<string>, errorCode: string) {
  return streamSSE(context, async (stream) => {
    await stream.writeSSE({ event: "thinking", data: "{}" });

    try {
      let fullText = "";
      for await (const chunk of generator) {
        fullText += chunk;
        await stream.writeSSE({
          event: "chunk",
          data: JSON.stringify({ text: chunk }),
        });
      }
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ text: fullText }),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ code: errorCode, message }),
      });
    }
  });
}

export function transformRoutes(services: Services): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: "post",
      path: "/",
      operationId: "transformText",
      tags: ["Transform"],
      summary: "Transform text: polish, translate, or enrich (SSE streaming)",
      request: {
        body: {
          content: { "application/json": { schema: TransformTextInputSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          description: "SSE stream of transform events",
          content: { "text/event-stream": { schema: TransformTextStreamEventSchema } },
        },
        400: {
          content: { "application/json": { schema: ErrorResponseSchema } },
          description: "Invalid input",
        },
      },
    }),
    async (c) => {
      const { text, enrichOptions, timeoutScale } = c.req.valid("json");
      const user = c.get("user");
      const generator = await services.transformService.run(
        user.id,
        text,
        enrichOptions,
        timeoutScale ?? 1,
      );
      return streamLLMResponse(c, generator, "TRANSFORM_FAILED");
    },
  );

  return app;
}
