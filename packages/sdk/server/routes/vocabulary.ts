import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import {
  GetVocabularyOutputSchema,
  RenameEntryInputSchema,
  ErrorResponseSchema,
} from "../../contracts/index.js";
import type { AppEnv, Services } from "../types.js";

const entryParam = z.object({ entry: z.string() });

export function vocabularyRoutes(services: Services): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>();

  app.openapi(
    createRoute({
      method: "get",
      path: "/",
      operationId: "getVocabulary",
      tags: ["Vocabulary"],
      summary: "Get user vocabulary",
      responses: {
        200: {
          content: { "application/json": { schema: GetVocabularyOutputSchema } },
          description: "Vocabulary data",
        },
      },
    }),
    async (c) => {
      const user = c.get("user");
      return c.json(await services.vocabularyService.get(user.id), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/",
      operationId: "clearVocabulary",
      tags: ["Vocabulary"],
      summary: "Clear all vocabulary",
      responses: { 200: { description: "Cleared" } },
    }),
    async (c) => {
      await services.vocabularyService.clear(c.get("user").id);
      return c.body(null, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/vocabulary/{entry}",
      operationId: "addEntry",
      tags: ["Vocabulary"],
      summary: "Add vocabulary entry",
      request: { params: entryParam },
      responses: { 200: { description: "Added" } },
    }),
    async (c) => {
      const { entry } = c.req.valid("param");
      await services.vocabularyService.add(c.get("user").id, entry);
      return c.body(null, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/vocabulary/{entry}/rename",
      operationId: "renameEntry",
      tags: ["Vocabulary"],
      summary: "Rename vocabulary entry",
      request: {
        params: entryParam,
        body: {
          content: { "application/json": { schema: RenameEntryInputSchema } },
          required: true,
        },
      },
      responses: {
        200: { description: "Renamed" },
        400: {
          content: { "application/json": { schema: ErrorResponseSchema } },
          description: "Invalid input",
        },
      },
    }),
    async (c) => {
      const { entry } = c.req.valid("param");
      const { newEntry } = c.req.valid("json");
      await services.vocabularyService.rename(c.get("user").id, entry, newEntry);
      return c.body(null, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/vocabulary/{entry}",
      operationId: "deleteEntry",
      tags: ["Vocabulary"],
      summary: "Delete vocabulary entry",
      request: { params: entryParam },
      responses: { 200: { description: "Deleted" } },
    }),
    async (c) => {
      const { entry } = c.req.valid("param");
      await services.vocabularyService.delete(c.get("user").id, entry);
      return c.body(null, 200);
    },
  );

  return app;
}
