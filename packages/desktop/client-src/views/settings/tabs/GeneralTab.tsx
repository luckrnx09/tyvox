import { useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MicIcon from "@mui/icons-material/Mic";
import AccessibilityIcon from "@mui/icons-material/Accessibility";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import Switch from "@mui/material/Switch";
import CloudIcon from "@mui/icons-material/Cloud";
import { checkASRReadiness, checkLLMReadiness, healthCheck } from "@tyvox/sdk/client";
import { ActionTypeSchema } from "@tyvox/sdk/contracts";
import { useSettings } from "../../../hooks/useSettings";
import { useLocalSettings } from "../../../hooks/useLocalSettings";
import type { LocalSettings } from "../../../../shared/types/settings";
import { configureDesktopSdk } from "../../../../shared/sdk";
import { IPC } from "../../../../shared/channels";

type Status = "loading" | "ok" | "fail";

export type SettingsPage =
  | "general"
  | "speech"
  | "languageModel"
  | "actions"
  | "vocabulary"
  | "about";

const UI_LANGUAGES = [
  { label: "English", value: "en" },
  { label: "中文", value: "zh" },
];

interface GeneralTabProps {
  onNavigate: (page: SettingsPage) => void;
}

export const GeneralTab = ({ onNavigate }: GeneralTabProps) => {
  const { t } = useTranslation();
  const { mode, setMode } = useColorScheme();
  const { config, update } = useSettings();
  const { localSettings, updateLocalSettings, isLoaded } = useLocalSettings();
  const [micStatus, setMicStatus] = useState<Status>("loading");
  const [a11yStatus, setA11yStatus] = useState<Status>("loading");
  const [hotkeyStatus, setHotkeyStatus] = useState<Status>("loading");
  const [asrStatus, setAsrStatus] = useState<Status>("loading");
  const [llmStatus, setLlmStatus] = useState<Status>("loading");
  const [serverStatus, setServerStatus] = useState<Status>("loading");
  const previousLocalSettingsRef = useRef<LocalSettings | null>(null);

  const checkMic = useCallback(async () => {
    setMicStatus("loading");
    try {
      const r = await window.electron.invoke<{ granted: boolean }>(IPC.GET_MIC_PERMISSION);
      setMicStatus(r.granted ? "ok" : "fail");
    } catch {
      setMicStatus("fail");
    }
  }, []);

  const checkA11y = useCallback(async () => {
    setA11yStatus("loading");
    try {
      const r = await window.electron.invoke<{ granted: boolean }>(IPC.GET_A11Y_PERMISSION);
      setA11yStatus(r.granted ? "ok" : "fail");
    } catch {
      setA11yStatus("fail");
    }
  }, []);

  const checkHotkey = useCallback(() => {
    const actions = config?.desktop.actions;
    const configured = ActionTypeSchema.options.some(
      (action) => actions?.[action]?.hotkey.accelerator,
    );
    setHotkeyStatus(configured ? "ok" : "fail");
  }, [config?.desktop.actions]);

  const checkAsr = useCallback(async () => {
    setAsrStatus("loading");
    try {
      const { data } = await checkASRReadiness();
      setAsrStatus(data.ready ? "ok" : "fail");
    } catch {
      setAsrStatus("fail");
    }
  }, []);

  const checkLlm = useCallback(async () => {
    setLlmStatus("loading");
    try {
      const { data } = await checkLLMReadiness();
      setLlmStatus(data.ready ? "ok" : "fail");
    } catch {
      setLlmStatus("fail");
    }
  }, []);

  const checkServer = useCallback(async (localSettings: LocalSettings) => {
    setServerStatus("loading");
    try {
      const baseUrl = await window.electron.invoke<string>(IPC.START_BACKEND, localSettings);
      configureDesktopSdk(baseUrl);
      await healthCheck();
      setServerStatus("ok");
    } catch {
      if (!localSettings.useLocalBackend) {
        configureDesktopSdk(localSettings.serverUrl);
      }
      setServerStatus("fail");
    }
  }, []);

  const checkServerHealth = useCallback(async () => {
    setServerStatus("loading");
    try {
      const baseUrl = await window.electron.invoke<string>(IPC.GET_BACKEND_URL);
      if (!baseUrl) {
        setServerStatus("fail");
        return;
      }
      configureDesktopSdk(baseUrl);
      await healthCheck();
      setServerStatus("ok");
    } catch {
      setServerStatus("fail");
    }
  }, []);

  useEffect(() => {
    checkMic();
    checkA11y();
  }, [checkMic, checkA11y]);

  useEffect(() => {
    if (!isLoaded || !localSettings) return;
    const previous = previousLocalSettingsRef.current;
    const changed =
      !previous ||
      previous.useLocalBackend !== localSettings.useLocalBackend ||
      previous.serverUrl !== localSettings.serverUrl;
    previousLocalSettingsRef.current = localSettings;
    const timer = setTimeout(() => {
      if (changed) {
        void checkServer(localSettings);
      } else {
        void checkServerHealth();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoaded, localSettings, checkServer, checkServerHealth]);

  useEffect(() => {
    if (serverStatus !== "ok") return;
    checkAsr();
    checkLlm();
  }, [serverStatus, checkAsr, checkLlm]);

  useEffect(() => {
    checkHotkey();
  }, [checkHotkey]);

  useEffect(() => {
    const onFocus = () => {
      if (micStatus !== "ok") checkMic();
      if (a11yStatus !== "ok") checkA11y();
      if (serverStatus !== "ok") checkServerHealth();
      if (asrStatus !== "ok") checkAsr();
      if (llmStatus !== "ok") checkLlm();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [
    checkMic,
    checkA11y,
    checkAsr,
    checkLlm,
    checkServerHealth,
    micStatus,
    a11yStatus,
    asrStatus,
    llmStatus,
    serverStatus,
  ]);

  const cards = [
    {
      icon: CloudIcon,
      label: t("overview.server"),
      status: serverStatus,
      okText: t("overview.serverOk"),
      failText: t("overview.serverFail"),
    },
    {
      icon: AccessibilityIcon,
      label: t("overview.a11y"),
      status: a11yStatus,
      okText: t("overview.a11yOk"),
      failText: t("overview.a11yFail"),
      onGrant: () => window.electron.invoke(IPC.OPEN_ACCESSIBILITY_PREFS),
    },
    {
      icon: MicIcon,
      label: t("overview.mic"),
      status: micStatus,
      okText: t("overview.micOk"),
      failText: t("overview.micFail"),
      onGrant: () => window.electron.invoke(IPC.OPEN_SYSTEM_PREFS),
    },
    {
      icon: GraphicEqIcon,
      label: t("overview.asr"),
      status: asrStatus,
      okText: t("overview.asrOk"),
      failText: t("overview.asrFail"),
      onGrant: () => onNavigate("speech"),
    },
    {
      icon: AutoFixHighOutlinedIcon,
      label: t("overview.llm"),
      status: llmStatus,
      okText: t("overview.llmOk"),
      failText: t("overview.llmFail"),
      onGrant: () => onNavigate("languageModel"),
    },
    {
      icon: KeyboardIcon,
      label: t("overview.hotkey"),
      status: hotkeyStatus,
      okText: t("overview.hotkeyOk"),
      failText: t("overview.hotkeyFail"),
      onGrant: () => onNavigate("actions"),
    },
  ];

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 2.5, px: 3 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          {t("general.basic")}
        </Typography>
        {isLoaded && localSettings && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="body1">{t("general.launchAtLogin")}</Typography>
            <Switch
              checked={localSettings.launchAtLogin}
              onChange={(e) => updateLocalSettings({ launchAtLogin: e.target.checked })}
              slotProps={{ input: { "aria-label": t("general.launchAtLogin") } }}
            />
          </Box>
        )}

        <Divider />

        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          {t("general.backend")}
        </Typography>
        {isLoaded && localSettings && (
          <Stack spacing={2}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body1">{t("general.useLocalBackend")}</Typography>
              <Switch
                checked={localSettings.useLocalBackend}
                onChange={(e) => updateLocalSettings({ useLocalBackend: e.target.checked })}
                slotProps={{ input: { "aria-label": t("general.useLocalBackend") } }}
              />
            </Box>
            {!localSettings.useLocalBackend && (
              <TextField
                label={t("general.serverUrl")}
                value={localSettings.serverUrl}
                onChange={(e) => updateLocalSettings({ serverUrl: e.target.value })}
                placeholder="http://192.168.1.10:23456"
                size="small"
              />
            )}
          </Stack>
        )}

        <Divider />

        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          {t("overview.setup")}
        </Typography>
        <Stack spacing={1.5}>
          {cards.map((card) => {
            const Icon = card.icon;
            const clickable = card.status === "fail" && card.onGrant;
            return (
              <Box
                key={card.label}
                onClick={clickable ? card.onGrant : undefined}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  py: 1,
                  cursor: clickable ? "pointer" : "default",
                }}
              >
                <Icon sx={{ color: "text.secondary", fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {card.label}
                  </Typography>
                  {card.status !== "loading" && (
                    <Typography variant="caption" color="text.secondary">
                      {card.status === "ok" ? card.okText : card.failText}
                    </Typography>
                  )}
                </Box>
                {card.status === "loading" && <CircularProgress size={16} />}
                {card.status === "ok" && (
                  <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
                )}
                {clickable && (
                  <IconButton size="small" aria-label={t("overview.configure")}>
                    <ArrowForwardIcon />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Stack>

        <Divider />

        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          {t("general.appearance")}
        </Typography>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t("language.ui")}
            </Typography>
            <ToggleButtonGroup
              value={config?.desktop.uiLocale ?? "en"}
              exclusive
              onChange={(_e, value) => {
                if (!value) return;
                update({ desktop: { ...config!.desktop, uiLocale: value as "en" | "zh" } });
              }}
              size="small"
              sx={{ width: "60%" }}
            >
              {UI_LANGUAGES.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t("general.theme")}
            </Typography>
            <ToggleButtonGroup
              value={mode ?? "system"}
              exclusive
              onChange={(_e, value) => {
                if (!value) return;
                setMode(value as "system" | "light" | "dark");
              }}
              size="small"
              sx={{ width: "90%" }}
            >
              <ToggleButton value="system">{t("general.themeSystem")}</ToggleButton>
              <ToggleButton value="dark">{t("general.themeDark")}</ToggleButton>
              <ToggleButton value="light">{t("general.themeLight")}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
