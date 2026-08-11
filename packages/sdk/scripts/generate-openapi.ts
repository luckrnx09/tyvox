import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dump } from "js-yaml";
import { HealthCheckOutputSchema } from "../contracts/index.js";
import { createApiRouter, type AppEnv } from "../server/index.js";
import { mockServices } from "./mock-services.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const registerApiRoutes = createApiRouter(mockServices, { middlewares: [] });
const app = new OpenAPIHono<AppEnv>();

registerApiRoutes(app);

app.openapi(
  createRoute({
    method: "get",
    path: "/health",
    operationId: "healthCheck",
    tags: ["Health"],
    summary: "Health check",
    responses: {
      200: {
        content: { "application/json": { schema: HealthCheckOutputSchema } },
        description: "Health status",
      },
    },
  }),
  (c) => c.json({ status: "ok", version: "0.0.1" }, 200),
);

const spec = app.getOpenAPI31Document({
  openapi: "3.1.0",
  info: { title: "Tyvox API", version: "0.0.1" },
});

const yamlPath = resolve(__dirname, "../openapi.yaml");
writeFileSync(yamlPath, dump(spec, { lineWidth: -1, quoteStyle: "double" }));
console.log(`OpenAPI spec written to ${yamlPath}`);
