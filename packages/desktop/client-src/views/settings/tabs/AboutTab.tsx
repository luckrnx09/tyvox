import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import { IPC } from "../../../../shared/channels";
import type { PlatformResult, UpdateStatus } from "../../../../shared/types/ipc";
import { useIpcListener } from "../../../hooks/useIpcListener";

const REPO_URL = "https://github.com/luckrnx09/tyvox";
const LOGO_URL = "logo.svg";
const APP_NAME = "Tyvox";

export const AboutTab = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("0.1.0");
  const [platform, setPlatform] = useState<PlatformResult["platform"] | null>(null);
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    window.electron
      .invoke<string>(IPC.GET_APP_VERSION)
      .then(setVersion)
      .catch(() => {});
    window.electron
      .invoke<PlatformResult>(IPC.GET_PLATFORM)
      .then((r) => setPlatform(r.platform))
      .catch(() => {});
  }, []);

  useIpcListener(IPC.UPDATE_STATUS, (payload: unknown) => {
    setStatus(payload as UpdateStatus);
  });

  const checkUpdate = () => {
    setStatus({ state: "checking" });
    window.electron.invoke(IPC.UPDATE_CHECK).catch(() => {});
  };

  const statusText = (() => {
    if (!status) return null;
    switch (status.state) {
      case "checking":
        return t("about.checking");
      case "available":
        return t("about.newVersion", { version: status.version });
      case "downloaded":
        return t("about.downloaded", { version: status.version });
      case "not-available":
        return t("about.upToDate");
      case "error":
        return t("about.updateError");
    }
  })();

  return (
    <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          py: 4,
          px: 3,
          textAlign: "center",
        }}
      >
        <Box component="img" src={LOGO_URL} alt="Tyvox logo" sx={{ height: 56, width: 56 }} />

        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {APP_NAME}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("about.hint")}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary">
          {t("about.version")} {version} · {t("about.license")} MIT
        </Typography>

        <Stack
          direction="row"
          spacing={2}
          sx={{ justifyContent: "center", alignItems: "center", flexWrap: "wrap", mt: 1 }}
        >
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: "none", "&:hover": { color: "text.primary" } }}
          >
            {t("about.github")}
          </Link>
          <Link
            href={`${REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: "none", "&:hover": { color: "text.primary" } }}
          >
            {t("about.reportIssue")}
          </Link>
          <Button
            size="small"
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={checkUpdate}
            disabled={status?.state === "checking"}
            sx={{
              textTransform: "none",
              color: "text.secondary",
              "&:hover": { color: "text.primary" },
            }}
          >
            {t("about.checkUpdate")}
          </Button>
          {status?.state === "available" && platform === "darwin" && (
            <Button
              size="small"
              variant="text"
              onClick={() => window.electron.invoke(IPC.UPDATE_OPEN_RELEASES).catch(() => {})}
              sx={{
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              {t("about.openRelease")}
            </Button>
          )}
          {status?.state === "downloaded" && (
            <Button
              size="small"
              variant="text"
              onClick={() => window.electron.invoke(IPC.UPDATE_QUIT_INSTALL).catch(() => {})}
              sx={{
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              {t("about.quitAndInstall")}
            </Button>
          )}
        </Stack>

        {statusText && (
          <Typography variant="body2" color="text.secondary">
            {statusText}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
