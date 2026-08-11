import { test, expect, vi, beforeEach } from "vitest";
import { startMemoryScheduler } from "./scheduler.js";
import { processUserMemory } from "./index.js";
import { userRepository } from "../../repositories/index.js";

vi.mock("../../repositories/index.js", () => ({
  userRepository: { list: vi.fn().mockResolvedValue(["alice", "bob"]) },
}));

vi.mock("./index.js", () => ({
  processUserMemory: vi.fn(),
}));

vi.mock("../../utils/logger.js", () => ({
  getLogger: vi.fn().mockReturnValue({ error: vi.fn() }),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(userRepository.list).mockResolvedValue(["alice", "bob"]);
});

test("processes every user and isolates per-user failures", async () => {
  vi.mocked(processUserMemory).mockImplementation(async (userId: string) => {
    if (userId === "bob") throw new Error("llm down");
  });

  const stop = startMemoryScheduler();
  const deadline = Date.now() + 2000;
  while (vi.mocked(processUserMemory).mock.calls.length < 2) {
    if (Date.now() > deadline) throw new Error("timed out waiting for scheduler run");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  stop();

  const processed = vi
    .mocked(processUserMemory)
    .mock.calls.map((call) => call[0])
    .sort();
  expect(processed).toEqual(["alice", "bob"]);
});

test("limits per-user concurrency", async () => {
  const userIds = Array.from({ length: 12 }, (_, i) => `user-${i}`);
  vi.mocked(userRepository.list).mockResolvedValue(userIds);

  let active = 0;
  let maxActive = 0;
  const gates: Array<() => void> = [];
  vi.mocked(processUserMemory).mockImplementation(async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve) => gates.push(resolve));
    active--;
  });

  const stop = startMemoryScheduler();
  const deadline = Date.now() + 2000;
  while (vi.mocked(processUserMemory).mock.calls.length < userIds.length) {
    if (Date.now() > deadline) throw new Error("timed out waiting for scheduler run");
    if (gates.length > 0) {
      for (const resolve of gates.splice(0)) resolve();
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  for (const resolve of gates.splice(0)) resolve();
  stop();

  expect(maxActive).toBeLessThanOrEqual(5);
  expect(maxActive).toBeGreaterThan(1);
});
