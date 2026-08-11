import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ListLLMProvidersOutputSchema, ReadinessOutputSchema } from "../../contracts/index.js";
import type { AppEnv, Services } from "../types.js";

export function llmRoutes(services: Services): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: "get",
      path: "/providers",
      operationId: "listLLMProviders",
      tags: ["LLM"],
      summary: "List supported LLM providers",
      responses: {
        200: {
          content: { "application/json": { schema: ListLLMProvidersOutputSchema } },
          description: "Supported providers",
        },
      },
    }),
    async (c) => {
      return c.json(await services.llmProviderService.listProviders(), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/readiness",
      operationId: "checkLLMReadiness",
      tags: ["LLM"],
      summary: "Check LLM provider readiness",
      responses: {
        200: {
          content: { "application/json": { schema: ReadinessOutputSchema } },
          description: "LLM readiness",
        },
      },
    }),
    async (c) => {
      const user = c.get("user");
      return c.json(await services.llmProviderService.checkReadiness(user.id), 200);
    },
  );

  return app;
}
