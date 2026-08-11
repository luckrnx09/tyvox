import { OpenAPIHono } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { asrRoutes } from "./routes/asr.js";
import { transformRoutes } from "./routes/transform.js";
import { vocabularyRoutes } from "./routes/vocabulary.js";
import { userConfigRoutes } from "./routes/user-config.js";
import { logsRoutes } from "./routes/logs.js";
import { llmRoutes } from "./routes/llm.js";
import type { AppEnv, Services } from "./types.js";

export interface RouterOptions {
  middlewares: MiddlewareHandler<AppEnv>[];
}

export function createApiRouter(
  services: Services,
  options: RouterOptions,
): (app: OpenAPIHono<AppEnv>) => void {
  return (app) => {
    const apiRoutes = new OpenAPIHono<AppEnv>();

    for (const middleware of options.middlewares) {
      apiRoutes.use("*", middleware);
    }

    apiRoutes.route("/asr", asrRoutes(services));
    apiRoutes.route("/transform", transformRoutes(services));
    apiRoutes.route("/vocabulary", vocabularyRoutes(services));
    apiRoutes.route("/user_config", userConfigRoutes(services));
    apiRoutes.route("/logs", logsRoutes(services));
    apiRoutes.route("/llm", llmRoutes(services));

    app.route("/api", apiRoutes);
    app.doc("/api/openapi.json", {
      openapi: "3.1.0",
      info: { title: "Tyvox API", version: "0.0.1" },
    });
  };
}
