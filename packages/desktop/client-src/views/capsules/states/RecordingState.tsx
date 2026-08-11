import Box from "@mui/material/Box";
import { alpha, type Theme } from "@mui/material/styles";
import { AUDIO } from "../../../../shared/limits";
import { LevelBars } from "../LevelBars";

const RECORDING_GLOW_ALPHA = {
  start: 0.14,
  end: 0.08,
};

function getRecordingBackground(theme: Theme): string {
  return `radial-gradient(circle at 0% 100%, ${alpha(theme.palette.error.main, RECORDING_GLOW_ALPHA.start)} 0%, transparent 50%),
          radial-gradient(circle at 100% 0%, ${alpha(theme.palette.error.main, RECORDING_GLOW_ALPHA.end)} 0%, transparent 55%)`;
}

function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getTimerColor(ms: number): string {
  if (ms >= AUDIO.RECORDING_TIMER_DANGER_MS) return "error.main";
  if (ms >= AUDIO.RECORDING_TIMER_WARNING_MS) return "warning.main";
  return "text.primary";
}

export const RecordingState = ({
  elapsedMs,
  analyserRef,
}: {
  elapsedMs: number;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}) => {
  return (
    <Box
      data-testid="capsule-recording"
      sx={{
        alignItems: "center",
        display: "inline-flex",
        gap: 1.25,
        height: "100%",
        justifyContent: "space-between",
        px: 1.5,
        width: "100%",
        backgroundColor: "background.paper",
        backgroundImage: (theme) => getRecordingBackground(theme),
        backgroundSize: "200% 200%, 200% 200%",
        animation: "recordingGlow 8s linear infinite",
      }}
    >
      <LevelBars analyserRef={analyserRef} barCount={7} />
      <Box
        component="span"
        sx={{
          color: getTimerColor(elapsedMs),
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          minWidth: 40,
        }}
      >
        {formatElapsedMs(elapsedMs)}
      </Box>
    </Box>
  );
};
