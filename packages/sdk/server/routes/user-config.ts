import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  GetUserConfigOutputSchema,
  UpdateUserConfigInputSchema,
  UpdateUserConfigOutputSchema,
} from "../../contracts/index.js";
import type { AppEnv, Services } from "../types.js";

export function userConfigRoutes(services: Services): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: "get",
      path: "/",
      operationId: "getUserConfig",
      tags: ["User Config"],
      summary: "Get user config",
      responses: {
        200: {
          content: { "application/json": { schema: GetUserConfigOutputSchema } },
          description: "User config",
        },
      },
    }),
    async (c) => {
      return c.json(await services.userConfigService.get(c.get("user").id), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "put",
      path: "/",
      operationId: "updateUserConfig",
      tags: ["User Config"],
      summary: "Update user config (partial merge)",
      request: {
        body: {
          content: { "application/json": { schema: UpdateUserConfigInputSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { "application/json": { schema: UpdateUserConfigOutputSchema } },
          description: "Merged config",
        },
      },
    }),
    async (c) => {
      const partial = c.req.valid("json");
      return c.json(await services.userConfigService.update(c.get("user").id, partial), 200);
    },
  );

  return app;
}
