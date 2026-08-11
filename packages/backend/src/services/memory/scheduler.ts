import { setInterval } from "node:timers";
import { userRepository } from "../../repositories/index.js";
import { getLogger } from "../../utils/logger.js";
import { processUserMemory } from "./index.js";

const schedulerLogger = getLogger("memory-scheduler");

const INTERVAL_MS = 5 * 60 * 1000;
const USER_CONCURRENCY = 5;

export function startMemoryScheduler(): () => void {
  let isRunning = false;

  async function runOnce() {
    if (isRunning) return;
    isRunning = true;
    try {
      const userIds = await userRepository.list();
      await mapWithConcurrency(userIds, USER_CONCURRENCY, async (userId) => {
        try {
          await processUserMemory(userId);
        } catch (error) {
          schedulerLogger.error({ error, userId }, "Memory processing failed for user");
        }
      });
    } catch (error) {
      schedulerLogger.error(error, "Memory scheduler run failed");
    } finally {
      isRunning = false;
    }
  }

  void runOnce();
  const interval = setInterval(runOnce, INTERVAL_MS);

  return () => {
    clearInterval(interval);
  };
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const item of items) {
    const promise = task(item).finally(() => executing.delete(promise));
    executing.add(promise);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}
