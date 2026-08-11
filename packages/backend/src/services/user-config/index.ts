import { z } from "zod";
import { AppError } from "@tyvox/sdk/server";
import type { UserConfig, UserConfigPartial } from "@tyvox/sdk/contracts";
import { userConfigRepository } from "../../repositories/index.js";
import { createKeyedLocks } from "../../utils/locks.js";

const updateLocks = createKeyedLocks();

export async function getUserConfig(userId: string): Promise<UserConfig> {
  try {
    return await userConfigRepository.read(userId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError("CONFIG_VALIDATION", `Invalid config: ${error.message}`, 400);
    }
    throw error;
  }
}

export async function updateUserConfig(
  userId: string,
  partial: UserConfigPartial,
): Promise<UserConfig> {
  return updateLocks(userId, async () => {
    const current = await getUserConfig(userId);
    const merged = deepMerge(current, partial);
    await userConfigRepository.write(userId, merged);
    return merged;
  });
}

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value !== undefined) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof target[key] === "object"
      ) {
        result[key] = deepMerge(
          target[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}
