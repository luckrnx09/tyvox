import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { platform } from "node:os";
import { rootCertificates } from "node:tls";

const SYSTEM_PEM = "-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----\n";

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

import { spawn, type ChildProcess } from "node:child_process";
import { Agent, setGlobalDispatcher } from "undici";
import { installSystemCaCertificates } from "./system-ca.js";

function spawnWithStdout(stdout: string): void {
  vi.mocked(spawn).mockImplementationOnce(() => {
    const proc = new EventEmitter() as ChildProcess;
    proc.stdout = new EventEmitter() as ChildProcess["stdout"];
    proc.kill = vi.fn();
    setImmediate(() => {
      proc.stdout?.emit("data", Buffer.from(stdout));
      proc.emit("close", 0);
    });
    return proc;
  });
}

describe("installSystemCaCertificates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("does nothing on platforms without a store command", async () => {
    vi.mocked(platform).mockReturnValue("linux");

    await installSystemCaCertificates();

    expect(spawn).not.toHaveBeenCalled();
    expect(setGlobalDispatcher).not.toHaveBeenCalled();
  });

  it("merges system certificates with the bundled CA store", async () => {
    vi.mocked(platform).mockReturnValue("win32");
    spawnWithStdout(SYSTEM_PEM);

    await installSystemCaCertificates();

    const options = vi.mocked(Agent).mock.calls[0]?.[0] as
      | { connect?: { ca?: unknown } }
      | undefined;
    expect(options?.connect?.ca).toEqual([...rootCertificates, SYSTEM_PEM]);
    expect(setGlobalDispatcher).toHaveBeenCalled();
  });

  it("keeps the default store when the system store is empty", async () => {
    vi.mocked(platform).mockReturnValue("win32");
    spawnWithStdout("");

    await installSystemCaCertificates();

    expect(setGlobalDispatcher).not.toHaveBeenCalled();
  });
});
