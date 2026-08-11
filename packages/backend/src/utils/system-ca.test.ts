import { describe, it, expect, vi } from "vitest";
import { platform } from "node:os";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => {
    throw new Error("spawn should not be called on this platform");
  }),
}));

vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:os")>()),
  platform: vi.fn(() => "linux"),
}));

vi.mock("undici", () => ({
  Agent: vi.fn(),
  setGlobalDispatcher: vi.fn(),
}));

import { spawn } from "node:child_process";
import { setGlobalDispatcher } from "undici";
import { installSystemCaCertificates } from "./system-ca.js";

describe("installSystemCaCertificates", () => {
  it("does nothing on platforms without a store command", async () => {
    vi.mocked(platform).mockReturnValue("linux");

    await installSystemCaCertificates();

    expect(spawn).not.toHaveBeenCalled();
    expect(setGlobalDispatcher).not.toHaveBeenCalled();
  });
});
