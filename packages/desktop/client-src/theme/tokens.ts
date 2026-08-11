import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data" },
  colorSchemes: {
    dark: {
      palette: {
        mode: "dark",
        background: { default: "#08090A", paper: "#101114" },
        primary: { main: "#6C5CE7", light: "#8E7EF3", contrastText: "#fff" },
        error: { main: "#E5484D" },
        warning: { main: "#fbbf24" },
        success: { main: "#46A758" },
        text: { primary: "#EDEDEF", secondary: "#8A8F98", disabled: "#71717a" },
        divider: "rgba(255, 255, 255, 0.07)",
        action: {
          hover: "rgba(255, 255, 255, 0.06)",
          selected: "rgba(108, 92, 231, 0.14)",
        },
      },
    },
    light: {
      palette: {
        mode: "light",
        background: { default: "#FAFAFA", paper: "#FFFFFF" },
        primary: { main: "#5A4BD1", light: "#7A6BE0", contrastText: "#fff" },
        error: { main: "#D92D20" },
        warning: { main: "#B45309" },
        success: { main: "#30A46C" },
        text: { primary: "#1A1A1E", secondary: "#6B7280", disabled: "#9CA3AF" },
        divider: "rgba(0, 0, 0, 0.08)",
        action: {
          hover: "rgba(0, 0, 0, 0.04)",
          selected: "rgba(90, 75, 209, 0.10)",
        },
      },
    },
  },
  typography: {
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13,
    h4: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" },
    h5: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" },
    body1: { fontSize: 13 },
    body2: { fontSize: 12 },
    caption: { fontSize: 11 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 8, boxShadow: "none" },
        sizeSmall: { padding: "4px 12px", fontSize: 13 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: "none",
          boxShadow: "none",
          border: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          width: 28,
          height: 28,
          color: theme.vars.palette.text.secondary,
          "& svg": { fontSize: 16 },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          backgroundColor: theme.vars.palette.action.hover,
          "& fieldset": { borderColor: theme.vars.palette.divider },
          "&:hover fieldset": { borderColor: theme.vars.palette.text.disabled },
        }),
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 40, height: 22, padding: 0 },
        switchBase: ({ theme }) => ({
          padding: 2,
          color: "#fff",
          "&.Mui-checked": {
            transform: "translateX(18px)",
            color: "#fff",
            "& + .MuiSwitch-track": {
              backgroundColor: theme.vars.palette.primary.main,
              opacity: 1,
            },
          },
        }),
        thumb: { width: 18, height: 18 },
        track: ({ theme }) => ({
          borderRadius: 11,
          backgroundColor: theme.vars.palette.text.disabled,
          opacity: 1,
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: ({ theme }) => ({ color: theme.vars.palette.primary.main }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          border: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }),
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          border: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }),
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          flex: 1,
          color: theme.vars.palette.text.secondary,
          "&.Mui-selected": {
            color: theme.vars.palette.text.primary,
            backgroundColor: theme.vars.palette.action.selected,
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          border: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }),
      },
    },
  },
});
