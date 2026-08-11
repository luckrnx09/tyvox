import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import { useSettings } from "../../../hooks/useSettings";
import { useASRModels } from "../../../hooks/useASRModels";
import { useAudioDevices } from "../../../hooks/useAudioDevices";
import { logger } from "../../../utils/logger";
import { checkASRReadiness, type ASRModel, type ASRProviderGroup } from "@tyvox/sdk/client";
import { ConfigStatus, type ValidationStatus } from "../ConfigStatus";

const PROVIDER_NAMES: Record<string, string> = {
  whisper: "speech.asr.whisper",
  sensevoice: "speech.asr.sensevoice",
};

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Chinese (Simplified)", label: "简体中文" },
  { value: "Chinese (Traditional)", label: "繁體中文" },
  { value: "Japanese", label: "日本語" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
  { value: "Korean", label: "한국어" },
  { value: "Portuguese", label: "Português" },
  { value: "Russian", label: "Русский" },
  { value: "Italian", label: "Italiano" },
  { value: "Arabic", label: "العربية" },
  { value: "Hindi", label: "हिन्दी" },
  { value: "Dutch", label: "Nederlands" },
  { value: "Polish", label: "Polski" },
  { value: "Turkish", label: "Türkçe" },
  { value: "Swedish", label: "Svenska" },
  { value: "Vietnamese", label: "Tiếng Việt" },
  { value: "Thai", label: "ไทย" },
  { value: "Indonesian", label: "Bahasa Indonesia" },
];

function parseProvider(value: string): { providerId: string; modelId: string } {
  const [providerId, ...rest] = value.split(":");
  return { providerId: providerId!, modelId: rest.join(":") };
}

