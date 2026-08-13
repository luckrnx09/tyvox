import { app, net, type BrowserWindow } from "electron";
import electronUpdater, { type AppUpdater } from "electron-updater";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
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

function resolveLatestTag(): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: "HEAD", url: LATEST_RELEASE_URL });
    request.on("redirect", (_statusCode, _method, redirectUrl) => {
      request.abort();
      resolve(redirectUrl.split("/").pop() ?? "");
    });
    request.on("response", (response) => {
      reject(new Error(`Release check failed: HTTP ${response.statusCode}`));
    });
    request.on("error", reject);
    request.end();
  });
}

class UpdaterService {
  #autoUpdater: AppUpdater | null = null;
  #getSettingsWindow: (() => BrowserWindow | null) | null = null;
  #macDmgUrl: string | null = null;
  #macVersion: string | null = null;

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
    if (!isMac()) return;
    void this.#downloadAndInstallMac();
  }

  // macOS builds skip electron-updater: a detached script swaps the app
  // bundle and relaunches (stable self-signed identity keeps TCC grants).
  async #checkMacManually(): Promise<void> {
    try {
      const tag = await resolveLatestTag();
      const latest = tag.replace(/^v/, "");
      if (!latest || !isNewerVersion(latest, app.getVersion())) {
        this.#emit({ state: "not-available" });
        return;
      }
      const suffix = process.arch === "arm64" ? "-arm64" : "";
      this.#macDmgUrl = `${RELEASE_DOWNLOAD_BASE}/${tag}/Tyvox-${latest}${suffix}.dmg`;
      this.#macVersion = latest;
      this.#emit({ state: "available", version: latest });
    } catch (err) {
      logger.warn("Manual update check failed", { error: String(err) });
      this.#emit({ state: "error", message: String(err) });
    }
  }

  async #downloadAndInstallMac(): Promise<void> {
    const url = this.#macDmgUrl;
    const version = this.#macVersion;
    if (!url || !version) return;
    const target = join(app.getPath("temp"), `Tyvox-${version}.dmg`);
    try {
      const response = await net.fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }
      const total = Number(response.headers.get("content-length") ?? 0);
      const reader = response.body.getReader();
      const file = createWriteStream(target);
      let received = 0;
      let lastPercent = -1;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!file.write(value)) {
          await once(file, "drain");
        }
        received += value.byteLength;
        if (total > 0) {
          const percent = Math.min(99, Math.round((received / total) * 100));
          if (percent !== lastPercent) {
            lastPercent = percent;
            this.#emit({ state: "downloading", percent });
          }
        }
      }
      await new Promise<void>((resolve, reject) => {
        file.once("error", reject);
        file.end(resolve);
      });
      this.#emit({ state: "downloaded", version });
      installMacUpdate(target);
    } catch (err) {
      logger.warn("macOS update download failed", { error: String(err) });
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
