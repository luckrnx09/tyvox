import { IPC } from "../../shared/channels";
import { useCallback, useEffect, useState } from "react";
import {
  getUserConfig,
  updateUserConfig,
  type UserConfig,
  type UserConfigPartial,
} from "@tyvox/sdk/client";
import { logger } from "../utils/logger";
import { useIpcListener } from "./useIpcListener";

interface UseSettingsResult {
  config: UserConfig | null;
  isLoaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<UserConfig>) => Promise<void>;
  reset: () => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getUserConfig();
      const userConfig = data as UserConfig;
      setConfig(userConfig);
      window.electron.invoke(IPC.CONFIG_SYNC, userConfig.desktop);
    } catch (error) {
      logger.error("Failed to load config", {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const { data } = await getUserConfig();
      setConfig(data as UserConfig);
    } catch (error) {
      logger.error("Failed to reload config", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useIpcListener(IPC.CONFIG_CHANGED, reload);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (partial: Partial<UserConfig>) => {
      const previousConfig = config;
      setConfig((prev) => (prev ? { ...prev, ...partial } : null));
      try {
        await updateUserConfig(partial as UserConfigPartial);
        await load();
      } catch (error) {
        setConfig(previousConfig);
        throw error;
      }
    },
    [config, load],
  );

  const reset = useCallback(async () => {
    await updateUserConfig({} as UserConfigPartial);
    await load();
  }, [load]);

  return { config, isLoaded, load, update, reset };
}
