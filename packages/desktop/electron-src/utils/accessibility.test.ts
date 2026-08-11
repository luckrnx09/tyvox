// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isTrustedAccessibilityClient: vi.fn(() => true),
  exec: vi.fn(),
  isMac: vi.fn(() => true),
  warn: vi.fn(),
}));

vi.mock("electron", () => ({
  systemPreferences: {
    isTrustedAccessibilityClient: mocks.isTrustedAccessibilityClient,
  },
}));

vi.mock("child_process", () => ({
  exec: mocks.exec,
}));

vi.mock("./platform", () => ({
  isMac: mocks.isMac,
}));

vi.mock("./logger", () => ({
  logger: {
    warn: mocks.warn,
  },
}));

type ExecCallback = (err: NodeJS.ErrnoException | null) => void;

const execOkImpl = ((_cmd: string, _opts: unknown, cb: ExecCallback) => {
  cb(null);
  return undefined as never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

const execFailImpl = ((_cmd: string, _opts: unknown, cb: ExecCallback) => {
  cb(new Error("tccutil failed") as NodeJS.ErrnoException);
  return undefined as never;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

describe("ensureFreshAccessibilityGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.isMac.mockReturnValue(true);
    mocks.exec.mockImplementation(execOkImpl);
    mocks.isTrustedAccessibilityClient.mockReturnValue(true);
  });

  it("returns true without touching TCC when already trusted", async () => {
    const { ensureFreshAccessibilityGrant } = await import("./accessibility");
    const granted = await ensureFreshAccessibilityGrant();
    expect(granted).toBe(true);
    expect(mocks.exec).not.toHaveBeenCalled();
  });

  it("returns true immediately on non-mac platforms", async () => {
    mocks.isMac.mockReturnValue(false);
    const { ensureFreshAccessibilityGrant } = await import("./accessibility");
    const granted = await ensureFreshAccessibilityGrant();
    expect(granted).toBe(true);
    expect(mocks.isTrustedAccessibilityClient).not.toHaveBeenCalled();
    expect(mocks.exec).not.toHaveBeenCalled();
  });

  it("resets the stale TCC entry for the app bundle id when untrusted", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    const { ensureFreshAccessibilityGrant } = await import("./accessibility");
    await ensureFreshAccessibilityGrant();
    expect(mocks.exec).toHaveBeenCalledWith(
      "tccutil reset Accessibility com.tyvox.dictation",
      expect.objectContaining({ timeout: expect.any(Number) }),
      expect.any(Function),
    );
  });

  it("re-prompts via the system dialog after resetting", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    const { ensureFreshAccessibilityGrant } = await import("./accessibility");
    await ensureFreshAccessibilityGrant();
    expect(mocks.isTrustedAccessibilityClient).toHaveBeenCalledWith(true);
  });

  it("resets at most once per launch while still untrusted", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    const { ensureFreshAccessibilityGrant } = await import("./accessibility");
    await ensureFreshAccessibilityGrant();
    await ensureFreshAccessibilityGrant();
    expect(mocks.exec.mock.calls.length).toBe(1);
  });

  it("resolves and warns when tccutil fails", async () => {
    mocks.exec.mockImplementation(execFailImpl);
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    const { ensureFreshAccessibilityGrant } = await import("./accessibility");
    const granted = await ensureFreshAccessibilityGrant();
    expect(granted).toBe(false);
    expect(mocks.warn).toHaveBeenCalled();
  });

  it("reports granted when the re-check after reset passes", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValueOnce(false).mockReturnValue(true);
    const { ensureFreshAccessibilityGrant } = await import("./accessibility");
    const granted = await ensureFreshAccessibilityGrant();
    expect(granted).toBe(true);
  });
});