function buildProvider(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`;
}

function formatProviderModel(groupId: string, modelId: string): string {
  return `${groupId} - ${modelId}`;
}

function providerModelLabel(
  t: (key: string) => string,
  group: ASRProviderGroup,
  model: ASRModel,
): string {
  const providerName = t(PROVIDER_NAMES[group.id] ?? group.id);
  return `${providerName} - ${model.name}`;
}

export const SpeechTab = () => {
  const { t } = useTranslation();
  const { config, update } = useSettings();
  const { groups, isLoading, prepare } = useASRModels();
  const devices = useAudioDevices();
  const [activePrepareId, setActivePrepareId] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ status: ValidationStatus; error?: string }>({
    status: "idle",
  });
  const validationSeq = useRef(0);

  const runCheck = async () => {
    const seq = ++validationSeq.current;
    setValidation({ status: "loading" });
    try {
      const { data } = await checkASRReadiness();
      if (seq !== validationSeq.current) return;
      setValidation(data.ready ? { status: "ok" } : { status: "fail", error: data.error });
    } catch {
      if (seq !== validationSeq.current) return;
      setValidation({ status: "fail" });
    }
  };

  const current = useMemo(
    () => parseProvider(config?.speech.provider ?? ""),
    [config?.speech.provider],
  );

  const selectedGroup = useMemo(() => {
    return groups.find((group) => group.id === current.providerId) ?? groups[0];
  }, [groups, current.providerId]);

  const selectedModel = selectedGroup?.models.find(
    (model) => model.id === buildProvider(selectedGroup.id, current.modelId),
  );

  useEffect(() => {
    setActivePrepareId(null);
  }, [selectedModel?.id]);

  useEffect(() => {
    if (
      activePrepareId &&
      selectedModel?.id === activePrepareId &&
      (selectedModel.status === "ready" || selectedModel.status === "error")
    ) {
      setActivePrepareId(null);
    }
  }, [activePrepareId, selectedModel]);

  const selectedReady = selectedModel?.status === "ready";
  const selectedModelId = selectedModel?.id;
  useEffect(() => {
    if (!selectedReady) {
      validationSeq.current += 1;
      setValidation({ status: "idle" });
      return () => {
        validationSeq.current += 1;
      };
    }
    void runCheck();
    return () => {
      validationSeq.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReady, selectedModelId]);

  if (!config) return null;

  const patchMic = (partial: Partial<typeof config.desktop.microphone>) =>
    update({
      desktop: { ...config.desktop, microphone: { ...config.desktop.microphone, ...partial } },
    });
  const patchSpeech = (partial: Partial<typeof config.speech>) =>
    update({ speech: { ...config.speech, ...partial } });

  const handleSelectProviderModel = (combined: string) => {
    const [providerId, modelId] = combined.split(" - ");
    if (!providerId || !modelId) return;
    patchSpeech({ provider: buildProvider(providerId, modelId) as typeof config.speech.provider });
  };

  const handlePrepare = (id: string) => {
    setActivePrepareId(id);
    prepare(id).catch((error) => {
      logger.error("Failed to prepare ASR model", { id, error: String(error) });
      setActivePrepareId(null);
    });
  };

  const deviceOptions = devices.map((d) => ({
    label: d.isDefault ? t("speech.mic.defaultDevice", { name: d.name }) : d.name,
    value: d.id,
  }));

  return (
    <Stack spacing={3}>
      {isLoading && groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("common.loading")}
        </Typography>
      ) : (
        <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, py: 2, px: 2.5 }}>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
              {t("speech.asr.title")}
            </Typography>
            {selectedGroup && selectedModel && (
              <ModelRow
                groups={groups}
                group={selectedGroup}
                model={selectedModel}
                currentModelId={current.modelId}
                activePrepareId={activePrepareId}
                status={validation.status}
                error={validation.error}
                onSelectProviderModel={handleSelectProviderModel}
                onPrepare={handlePrepare}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 2, px: 2.5 }}>
          <Typography variant="body2" sx={{ fontSize: 15, fontWeight: 600 }}>
            {t("speech.mic.title")}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TextField
              select
              label={t("speech.mic.device")}
              value={config.desktop.microphone.deviceId}
              onChange={(e) => patchMic({ deviceId: e.target.value })}
              size="small"
              slotProps={{ select: { autoWidth: true } }}
            >
              {deviceOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2, px: 2.5 }}>
          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
            {t("speech.languages.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("speech.languages.hint")}
          </Typography>
          <Autocomplete
            size="small"
            multiple
            options={LANGUAGE_OPTIONS}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            value={LANGUAGE_OPTIONS.filter((option) =>
              config.speech.languages.includes(option.value),
            )}
            filterSelectedOptions
            onChange={(_e, newValue) => {
              const values = newValue.map((option) => option.value);
              const previous = config.speech.languages;
              const ordered = [
                ...previous.filter((lang) => values.includes(lang)),
                ...values.filter((lang) => !previous.includes(lang)),
              ];
              patchSpeech({ languages: ordered.slice(0, 3) });
            }}
            renderInput={(params) => (
              <TextField {...params} label={t("speech.languages.title")} size="small" />
            )}
          />
        </CardContent>
      </Card>
    </Stack>
  );
};

interface ModelRowProps {
  groups: ASRProviderGroup[];
  group: ASRProviderGroup;
  model: ASRModel;
  currentModelId: string;
  activePrepareId: string | null;
  status: ValidationStatus;
  error?: string;
  onSelectProviderModel: (combined: string) => void;
  onPrepare: (id: string) => void;
}

const ModelRow = ({
  groups,
  group,
  model,
  currentModelId,
  activePrepareId,
  status,
  error,
  onSelectProviderModel,
  onPrepare,
}: ModelRowProps) => {
  const { t } = useTranslation();
  const isPending = activePrepareId === model.id;
  const isPreparing = model.status === "preparing" || isPending;
  const isError = model.status === "error" && !isPending;

  const handlePrepare = () => {
    if (isPreparing || model.status === "ready") return;
    onPrepare(model.id);
  };

  const allOptions = groups.flatMap((g) =>
    g.models.map((m) => ({
      label: providerModelLabel(t, g, m),
      value: formatProviderModel(g.id, parseProvider(m.id).modelId),
    })),
  );
  const currentValue = formatProviderModel(group.id, currentModelId);

  return (
    <Stack spacing={1.5}>
      <Stack spacing={2} direction="row" sx={{ alignItems: "center" }}>
        <TextField
          select
          label={t("speech.asr.provider")}
          size="small"
          value={currentValue}
          onChange={(e) => onSelectProviderModel(e.target.value)}
          sx={{ width: "100%" }}
        >
          {allOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <ModelButton model={model} isPreparing={isPreparing} onPrepare={handlePrepare} />
      </Stack>

      <ConfigStatus status={status} error={error} />

      {isPreparing && (
        <Box sx={{ width: "100%" }}>
          {model.progress === undefined ? (
            <LinearProgress />
          ) : (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <LinearProgress
                variant="determinate"
                value={model.progress * 100}
                sx={{ flexGrow: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(model.progress * 100)}%
              </Typography>
            </Stack>
          )}
        </Box>
      )}

      {isError && (
        <Typography variant="caption" color="error.main">
          {model.error ?? t("speech.asr.error")}
        </Typography>
      )}
    </Stack>
  );
};

function ModelButton({
  model,
  isPreparing,
  onPrepare,
}: {
  model: ASRModel;
  isPreparing: boolean;
  onPrepare: () => void;
}) {
  const { t } = useTranslation();
  if (model.status === "ready") return null;
  if (isPreparing) return <CircularProgress size={18} />;
  return (
    <IconButton
      size="small"
      color="primary"
      onClick={onPrepare}
      aria-label={model.status === "error" ? t("speech.asr.retry") : t("speech.asr.prepare")}
    >
      {model.status === "error" ? <RefreshIcon /> : <RocketLaunchOutlinedIcon />}
    </IconButton>
  );
}
