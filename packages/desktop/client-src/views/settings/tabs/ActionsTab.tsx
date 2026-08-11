import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { ActionType, DesktopConfig } from "@tyvox/sdk/contracts";
import { useSettings } from "../../../hooks/useSettings";
import { IPC } from "../../../../shared/channels";
import { KeyCap } from "../KeyCap";

const TARGET_LANGUAGES = [
  "English",
  "中文",
  "日本語",
  "Español",
  "Français",
  "Deutsch",
  "Italiano",
  "Português",
  "Русский",
  "한국어",
  "العربية",
  "Nederlands",
  "Polski",
  "Türkçe",
  "Tiếng Việt",
  "Bahasa Indonesia",
  "ไทย",
];

const MODIFIER_KEYS = new Set(["Meta", "Control", "Shift", "Alt"]);

const MODIFIER_CODE_TO_ACCEL: Record<string, string> = {
  AltLeft: "Alt",
  AltRight: "AltRight",
  ControlLeft: "Ctrl",
  ControlRight: "CtrlRight",
  MetaLeft: "Meta",
  MetaRight: "MetaRight",
  ShiftLeft: "Shift",
  ShiftRight: "ShiftRight",
};

const parseAccelerator = (accelerator: string): string[] =>
  accelerator
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

const accelTokenLabel = (token: string): string => {
  const map: Record<string, string> = {
    Alt: "Option",
    AltRight: "Right Option",
    CmdOrCtrl: "Cmd",
    Control: "Control",
    Ctrl: "Control",
    CtrlRight: "Right Control",
    Meta: "Cmd",
    MetaRight: "Right Cmd",
    Shift: "Shift",
    ShiftRight: "Right Shift",
    Space: "Space",
  };
  return map[token] ?? token;
};

const keyEventToAccelerator = (event: KeyboardEvent): string | null => {
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push("CmdOrCtrl");
  if (event.shiftKey) parts.push("Shift");
  if (event.altKey) parts.push("Alt");
  if (MODIFIER_KEYS.has(event.key)) return null;
  const keyName =
    event.key === " " ? "Space" : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  parts.push(keyName);
  return parts.join("+");
};

const modifierCodeToAccelerator = (event: KeyboardEvent): string | null =>
  MODIFIER_CODE_TO_ACCEL[event.code] ?? null;

