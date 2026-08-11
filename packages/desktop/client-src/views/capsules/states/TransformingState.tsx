import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import LanguageIcon from "@mui/icons-material/Language";
import { useTranslation } from "react-i18next";
import { ProgressBackdrop } from "./ProgressBackdrop";

const VARIANTS = {
  polish: {
    Icon: AutoFixHighIcon,
    labelKey: "capsule.polishing",
    testId: "capsule-polishing",
    iconAnimation: "sparkle 1.4s ease-in-out infinite",
  },
  translate: {
    Icon: LanguageIcon,
    labelKey: "capsule.translating",
    testId: "capsule-translating",
    iconAnimation: "spin 2s linear infinite",
  },
} as const;

export const TransformingState = ({
  variant,
  attempt = 1,
  maxAttempt = 1,
  progress = 0,
}: {
  variant: keyof typeof VARIANTS;
  attempt?: number;
  maxAttempt?: number;
  progress?: number;
}) => {
  const { t } = useTranslation();
  const { Icon, labelKey, testId, iconAnimation } = VARIANTS[variant];
  const isRetry = attempt > 1;
  const label = isRetry ? `${t("capsule.retrying")} (${attempt}/${maxAttempt})` : t(labelKey);
  return (
    <Box
      data-testid={testId}
      sx={{
        position: "relative",
        alignItems: "center",
        display: "inline-flex",
        height: "100%",
        justifyContent: "flex-start",
        px: 1.5,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <ProgressBackdrop progress={progress} />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", position: "relative" }}>
        <Icon
          sx={{
            color: "text.primary",
            fontSize: 18,
            animation: iconAnimation,
          }}
        />
        <Typography
          variant="caption"
          sx={{ color: "text.primary", fontSize: 12, lineHeight: 1, whiteSpace: "nowrap" }}
        >
          {label}
        </Typography>
      </Stack>
    </Box>
  );
};
