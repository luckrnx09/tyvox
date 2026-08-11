import { test, expect } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { APP_DATA_DIR } from "./paths.js";

test("APP_DATA_DIR points to ~/.tyvox", () => {
  expect(APP_DATA_DIR).toBe(join(homedir(), ".tyvox"));
});
