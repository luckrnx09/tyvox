import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export const KeyCap = ({ children }: { children: ReactNode }) => (
  <Box
    component="kbd"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      px: 0.75,
      py: 0.25,
      borderRadius: 0.75,
      backgroundColor: "action.hover",
      border: 1,
      borderColor: "divider",
      color: "text.primary",
      fontSize: 12,
      fontWeight: 500,
      minWidth: 24,
    }}
  >
    {children}
  </Box>
);
