import type { ElectronAPI } from "../shared/types/ipc";

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
