#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs";

const clientPath = new URL("../client/client.ts", import.meta.url).pathname;
const source = readFileSync(clientPath, "utf-8");

const STATUS_CODE_NAMES: Record<string, string> = {
  "200": "Success",
  "201": "Created",
  "202": "Accepted",
  "204": "NoContent",
  "400": "BadRequest",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "NotFound",
  "422": "Unprocessable",
  "500": "ServerError",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUS_PREFIX = /(Response|Error)(\d{3})/g;
const DECL_PATTERN = /\bexport type\s+(\w+)/g;

function collectDeclaredNames(text: string): Set<string> {
  const names = new Set<string>();
  for (const [, name] of text.matchAll(DECL_PATTERN)) {
    names.add(name);
  }
  return names;
}

function pascalMap(names: Set<string>): Map<string, string> {
  const renameMap = new Map<string, string>();
  for (const name of names) {
    if (name.charAt(0) === name.charAt(0).toLowerCase()) {
      const pascal = capitalize(name);
      if (!names.has(pascal)) renameMap.set(name, pascal);
    }
  }
  return renameMap;
}

function statusMap(names: Set<string>): Map<string, string> {
  const renameMap = new Map<string, string>();
  for (const name of names) {
    const cleaned = name.replace(
      STATUS_PREFIX,
      (_, prefix, code) =>
        `${prefix}${code === "200" && prefix === "Response" ? "Ok" : (STATUS_CODE_NAMES[code] ?? code)}`,
    );
    if (cleaned !== name && !names.has(cleaned)) {
      renameMap.set(name, cleaned);
    }
  }
  return renameMap;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyRenames(text: string, renames: Map<string, string>): string {
  let result = text;
  for (const [oldName, newName] of renames) {
    result = result.replaceAll(new RegExp(`\\b${escapeRegex(oldName)}\\b`, "g"), newName);
  }
  return result;
}

let result = applyRenames(source, pascalMap(collectDeclaredNames(source)));
result = applyRenames(result, statusMap(collectDeclaredNames(result)));

result = result.replaceAll("Promise<TransformTextResponse>", "Promise<Response>");
result = result.replaceAll("customFetch<TransformTextResponse>(", "customFetch<Response>(");

const wrapperRegex =
  /export type TransformTextResponseOk = \{[\s\S]*?export type TransformTextResponse = \(TransformTextResponseSuccess \| TransformTextResponseError\)\n*/;
const cleaned = result.replace(wrapperRegex, "");
if (cleaned === result) {
  console.error("[fix-codegen-types] Failed to remove unused TransformTextResponse wrapper types");
  process.exit(1);
}
result = cleaned;

writeFileSync(clientPath, result);

console.log("[fix-codegen-types] Done");
