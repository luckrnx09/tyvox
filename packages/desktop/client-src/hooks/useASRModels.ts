import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listASRModels, prepareASRModel, type ASRProviderGroup } from "@tyvox/sdk/client";

const POLL_INTERVAL_ACTIVE_MS = 1000;
const POLL_INTERVAL_IDLE_MS = 5000;

export function useASRModels() {
  const [groups, setGroups] = useState<ASRProviderGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await listASRModels();
      setGroups(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isPreparing = useMemo(
    () => groups.some((group) => group.models.some((model) => model.status === "preparing")),
    [groups],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(
      load,
      isPreparing ? POLL_INTERVAL_ACTIVE_MS : POLL_INTERVAL_IDLE_MS,
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPreparing, load]);

  const prepare = useCallback(
    async (id: string) => {
      await prepareASRModel(id);
      await load();
    },
    [load],
  );

  return { groups, isLoading, prepare };
}
