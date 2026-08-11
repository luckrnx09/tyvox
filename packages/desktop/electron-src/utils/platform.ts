export const isMac = (): boolean => process.platform === "darwin";

export const isLinux = (): boolean => process.platform === "linux";

export const isWindows = (): boolean => process.platform === "win32";
