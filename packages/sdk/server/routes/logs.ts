import { z } from "zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ClientLogEntrySchema, ErrorResponseSchema } from "../../contracts/index.js";
import type { AppEnv, Services } from "../types.js";

const DEFAULT_SOURCE = "unknown";

const PostClientLogsInputSchema = z.object({
  entries: z.array(ClientLogEntrySchema).max(50),
});

const PostClientLogsOutputSchema = z.object({
  received: z.number().int(),
});

export function logsRoutes(services: Services): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: "post",
      path: "/",
      operationId: "postClientLogs",
      tags: ["Logs"],
      summary: "Upload client log entries",
      request: {
        body: {
          content: { "application/json": { schema: PostClientLogsInputSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Logs accepted",
          content: { "application/json": { schema: PostClientLogsOutputSchema } },
        },
        400: {
          description: "Invalid input",
          content: { "application/json": { schema: ErrorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const { entries } = c.req.valid("json");
      const source = c.req.header("x-source") ?? DEFAULT_SOURCE;
      await services.clientLogService.write(source, entries);
      return c.json({ received: entries.length }, 200);
    },
  );

  return app;
}
