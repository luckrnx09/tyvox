import { describe, it, expect, vi } from "vitest";
import { clientLogService } from "./index.js";
import { getLogger } from "../../utils/logger.js";

vi.mock("../../utils/logger.js", () => ({
  getLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

describe("clientLogService", () => {
  it("writes each entry at the requested level with report kind", async () => {
    const info = vi.fn();
    const warn = vi.fn();
    const error = vi.fn();
    const debug = vi.fn();
    const logger = { info, warn, error, debug } as unknown as ReturnType<typeof getLogger>;
    vi.mocked(getLogger).mockReturnValue(logger);

    await clientLogService.write("desktop", [
      { level: "info", message: "hello", sessionId: "s1" },
      { level: "warn", message: "watch out" },
      { level: "error", message: "boom", stack: "at foo" },
    ]);

    expect(getLogger).toHaveBeenCalledWith("desktop");
    expect(info).toHaveBeenCalledWith(
      { kind: "report", sessionId: "s1", stack: undefined, context: undefined },
      "hello",
    );
    expect(warn).toHaveBeenCalledWith(
      { kind: "report", sessionId: undefined, stack: undefined, context: undefined },
      "watch out",
    );
    expect(error).toHaveBeenCalledWith(
      { kind: "report", sessionId: undefined, stack: "at foo", context: undefined },
      "boom",
    );
  });
});
