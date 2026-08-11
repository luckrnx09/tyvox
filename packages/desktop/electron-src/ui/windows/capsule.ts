import { BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { CAPSULE } from "../../../shared/limits";

export function createCapsuleWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: CAPSULE.WIDTH,
    height: CAPSULE.HEIGHT,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    // Never steal keyboard focus from the user's active text field. PTT
    // Recording must keep the previously focused app frontmost so the
    // Simulated Cmd+V injects into the right field.
    focusable: false,
    show: true,
    webPreferences: {
      autoplayPolicy: "no-user-gesture-required",
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "../preload/index.js"),
    },
  });

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  win.setPosition(
    Math.round((screenW - CAPSULE.WIDTH) / 2),
    screenH - CAPSULE.BOTTOM_OFFSET - CAPSULE.HEIGHT,
  );

  // Start idle — all mouse events pass through to windows below. Orchestrator
  // Enables capture via setIgnoreMouseEvents(false) only when a state is active.
  win.setIgnoreMouseEvents(true, { forward: true });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/index.html?window=capsule`);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"), {
      query: { window: "capsule" },
    });
  }

  return win;
}
