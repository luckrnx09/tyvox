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

describe("checkAccessibilityGranted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.isMac.mockReturnValue(true);
  });

  it("returns true on non-mac without touching systemPreferences", async () => {
    mocks.isMac.mockReturnValue(false);
    const { checkAccessibilityGranted } = await import("./accessibility");
    expect(checkAccessibilityGranted()).toBe(true);
    expect(mocks.isTrustedAccessibilityClient).not.toHaveBeenCalled();
  });

  it("queries without prompting and never runs tccutil", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    const { checkAccessibilityGranted } = await import("./accessibility");
    expect(checkAccessibilityGranted()).toBe(false);
    expect(mocks.isTrustedAccessibilityClient).toHaveBeenCalledWith(false);
    expect(mocks.isTrustedAccessibilityClient).toHaveBeenCalledTimes(1);
    expect(mocks.exec).not.toHaveBeenCalled();
  });
});

describe("requestAccessibilityGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.isMac.mockReturnValue(true);
    mocks.exec.mockImplementation(execOkImpl);
  });

  it("returns true immediately when already granted", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(true);
    const { requestAccessibilityGrant } = await import("./accessibility");
    expect(await requestAccessibilityGrant()).toBe(true);
    expect(mocks.isTrustedAccessibilityClient).not.toHaveBeenCalledWith(true);
    expect(mocks.exec).not.toHaveBeenCalled();
  });

  it("resets tcc once then prompts when not granted", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    const { requestAccessibilityGrant } = await import("./accessibility");
    await requestAccessibilityGrant();
    expect(mocks.exec).toHaveBeenCalledTimes(1);
    expect(mocks.isTrustedAccessibilityClient).toHaveBeenCalledWith(true);
  });

  it("resets tcc only once across calls", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    const { requestAccessibilityGrant } = await import("./accessibility");
    await requestAccessibilityGrant();
    await requestAccessibilityGrant();
    expect(mocks.exec).toHaveBeenCalledTimes(1);
  });

  it("still prompts when tccutil reset fails", async () => {
    mocks.isTrustedAccessibilityClient.mockReturnValue(false);
    mocks.exec.mockImplementation(execFailImpl);
    const { requestAccessibilityGrant } = await import("./accessibility");
    await requestAccessibilityGrant();
    expect(mocks.warn).toHaveBeenCalled();
    expect(mocks.isTrustedAccessibilityClient).toHaveBeenCalledWith(true);
  });
});
