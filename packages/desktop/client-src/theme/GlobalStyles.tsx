import GlobalStyles from "@mui/material/GlobalStyles";

export const AppGlobalStyles = () => (
  <GlobalStyles
    styles={(theme) => ({
      "*, *::before, *::after": { margin: 0, padding: 0, boxSizing: "border-box" },
      "html, body, #root": { width: "100%", height: "100%" },
      body: {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        overflow: "hidden",
        userSelect: "none",
        background: "transparent",
      },
      "::-webkit-scrollbar": { width: 8, height: 8 },
      "::-webkit-scrollbar-thumb": {
        backgroundColor: theme.vars!.palette.text.disabled,
        borderRadius: 4,
      },
      "::-webkit-scrollbar-track": { backgroundColor: "transparent" },
    })}
  />
);
