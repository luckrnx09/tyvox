import { useCallback, useEffect, useState } from "react";
import { IPC } from "../../shared/channels";
import type { LocalSettings } from "../../shared/types/settings";

export function useLocalSettings() {
  const [settings, setSettings] = useState<LocalSettings | null>(null);

  const load = useCallback(async () => {
    const loaded = await window.electron.invoke<LocalSettings>(IPC.LOCAL_SETTINGS_LOAD);
    setSettings(loaded);
  }, []);

  const update = useCallback(
    async (patch: Partial<LocalSettings>) => {
      if (!settings) return;
      const next = { ...settings, ...patch };
      setSettings(next);
      await window.electron.invoke(IPC.LOCAL_SETTINGS_SAVE, next);
    },
    [settings],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { localSettings: settings, updateLocalSettings: update, isLoaded: settings !== null };
}