export const ActionsTab = () => {
  const { t } = useTranslation();
  const { config, update } = useSettings();
  const [recordingAction, setRecordingAction] = useState<ActionType | null>(null);
  const recordingActionRef = useRef<ActionType | null>(null);
  const modifierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyMain = useCallback((recording: boolean) => {
    window.electron.send(IPC.SETTINGS_HOTKEY_RECORDING, { recording });
  }, []);

  const finishRecording = useCallback(
    (accelerator: string) => {
      if (modifierTimerRef.current) {
        clearTimeout(modifierTimerRef.current);
        modifierTimerRef.current = null;
      }
      const action = recordingActionRef.current;
      setRecordingAction(null);
      recordingActionRef.current = null;
      notifyMain(false);
      if (!action || !config) return;
      const { actions } = config.desktop;
      update({
        desktop: {
          ...config.desktop,
          actions: {
            ...actions,
            [action]: { ...actions[action], hotkey: { accelerator } },
          },
        },
      });
    },
    [config, update, notifyMain],
  );

  const cancelRecording = useCallback(() => {
    if (modifierTimerRef.current) {
      clearTimeout(modifierTimerRef.current);
      modifierTimerRef.current = null;
    }
    setRecordingAction(null);
    recordingActionRef.current = null;
    notifyMain(false);
  }, [notifyMain]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!recordingActionRef.current) return;
      if (event.key === "Escape") {
        cancelRecording();
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      if (MODIFIER_KEYS.has(event.key)) {
        if (modifierTimerRef.current) clearTimeout(modifierTimerRef.current);
        const { code } = event;
        modifierTimerRef.current = setTimeout(() => {
          const accelerator = modifierCodeToAccelerator({ code } as KeyboardEvent);
          if (accelerator) finishRecording(accelerator);
        }, 400);
        return;
      }

      if (modifierTimerRef.current) {
        clearTimeout(modifierTimerRef.current);
        modifierTimerRef.current = null;
      }
      const accelerator = keyEventToAccelerator(event);
      if (accelerator) finishRecording(accelerator);
    },
    [cancelRecording, finishRecording],
  );

  useEffect(() => {
    if (!recordingAction) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (modifierTimerRef.current) clearTimeout(modifierTimerRef.current);
    };
  }, [recordingAction, handleKeyDown]);

  useEffect(
    () => () => {
      if (recordingActionRef.current) {
        notifyMain(false);
      }
    },
    [notifyMain],
  );

  if (!config) return null;

  const { actions } = config.desktop;

  const startRecording = (action: ActionType) => {
    cancelRecording();
    recordingActionRef.current = action;
    setRecordingAction(action);
    notifyMain(true);
  };

  const renderHotkeyRecorder = (action: ActionType) => {
    const recording = recordingAction === action;
    const keys = parseAccelerator(actions[action].hotkey.accelerator);
    return (
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2">{t("actions.hotkey")}</Typography>
        <Box>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Box
              role="button"
              tabIndex={0}
              aria-label={t("actions.recordNew")}
              onClick={() => (recording ? cancelRecording() : startRecording(action))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (recording) {
                    cancelRecording();
                  } else {
                    startRecording(action);
                  }
                }
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                backgroundColor: "action.hover",
                outline: recording ? "1px solid" : "none",
                outlineColor: recording ? "primary.main" : "transparent",
                cursor: "pointer",
              }}
            >
              {recording ? (
                <Typography variant="body1" color="primary.light">
                  {t("actions.pressKeys")}
                </Typography>
              ) : (
                keys.map((key, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {i > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        +
                      </Typography>
                    )}
                    <KeyCap>{accelTokenLabel(key)}</KeyCap>
                  </Box>
                ))
              )}
            </Box>
          </Stack>
        </Box>
      </Stack>
    );
  };

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 2, px: 2.5 }}>
          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
            {t("actions.modeTitle")}
          </Typography>

          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={config.desktop.hotkey.mode}
            onChange={(_, mode: DesktopConfig["hotkey"]["mode"] | null) => {
              if (!mode) return;
              update({
                desktop: {
                  ...config.desktop,
                  hotkey: { ...config.desktop.hotkey, mode },
                },
              });
            }}
            sx={{ "& .MuiToggleButton-root": { textTransform: "none" } }}
          >
            <ToggleButton value="ptt">{t("actions.pttLabel")}</ToggleButton>
            <ToggleButton value="toggle">{t("actions.toggleLabel")}</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">
            {config.desktop.hotkey.mode === "toggle"
              ? `${t("actions.toggleHint")} ${t("actions.modeCaption")}`
              : `${t("actions.pttHint")} ${t("actions.modeCaption")}`}
          </Typography>

          <Divider />

          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
            {t("actions.basicTitle")}
          </Typography>

          {renderHotkeyRecorder("basic")}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 2, px: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
              {t("actions.enhanceTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("actions.enhanceHint")}
            </Typography>
          </Box>

          <Divider />

          <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 600 }}>
            {t("actions.translateTitle")}
          </Typography>

          {renderHotkeyRecorder("translate")}

          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="body2" color="text.secondary">
              {t("actions.targetLanguage")}
            </Typography>
            <TextField
              select
              size="small"
              value={actions.translate.payload.target}
              onChange={(e) =>
                update({
                  desktop: {
                    ...config.desktop,
                    actions: {
                      ...actions,
                      translate: {
                        ...actions.translate,
                        payload: { target: e.target.value },
                      },
                    },
                  },
                })
              }
              slotProps={{ select: { autoWidth: true } }}
            >
              {TARGET_LANGUAGES.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {lang}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
