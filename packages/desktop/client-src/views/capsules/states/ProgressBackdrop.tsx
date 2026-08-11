import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";

export const ProgressBackdrop = ({ progress }: { progress: number }) => {
  const percent = Math.min(100, Math.round(progress * 100));
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {percent > 0 ? (
        <Box
          data-testid="backdrop-fill"
          sx={{
            height: "100%",
            width: `${percent}%`,
            background: (theme) =>
              `linear-gradient(90deg, ${alpha(theme.palette.primary.light, 0.3)}, ${alpha(theme.palette.primary.light, 0.3)})`,
            transition: "width 0.3s ease",
          }}
        />
      ) : (
        <Box
          data-testid="backdrop-band"
          sx={{
            height: "100%",
            width: "30%",
            background: (theme) =>
              `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.light, 0.35)}, transparent)`,
            animation: "slideBand 1.6s ease-in-out infinite",
          }}
        />
      )}
    </Box>
  );
};
