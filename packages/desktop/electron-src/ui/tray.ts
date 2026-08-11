import { Menu, Tray, nativeImage } from "electron";
import { readFileSync } from "node:fs";
import { logger } from "../utils/logger";
import { getResourcePath } from "../utils/paths";
import type { AudioDevice } from "../../shared/types/ipc";

interface TrayOptions {
  onOpenSettings: () => void;
  onQuit: () => void;
  microphone?: {
    devices: AudioDevice[];
    selectedDeviceId: string;
    onSelect: (deviceId: string) => void;
  };
}

interface TrayLabels {
  settings: string;
  microphone: string;
  defaultDevice: (name: string) => string;
  quit: string;
}

const TRAY_LABELS: Record<string, TrayLabels> = {
  en: {
    settings: "Settings",
    microphone: "Microphone",
    defaultDevice: (name) => `${name} (Default)`,
    quit: "Quit",
  },
  zh: {
    settings: "设置",
    microphone: "麦克风",
    defaultDevice: (name) => `${name}(默认)`,
    quit: "退出",
  },
};

function getTrayLabels(locale: string): TrayLabels {
  const labels = TRAY_LABELS[locale];
  if (labels) return labels;
  return TRAY_LABELS.en as TrayLabels;
}

export class TrayService {
  #tray: Tray | null = null;
  #options: TrayOptions | null = null;
  #locale = "en";

  create(options: TrayOptions): Tray | null {
    // Explicit 1x/2x square representations. Panels that stretch icons to
    // their own height otherwise distort a force-resized 16px image.
    const icon = nativeImage.createFromPath(getResourcePath("tray", "logo.png"));
    icon.addRepresentation({
      scaleFactor: 2,
      width: 16,
      height: 16,
      buffer: readFileSync(getResourcePath("tray", "logo@2x.png")),
    });
    try {
      this.#tray = new Tray(icon);
    } catch (err) {
      logger.warn("System tray unavailable", { error: String(err) });
      return null;
    }

    this.#options = options;
    this.#rebuildMenu();

    this.#tray.setToolTip("Tyvox");

    logger.info("Tray created");
    return this.#tray;
  }

  setLocale(locale: string): void {
    const normalized = locale || "en";
    if (this.#locale === normalized) return;
    this.#locale = normalized;
    this.#rebuildMenu();
  }

  setMicrophoneSelection(deviceId: string): void {
    if (!this.#options || !this.#tray || this.#tray.isDestroyed()) return;
    const microphone = this.#options.microphone;
    if (!microphone || microphone.selectedDeviceId === deviceId) return;
    this.#options = { ...this.#options, microphone: { ...microphone, selectedDeviceId: deviceId } };
    this.#rebuildMenu();
  }

  setMicrophoneDevices(devices: AudioDevice[]): void {
    if (!this.#options || !this.#tray || this.#tray.isDestroyed()) return;
    const microphone = this.#options.microphone;
    if (!microphone) return;
    this.#options = { ...this.#options, microphone: { ...microphone, devices } };
    this.#rebuildMenu();
  }

  #rebuildMenu(): void {
    if (!this.#tray || !this.#options) return;

    const { onOpenSettings, onQuit, microphone } = this.#options;
    const labels = getTrayLabels(this.#locale);
    const template: Electron.MenuItemConstructorOptions[] = [
      { click: () => onOpenSettings(), label: labels.settings },
    ];

    if (microphone) {
      template.push({ type: "separator" });
      template.push({
        label: labels.microphone,
        submenu: microphone.devices.map((device) => ({
          label: device.isDefault ? labels.defaultDevice(device.name) : device.name,
          type: "checkbox" as const,
          checked: microphone.selectedDeviceId === device.id,
          click: () => microphone.onSelect(device.id),
        })),
      });
    }

    template.push({ type: "separator" });
    template.push({ click: () => onQuit(), label: labels.quit });

    this.#tray.setContextMenu(Menu.buildFromTemplate(template));
  }

  destroy(): void {
    if (this.#tray && !this.#tray.isDestroyed()) {
      this.#tray.destroy();
    }
    this.#tray = null;
    this.#options = null;
  }
}
