import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";
import { ProgressBackdrop } from "./ProgressBackdrop";

export const TranscribingState = () => {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="capsule-transcribing"
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
      <ProgressBackdrop progress={0} />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", position: "relative" }}>
        <CircularProgress size={16} sx={{ color: "text.primary" }} />
        <Typography
          variant="caption"
          sx={{ color: "text.primary", fontSize: 12, lineHeight: 1, whiteSpace: "nowrap" }}
        >
          {t("capsule.transcribing")}
        </Typography>
      </Stack>
    </Box>
  );
};
