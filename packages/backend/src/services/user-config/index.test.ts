import { describe, it, expect, vi } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "@tyvox/sdk/server";
import { createFileUserConfigRepository, DEFAULT_CONFIG } from "../../repositories/user-config.js";
import { getUserConfig, updateUserConfig } from "./index.js";
import * as repositories from "../../repositories/index.js";

vi.mock("../../repositories/index.js", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-service-"));
  return { userConfigRepository: createFileUserConfigRepository(root), testUsersRoot: root };
});

const { testUsersRoot } = repositories as unknown as { testUsersRoot: string };

describe("User Config Service", () => {
  it("returns defaults when file missing", async () => {
    const config = await getUserConfig("u-defaults");
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("updates and retrieves config", async () => {
    const updated = await updateUserConfig("u-update", {
      llm: { ...DEFAULT_CONFIG.llm, model: "test-model" },
    });
    expect(updated.llm.model).toBe("test-model");

    const loaded = await getUserConfig("u-update");
    expect(loaded.llm.model).toBe("test-model");
  });

  it("merges partial config", async () => {
    await updateUserConfig("u-merge", {
      llm: { ...DEFAULT_CONFIG.llm, model: "first" },
    });
    const merged = await updateUserConfig("u-merge", {
      desktop: {
        ...DEFAULT_CONFIG.desktop,
        actions: {
          ...DEFAULT_CONFIG.desktop.actions,
          translate: {
            ...DEFAULT_CONFIG.desktop.actions.translate,
            payload: { target: "中文" },
          },
        },
      },
    });
    expect(merged.llm.model).toBe("first");
    expect(merged.desktop.actions.translate.payload.target).toBe("中文");
    expect(merged.speech).toEqual(DEFAULT_CONFIG.speech);
  });

  it("replaces arrays instead of merging them", async () => {
    await updateUserConfig("u-array", {
      speech: { ...DEFAULT_CONFIG.speech, languages: ["English", "中文"] },
    });
    const merged = await updateUserConfig("u-array", {
      speech: { ...DEFAULT_CONFIG.speech, languages: ["English"] },
    });
    expect(merged.speech.languages).toEqual(["English"]);
  });

  it("rejects invalid stored config", async () => {
    const userDir = join(testUsersRoot, "u-invalid");
    await mkdir(userDir, { recursive: true });
    await writeFile(join(userDir, "config.json"), JSON.stringify({ version: "nope" }));
    await expect(getUserConfig("u-invalid")).rejects.toThrow(AppError);
  });
});
