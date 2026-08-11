import { BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { registerHandler } from "./router";
import { IPC } from "../../../shared/channels";

export function registerCapsuleHandlers(
  capsuleWindow: BrowserWindow | null,
  getSettingsWindow: () => BrowserWindow | null,
  openSettings: () => void,
): void {
  const showCapsule = () => {
    if (capsuleWindow && !capsuleWindow.isDestroyed() && !capsuleWindow.isVisible()) {
      capsuleWindow.showInactive();
    }
  };
  const hideCapsule = () => {
    if (capsuleWindow && !capsuleWindow.isDestroyed() && capsuleWindow.isVisible()) {
      capsuleWindow.hide();
    }
  };

  registerHandler(IPC.SHOW_CAPSULE, showCapsule);
  registerHandler(IPC.HIDE_CAPSULE, hideCapsule);
  registerHandler(IPC.CLOSE_CAPSULE, hideCapsule);
  registerHandler(IPC.OPEN_SETTINGS, openSettings);
  registerHandler(IPC.CAPSULE_SET_IGNORE_MOUSE, (_event: IpcMainInvokeEvent, ignore: unknown) => {
    const window = capsuleWindow;
    if (window && !window.isDestroyed()) {
      window.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
    }
  });
  registerHandler(IPC.WINDOW_MINIMIZE, (event: IpcMainInvokeEvent) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  registerHandler(IPC.WINDOW_MAXIMIZE, (event: IpcMainInvokeEvent) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
}
