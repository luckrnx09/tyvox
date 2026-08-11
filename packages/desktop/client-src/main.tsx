import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { I18nextProvider } from "react-i18next";
import { IPC } from "../shared/channels";
import { App } from "./App";
import { theme } from "./theme/tokens";
import i18n from "./i18n";
import { configureDesktopSdk } from "../shared/sdk";
import type { LocalSettings } from "../shared/types/settings";
import { logger } from "./utils/logger";

async function bootstrapBackend(): Promise<void> {
  const localSettings = await window.electron.invoke<LocalSettings>(IPC.LOCAL_SETTINGS_LOAD);
  try {
    const baseUrl = await window.electron.invoke<string>(IPC.START_BACKEND, localSettings);
    configureDesktopSdk(baseUrl);
  } catch (err) {
    logger.error("Failed to start backend", {
      error: err instanceof Error ? err.message : String(err),
    });
    if (!localSettings.useLocalBackend) {
      configureDesktopSdk(localSettings.serverUrl);
    }
  }
}

async function startRenderer() {
  await bootstrapBackend();

  const rootEl = document.querySelector("#root");
  if (!rootEl) {
    throw new Error("Missing #root element");
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme} defaultMode="system">
          <CssBaseline />
          <App />
        </ThemeProvider>
      </I18nextProvider>
    </React.StrictMode>,
  );
}

void startRenderer();
