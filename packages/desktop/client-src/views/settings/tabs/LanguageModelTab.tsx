import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useSettings } from "../../../hooks/useSettings";
import { checkLLMReadiness, listLLMProviders, type LLMProviderInfo } from "@tyvox/sdk/client";
import { ConfigStatus, type ValidationStatus } from "../ConfigStatus";
import Tooltip from "@mui/material/Tooltip";
import { InfoOutlineRounded } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
const TONE_OPTIONS = [
  { value: "professional", labelKey: "languageModel.tone.professional" },
  { value: "casual", labelKey: "languageModel.tone.casual" },
  { value: "concise", labelKey: "languageModel.tone.concise" },
  { value: "formal", labelKey: "languageModel.tone.formal" },
];

const DEBOUNCE_MS = 1000;

interface ExtraBodyFieldProps {
  value?: string;
  onChange: (value?: string) => void;
}

const ExtraBodyField = ({ value, onChange }: ExtraBodyFieldProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
    setError(false);
  }, [value]);

  const handleBlur = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError(false);
      onChange(undefined);
      return;
    }
    try {
      const formatted = JSON.stringify(JSON.parse(trimmed), null, 2);
      setError(false);
      setDraft(formatted);
      onChange(formatted);
    } catch {
      setError(true);
    }
  };

  return (
    <TextField
      label={t("languageModel.extraBody")}
      size="small"
      multiline
      minRows={3}
      error={error}
      helperText={error ? t("languageModel.extraBodyInvalid") : t("languageModel.extraBodyHint")}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
    />
  );
};

export const LanguageModelTab = () => {
  const { t } = useTranslation();
  const { config, update } = useSettings();
  const [providers, setProviders] = useState<LLMProviderInfo[]>([]);

  const [validation, setValidation] = useState<{ status: ValidationStatus; error?: string }>({
    status: "idle",
  });
  const validationSeq = useRef(0);

  const runCheck = async () => {
    const seq = ++validationSeq.current;
    setValidation({ status: "loading" });
    try {
      const { data } = await checkLLMReadiness();
      if (seq !== validationSeq.current) return;
      setValidation(data.ready ? { status: "ok" } : { status: "fail", error: data.error });
    } catch {
      if (seq !== validationSeq.current) return;
      setValidation({ status: "fail" });
    }
  };

  const llmConfig = config?.llm;
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (!llmConfig) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      void runCheck();
      return () => {
        validationSeq.current++;
      };
    }
    const timer = setTimeout(() => void runCheck(), DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      validationSeq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llmConfig?.provider, llmConfig?.baseUrl, llmConfig?.apiKey, llmConfig?.model]);

  useEffect(() => {
    listLLMProviders()
      .then((res) => setProviders(res.data))
      .catch(() => setProviders([]));
  }, []);

  if (!config) return null;

  const patchLlm = (partial: Partial<typeof config.llm>) =>
    update({ llm: { ...config.llm, ...partial } });

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;
    patchLlm({
      provider: providerId as typeof config.llm.provider,
      baseUrl: provider.defaultBaseUrl,
      apiKey: "",
      model: "",
    });
  };

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 2, px: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
              {t("languageModel.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("languageModel.hint")}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <TextField
              select
              label={t("languageModel.provider")}
              value={config.llm.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              size="small"
              sx={{ flex: 4 }}
            >
              {providers.map((opt) => (
                <MenuItem key={opt.id} value={opt.id}>
                  {opt.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={t("languageModel.model")}
              size="small"
              placeholder=""
              value={config.llm.model}
              onChange={(e) => patchLlm({ model: e.target.value })}
              sx={{ flex: 5 }}
            />
          </Stack>

          <TextField
            label={t("languageModel.baseUrl")}
            size="small"
            placeholder="https://api.openai.com/v1"
            value={config.llm.baseUrl}
            onChange={(e) => patchLlm({ baseUrl: e.target.value })}
          />

          <TextField
            label={t("languageModel.apiKey")}
            type="password"
            size="small"
            placeholder={t("languageModel.apiKeyHint")}
            value={config.llm.apiKey}
            onChange={(e) => patchLlm({ apiKey: e.target.value })}
          />

          {config.llm.provider === "custom" && (
            <ExtraBodyField
              value={config.llm.extraBody}
              onChange={(extraBody) => patchLlm({ extraBody })}
            />
          )}

          <ConfigStatus status={validation.status} error={validation.error} />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="body1">
              {t("languageModel.thinking")}
              <Tooltip title={t("languageModel.thinkingHint")}>
                <IconButton>
                  <InfoOutlineRounded />
                </IconButton>
              </Tooltip>
            </Typography>
            <Switch
              size="small"
              checked={config.llm.thinkingEnabled}
              onChange={(e) => patchLlm({ thinkingEnabled: e.target.checked })}
              slotProps={{ input: { "aria-label": t("languageModel.thinking") } }}
            />
          </Box>

          <Divider />

          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
            {t("languageModel.tone.title")}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={config.llm.tone}
            onChange={(_e, value) => {
              if (!value) return;
              patchLlm({ tone: value as typeof config.llm.tone });
            }}
          >
            {TONE_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {t(`languageModel.tone.${config.llm.tone}Scene`)}
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: "background.default" }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("languageModel.tone.originalLabel")}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t("languageModel.tone.exampleInput")}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: "background.default" }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("languageModel.tone.polishedLabel")}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t(`languageModel.tone.${config.llm.tone}Example`)}
              </Typography>
            </Paper>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
