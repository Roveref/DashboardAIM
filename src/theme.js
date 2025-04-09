import { createTheme } from "@mui/material/styles";

// Create a theme instance with modern styling
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb", // Modern blue
      light: "#60a5fa",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#7c3aed", // Rich purple
      light: "#a78bfa",
      dark: "#5b21b6",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#b91c1c",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    info: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    grey: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#1f2937",
      secondary: "#4b5563",
      disabled: "#9ca3af",
    },
    divider: "rgba(0, 0, 0, 0.08)",
  },
  typography: {
    fontFamily:
      'Calibri, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "2.5rem",
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: "2rem",
      lineHeight: 1.2,
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.75rem",
      lineHeight: 1.2,
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
      lineHeight: 1.3,
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.5,
    },
    overline: {
      fontSize: "0.75rem",
      textTransform: "uppercase",
      fontWeight: 600,
      letterSpacing: 1,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    "none",
    "0px 1px 2px rgba(0, 0, 0, 0.05)",
    "0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)",
    "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)",
    "0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)",
    "0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f8fafc",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            width: "0.4rem",
            height: "0.4rem",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(0,0,0,0.05)",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(0,0,0,0.2)",
            borderRadius: "3px",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          textTransform: "none",
          fontWeight: 600,
          padding: "8px 16px",
          "&:hover": {
            boxShadow: "0px 2px 4px -1px rgba(0, 0, 0, 0.1)",
          },
        },
        contained: {
          boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#1a56db",
          },
        },
        containedSecondary: {
          "&:hover": {
            backgroundColor: "#6d28d9",
          },
        },
        outlined: {
          borderWidth: 1.5,
          "&:hover": {
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:
            "0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)",
          borderRadius: 12,
          transition: "box-shadow 0.3s ease-in-out",
          "&:hover": {
            boxShadow:
              "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow:
            "0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)",
          borderRadius: 12,
        },
        elevation1: {
          boxShadow:
            "0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)",
        },
        elevation2: {
          boxShadow:
            "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
        elevation3: {
          boxShadow:
            "0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(0, 0, 0, 0.06)",
          padding: "16px",
        },
        head: {
          fontWeight: 600,
          color: "#4b5563",
          backgroundColor: "#f9fafb",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": {
            borderBottom: 0,
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            "&:hover": {
              backgroundColor: "rgba(37, 99, 235, 0.12)",
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
        },
        colorSecondary: {
          backgroundColor: "#ede9fe",
          color: "#5b21b6",
        },
        colorSuccess: {
          backgroundColor: "#dcfce7",
          color: "#059669",
        },
        colorError: {
          backgroundColor: "#fee2e2",
          color: "#b91c1c",
        },
        colorWarning: {
          backgroundColor: "#fef3c7",
          color: "#d97706",
        },
        colorInfo: {
          backgroundColor: "#dbeafe",
          color: "#2563eb",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          minWidth: 100,
          padding: "12px 16px",
          "&.Mui-selected": {
            color: "#2563eb",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(0, 0, 0, 0.08)",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          "&:before": {
            display: "none",
          },
          "&.Mui-expanded": {
            margin: 0,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: "0 16px",
          "&.Mui-expanded": {
            minHeight: 48,
          },
        },
        content: {
          "&.Mui-expanded": {
            margin: "12px 0",
          },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: "0 16px 16px",
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          width: "100%",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(0, 0, 0, 0.12)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(0, 0, 0, 0.22)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2563eb",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1f2937",
          borderRadius: 6,
          fontSize: "0.75rem",
          padding: "8px 12px",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            "&:hover": {
              backgroundColor: "rgba(37, 99, 235, 0.12)",
            },
          },
        },
      },
    },
  },
});

export default theme;
