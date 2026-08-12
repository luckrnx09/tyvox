import { app, net, type BrowserWindow } from "electron";
import electronUpdater, { type AppUpdater } from "electron-updater";
import { IPC } from "../../shared/channels";
import type { UpdateStatus } from "../../shared/types/ipc";
import { logger } from "../utils/logger";
import { isMac } from "../utils/platform";
import { installMacUpdate } from "./mac-install";

const LATEST_RELEASE_URL = "https://github.com/luckrnx09/tyvox/releases/latest";
const RELEASE_DOWNLOAD_BASE = "https://github.com/luckrnx09/tyvox/releases/download";

const isNewerVersion = (latest: string, current: string): boolean => {
  const parse = (v: string) => v.replace(/^v/, "").split("-")[0]!.split(".").map(Number);
  const [a, b] = [parse(latest), parse(current)];
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
};

class UpdaterService {
  #autoUpdater: AppUpdater | null = null;
  #getSettingsWindow: (() => BrowserWindow | null) | null = null;
  #macDmgUrl: string | null = null;

  init(getSettingsWindow: () => BrowserWindow | null): void {
    this.#getSettingsWindow = getSettingsWindow;
    if (!app.isPackaged) {
      return;
    }
    if (!isMac()) {
      // ESM workaround from the electron-builder docs: destructure off the
      // default export instead of a named import.
      const { autoUpdater } = electronUpdater;
      this.#autoUpdater = autoUpdater;
      autoUpdater.on("update-available", (info) =>
        this.#emit({ state: "available", version: info.version }),
      );
      autoUpdater.on("update-not-available", () => this.#emit({ state: "not-available" }));
      autoUpdater.on("update-downloaded", (info) =>
        this.#emit({ state: "downloaded", version: info.version }),
      );
      autoUpdater.on("error", (err) => {
        logger.warn("Auto update error", { error: String(err) });
        this.#emit({ state: "error", message: String(err) });
      });
    }
    void this.check();
  }

  async check(): Promise<void> {
    if (!app.isPackaged) {
      this.#emit({ state: "error", message: "Updates are only available in packaged builds" });
      return;
    }
    this.#emit({ state: "checking" });
    if (this.#autoUpdater) {
      try {
        await this.#autoUpdater.checkForUpdates();
      } catch {
        // 'error' event already emitted by electron-updater
      }
      return;
    }
    await this.#checkMacManually();
  }

  quitAndInstall(): void {
    this.#autoUpdater?.quitAndInstall();
  }

  installUpdate(): void {
    if (!isMac() || !this.#macDmgUrl) return;
    installMacUpdate(this.#macDmgUrl);
  }

  // macOS builds skip electron-updater: a detached script swaps the app
  // bundle and relaunches (stable self-signed identity keeps TCC grants).
  async #checkMacManually(): Promise<void> {
    try {
      const res = await net.fetch(LATEST_RELEASE_URL, { redirect: "follow" });
      if (!res.ok) {
        throw new Error(`Release check failed: HTTP ${res.status}`);
      }
      const tag = res.url.split("/").pop() ?? "";
      const latest = tag.replace(/^v/, "");
      if (!latest || !isNewerVersion(latest, app.getVersion())) {
        this.#emit({ state: "not-available" });
        return;
      }
      const suffix = process.arch === "arm64" ? "-arm64" : "";
      this.#macDmgUrl = `${RELEASE_DOWNLOAD_BASE}/${tag}/Tyvox-${latest}${suffix}.dmg`;
      this.#emit({ state: "available", version: latest });
    } catch (err) {
      logger.warn("Manual update check failed", { error: String(err) });
      this.#emit({ state: "error", message: String(err) });
    }
  }

  #emit(status: UpdateStatus): void {
    const win = this.#getSettingsWindow?.();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.UPDATE_STATUS, status);
    }
  }
}

export const updaterService = new UpdaterService();
