import { test, expect } from "vitest";
import { withTimeout } from "./with-timeout.js";

test("resolves with the promise result when it settles in time", async () => {
  await expect(withTimeout(Promise.resolve("ok"), 1000, "Task")).resolves.toBe("ok");
});

test("rejects with a timeout error when the promise is too slow", async () => {
  const slow = new Promise((resolve) => setTimeout(resolve, 1000));
  await expect(withTimeout(slow, 10, "Task")).rejects.toThrow("Task timed out after 10ms");
});

test("propagates rejection from the wrapped promise", async () => {
  await expect(withTimeout(Promise.reject(new Error("boom")), 1000, "Task")).rejects.toThrow(
    "boom",
  );
});
