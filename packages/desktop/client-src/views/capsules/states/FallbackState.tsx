import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { useTranslation } from "react-i18next";

export const FallbackState = () => {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="capsule-fallback"
      sx={{ alignItems: "center", display: "inline-flex", height: "100%", px: 1.5 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <WarningAmberOutlined sx={{ fontSize: 16, color: "warning.main" }} />
        <Typography
          variant="caption"
          sx={{ color: "text.primary", fontSize: 12, lineHeight: 1, whiteSpace: "nowrap" }}
        >
          {t("capsule.polishFallback")}
        </Typography>
      </Stack>
    </Box>
  );
};
