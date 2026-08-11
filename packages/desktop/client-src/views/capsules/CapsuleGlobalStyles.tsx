import GlobalStyles from "@mui/material/GlobalStyles";

export const CapsuleGlobalStyles = () => (
  <GlobalStyles
    styles={(theme) => {
      const paper = theme.vars?.palette.background.paper ?? theme.palette.background.paper;
      const selected = theme.vars?.palette.action.selected ?? theme.palette.action.selected;
      const primaryLight = theme.vars?.palette.primary.light ?? theme.palette.primary.light;
      return {
        "@keyframes recordingGlow": {
          "0%": { backgroundPosition: "0% 0%, 100% 100%, 50% 50%" },
          "50%": { backgroundPosition: "50% 100%, 50% 0%, 100% 50%" },
          "100%": { backgroundPosition: "100% 50%, 0% 50%, 50% 100%" },
        },
        "@keyframes auroraFlow": {
          "0%": { backgroundPosition: "0% 0%, 100% 100%, 50% 50%" },
          "50%": { backgroundPosition: "50% 100%, 50% 0%, 100% 50%" },
          "100%": { backgroundPosition: "100% 50%, 0% 50%, 50% 100%" },
        },
        "@keyframes spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "@keyframes pulse": {
          "0%, 100%": {
            backgroundColor: paper,
            transform: "scale(1)",
          },
          "50%": {
            backgroundColor: selected,
            transform: "scale(0.98)",
          },
        },
        "@keyframes slideBand": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(433%)" },
        },
        "@keyframes sparkle": {
          "0%, 100%": {
            opacity: 1,
            filter: `drop-shadow(0 0 4px color-mix(in srgb, ${primaryLight}, transparent 40%))`,
          },
          "50%": {
            opacity: 0.6,
            filter: `drop-shadow(0 0 8px color-mix(in srgb, ${primaryLight}, transparent 10%))`,
          },
        },
        "@keyframes shakeX": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%": { transform: "translateX(-8px)" },
          "30%": { transform: "translateX(8px)" },
          "50%": { transform: "translateX(-6px)" },
          "70%": { transform: "translateX(4px)" },
          "90%": { transform: "translateX(-2px)" },
        },
        "@keyframes edgePulse": {
          "0%, 100%": {
            boxShadow: `0 0 0 1px color-mix(in srgb, ${primaryLight}, transparent 70%), 0 0 24px color-mix(in srgb, ${primaryLight}, transparent 82%)`,
          },
          "50%": {
            boxShadow: `0 0 0 1px color-mix(in srgb, ${primaryLight}, transparent 50%), 0 0 32px color-mix(in srgb, ${primaryLight}, transparent 68%)`,
          },
        },
      };
    }}
  />
);
