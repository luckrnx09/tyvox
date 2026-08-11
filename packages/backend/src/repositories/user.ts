import { readdir } from "node:fs/promises";
import type { UserRepository } from "./types.js";
import { isFileMissing } from "./fs.js";

export function createFileUserRepository(usersRoot: string): UserRepository {
  return {
    async list() {
      try {
        const entries = await readdir(usersRoot, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
      } catch (error) {
        if (isFileMissing(error)) return [];
        throw error;
      }
    },
  };
}
