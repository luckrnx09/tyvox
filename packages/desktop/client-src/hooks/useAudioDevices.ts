import { useEffect, useState } from "react";
import type { AudioDevice } from "../../shared/types/ipc";

export function useAudioDevices(): AudioDevice[] {
  const [devices, setDevices] = useState<AudioDevice[]>([]);

  useEffect(() => {
    const { mediaDevices } = navigator;
    if (!mediaDevices?.enumerateDevices) return;

    const refresh = async () => {
      const list = await mediaDevices.enumerateDevices();
      const inputs = list.filter((device) => device.kind === "audioinput");
      const defaultAlias = inputs.find((device) => device.deviceId === "default");
      const visible = defaultAlias
        ? inputs.filter(
            (device) => device === defaultAlias || device.groupId !== defaultAlias.groupId,
          )
        : inputs;
      let position = 0;
      setDevices(
        visible.map((device) => {
          position += 1;
          const isDefault = device.deviceId === "default";
          const label = isDefault ? device.label.replace(/^Default - /, "") : device.label;
          return {
            id: device.deviceId,
            isDefault,
            name: label || `Microphone ${position}`,
          };
        }),
      );
    };

    refresh().catch(() => {});
    mediaDevices.addEventListener?.("devicechange", refresh);
    return () => mediaDevices.removeEventListener?.("devicechange", refresh);
  }, []);

  return devices;
}
