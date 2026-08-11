import { ipcMain, type IpcMainInvokeEvent } from "electron";

export const registerHandler = (
  channel: string,
  handler: (event: IpcMainInvokeEvent, request: unknown) => unknown,
): void => {
  ipcMain.handle(channel, handler);
};
