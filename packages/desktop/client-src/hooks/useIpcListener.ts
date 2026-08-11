import { useEffect } from "react";

export function useIpcListener(channel: string, callback: (...args: unknown[]) => void): void {
  useEffect(() => {
    const unsubscribe = window.electron.on(channel, (...args: unknown[]) => {
      callback(...args);
    });
    return unsubscribe;
  }, [channel, callback]);
}
