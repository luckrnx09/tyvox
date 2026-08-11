import { test, expect } from "vitest";
import { createKeyedLocks } from "./locks.js";

test("serializes tasks on the same key", async () => {
  const withLock = createKeyedLocks();
  const order: string[] = [];

  await Promise.all([
    withLock("k", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("first");
    }),
    withLock("k", async () => {
      order.push("second");
    }),
  ]);

  expect(order).toEqual(["first", "second"]);
});

test("runs tasks on different keys concurrently", async () => {
  const withLock = createKeyedLocks();
  const started: string[] = [];

  await Promise.all([
    withLock("a", async () => {
      started.push("a");
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(started).toContain("b");
    }),
    withLock("b", async () => {
      started.push("b");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }),
  ]);
});

test("releases the lock when a task throws", async () => {
  const withLock = createKeyedLocks();
  await expect(
    withLock("k", async () => {
      throw new Error("boom");
    }),
  ).rejects.toThrow("boom");
  await expect(withLock("k", async () => "recovered")).resolves.toBe("recovered");
});
