import { describe, expect, it, vi } from "vitest";
import { configureDesktopSdk } from "./sdk";

vi.mock("@tyvox/sdk/client", () => ({
  setup: vi.fn(),
}));

import { setup } from "@tyvox/sdk/client";

describe("sdk", () => {
  it("configures SDK with base URL, default user, and desktop source", () => {
    configureDesktopSdk("http://127.0.0.1:23456");
    expect(setup).toHaveBeenCalledWith(
      { baseUrl: "http://127.0.0.1:23456", userId: "default" },
      { source: "desktop" },
    );
  });
});
