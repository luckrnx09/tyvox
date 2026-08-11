import { BrowserWindow, nativeTheme } from "electron";
import { join } from "node:path";
import { SETTINGS } from "../../../shared/limits";
import { getResourcePath } from "../../utils/paths";
import { isMac } from "../../utils/platform";

const WINDOW_BACKGROUND = {
  dark: "#08090A",
  light: "#FAFAFA",
} as const;

function getWindowBackground(): string {
  return nativeTheme.shouldUseDarkColors ? WINDOW_BACKGROUND.dark : WINDOW_BACKGROUND.light;
}

export function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    backgroundColor: getWindowBackground(),
    height: SETTINGS.HEIGHT,
    icon: getResourcePath("icon.png"),
    maximizable: false,
    resizable: false,
    show: false,
    ...(isMac() ? { titleBarStyle: "hiddenInset" as const } : {}),
    transparent: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "../preload/index.js"),
    },
    width: SETTINGS.WIDTH,
  });

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/index.html?window=settings`);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"), {
      query: { window: "settings" },
    });
  }

  return win;
}
