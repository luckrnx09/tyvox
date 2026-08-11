import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import type { CapsuleError } from "../../../../shared/types/ipc";

export const ErrorState = ({
  error,
  onClose,
  attempt,
  maxAttempt,
}: {
  error: CapsuleError;
  onClose: () => void;
  attempt?: number;
  maxAttempt?: number;
}) => {
  const { t } = useTranslation();
  const baseMessage = t(`error.codes.${error.code}`, { defaultValue: error.message });
  const message = attempt && maxAttempt ? `${baseMessage} (${attempt}/${maxAttempt})` : baseMessage;

  return (
    <Box
      data-testid="capsule-error"
      sx={{
        alignItems: "center",
        display: "inline-flex",
        gap: 1,
        height: "100%",
        px: 1.5,
        width: "100%",
        backgroundColor: "background.paper",
        animation: "shakeX 0.4s cubic-bezier(.36,.07,.19,.97)",
      }}
    >
      <Tooltip title={error.message} arrow placement="top">
        <ErrorOutlineIcon sx={{ color: "error.main", fontSize: 18, flexShrink: 0 }} />
      </Tooltip>
      <Tooltip title={error.message} arrow placement="top">
        <Box
          component="span"
          sx={{
            color: "error.main",
            fontSize: 13,
            flex: "0 1 auto",
            maxWidth: 240,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {message}
        </Box>
      </Tooltip>
      <IconButton
        size="small"
        onClick={onClose}
        aria-label={t("common.close")}
        sx={{ color: "text.secondary", flexShrink: 0 }}
      >
        <CloseIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
};
