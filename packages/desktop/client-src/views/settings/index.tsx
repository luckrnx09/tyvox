import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import MicOutlinedIcon from "@mui/icons-material/MicOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import BookOutlinedIcon from "@mui/icons-material/BookOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useSettings } from "../../hooks/useSettings";
import { useIpcListener } from "../../hooks/useIpcListener";
import { isUpdateSnoozed, snoozeUpdates } from "../../utils/update-snooze";
import { IPC } from "../../../shared/channels";
import type { PlatformResult, UpdateStatus } from "../../../shared/types/ipc";
import { GeneralTab } from "./tabs/GeneralTab";
import { SpeechTab } from "./tabs/SpeechTab";
import { LanguageModelTab } from "./tabs/LanguageModelTab";
import { ActionsTab } from "./tabs/ActionsTab";
import { VocabularyTab } from "./tabs/VocabularyTab";
import { AboutTab } from "./tabs/AboutTab";

type Page = "general" | "speech" | "languageModel" | "actions" | "vocabulary" | "about";

const NAV: { id: Page; icon: React.ElementType; labelKey: string }[] = [
  { id: "general", icon: HomeOutlinedIcon, labelKey: "settings.nav.general" },
  { id: "speech", icon: MicOutlinedIcon, labelKey: "settings.nav.speech" },
  { id: "languageModel", icon: AutoFixHighOutlinedIcon, labelKey: "settings.nav.languageModel" },
  { id: "actions", icon: KeyboardOutlinedIcon, labelKey: "settings.nav.actions" },
  { id: "vocabulary", icon: BookOutlinedIcon, labelKey: "settings.nav.vocabulary" },
  { id: "about", icon: InfoOutlinedIcon, labelKey: "settings.nav.about" },
];

let autoUpdateCheckDone = false;

export const Settings = () => {
  const { t } = useTranslation();
  const { load, isLoaded } = useSettings();
  const [page, setPage] = useState<Page>("general");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const platformRef = useRef<PlatformResult["platform"] | null>(null);
  const autoCheckPendingRef = useRef(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.electron
      .invoke<PlatformResult>(IPC.GET_PLATFORM)
      .then((r) => {
        platformRef.current = r.platform;
      })
      .catch(() => {});
    if (autoUpdateCheckDone || isUpdateSnoozed()) return;
    autoUpdateCheckDone = true;
    autoCheckPendingRef.current = true;
    window.electron.invoke(IPC.UPDATE_CHECK).catch(() => {});
  }, []);

  useIpcListener(IPC.UPDATE_STATUS, (payload: unknown) => {
    const status = payload as UpdateStatus;
    if (!autoCheckPendingRef.current) return;
    if (status.state === "checking") return;
    autoCheckPendingRef.current = false;
    if (status.state === "available") {
      setUpdateVersion(status.version);
    }
  });

  const dismissUpdate = () => {
    snoozeUpdates();
    setUpdateVersion(null);
  };

  const applyUpdate = () => {
    setUpdateVersion(null);
    const channel = platformRef.current === "darwin" ? IPC.UPDATE_INSTALL : IPC.UPDATE_QUIT_INSTALL;
    window.electron.invoke(channel).catch(() => {});
  };

  const navigate = (next: Page) => {
    setPage(next);
  };

  if (!isLoaded) {
    return (
      <Box
        sx={{
          alignItems: "center",
          backgroundColor: "background.default",
          color: "text.secondary",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {t("common.loading")}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: "background.default",
        display: "flex",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <Box
        sx={{
          height: 40,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
          WebkitAppRegion: "drag",
          zIndex: 1,
        }}
      />
      <Box
        component="nav"
        sx={{
          backgroundColor: "background.paper",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          gap: 0.5,
          pb: 2,
          pl: 1,
          pr: 1,
          pt: 5,
          width: 176,
        }}
      >
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <Button
              key={item.id}
              onClick={() => navigate(item.id)}
              startIcon={<Icon sx={{ fontSize: 16 }} />}
              sx={{
                justifyContent: "flex-start",
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                borderLeft: 2,
                borderColor: active ? "primary.main" : "transparent",
                color: active ? "text.primary" : "text.secondary",
                backgroundColor: active ? "action.selected" : "transparent",
                fontWeight: 500,
                fontSize: 13,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: active ? "action.selected" : "action.hover",
                  color: "text.primary",
                },
              }}
            >
              {t(item.labelKey)}
            </Button>
          );
        })}
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          pb: 4,
          px: 4,
          pt: 5,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {page === "general" && <GeneralTab onNavigate={navigate} />}
        {page === "speech" && <SpeechTab />}
        {page === "languageModel" && <LanguageModelTab />}
        {page === "actions" && <ActionsTab />}
        {page === "vocabulary" && <VocabularyTab />}
        {page === "about" && <AboutTab />}
      </Box>

      <Dialog open={updateVersion !== null} onClose={dismissUpdate}>
        <DialogTitle>{t("update.availableTitle")}</DialogTitle>
        <DialogContent>{t("update.availableBody", { version: updateVersion })}</DialogContent>
        <DialogActions>
          <Button onClick={dismissUpdate}>{t("update.later")}</Button>
          <Button onClick={applyUpdate} variant="contained">
            {t("update.now")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
