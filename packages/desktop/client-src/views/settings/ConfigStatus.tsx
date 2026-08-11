import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useTranslation } from "react-i18next";

export type ValidationStatus = "idle" | "loading" | "ok" | "fail";

interface ConfigStatusProps {
  status: ValidationStatus;
  error?: string;
}

export const ConfigStatus = ({ status, error }: ConfigStatusProps) => {
  const { t } = useTranslation();
  if (status === "idle") return null;

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      {status === "loading" && <CircularProgress size={16} />}
      {status === "ok" && <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />}
      {status === "fail" && <ErrorIcon sx={{ color: "error.main", fontSize: 18 }} />}
      <Typography variant="caption" color={status === "fail" ? "error.main" : "text.secondary"}>
        {status === "loading" && t("validation.testing")}
        {status === "ok" && t("validation.ok")}
        {status === "fail" && (error ?? t("validation.failed"))}
      </Typography>
    </Stack>
  );
};
