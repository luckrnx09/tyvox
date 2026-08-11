import { setup } from "@tyvox/sdk/client";

export function configureDesktopSdk(baseUrl: string): void {
  setup({ baseUrl, userId: "default" }, { source: "desktop" });
}
