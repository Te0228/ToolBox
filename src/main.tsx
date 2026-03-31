import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import App from './App.tsx'
import './index.css'

loader.config({ monaco })

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5B5BD6',      // Muted indigo — Linear-inspired
      light: '#7B7BE8',
      dark: '#4343B0',
    },
    success: {
      main: '#30A46C',
    },
    error: {
      main: '#E5484D',
    },
    background: {
      default: '#F8F8FA',    // Warm off-white
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C2024',    // Near-black
      secondary: '#60646C',  // Soft gray
    },
    divider: 'rgba(0,0,0,0.08)',
    action: {
      hover: 'rgba(0,0,0,0.04)',
      selected: 'rgba(91,91,214,0.08)',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
    fontSize: 13,
    h6: {
      fontSize: '0.95rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontSize: '0.8rem',
      fontWeight: 600,
      letterSpacing: '-0.005em',
    },
    body2: {
      fontSize: '0.8rem',
    },
    caption: {
      fontSize: '0.7rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: 'rgba(0,0,0,0.12)',
          color: '#1C2024',
          '&:hover': {
            borderColor: 'rgba(0,0,0,0.2)',
            backgroundColor: 'rgba(0,0,0,0.03)',
          },
        },
        sizeSmall: {
          fontSize: '0.75rem',
          padding: '3px 10px',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          fontSize: '0.75rem',
          padding: '3px 10px',
          borderColor: 'rgba(0,0,0,0.12)',
          color: '#60646C',
          '&.Mui-selected': {
            backgroundColor: 'rgba(91,91,214,0.1)',
            color: '#5B5BD6',
            borderColor: 'rgba(91,91,214,0.3)',
            '&:hover': {
              backgroundColor: 'rgba(91,91,214,0.15)',
            },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          gap: 1,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          color: '#60646C',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.05)',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '1px 4px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(91,91,214,0.08)',
          },
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
