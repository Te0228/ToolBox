import { AppBar, Toolbar as MuiToolbar, Typography, Button, Box } from '@mui/material'
import EditNoteIcon from '@mui/icons-material/EditNote'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import ChatIcon from '@mui/icons-material/Chat'
import LockIcon from '@mui/icons-material/Lock'
import TerminalIcon from '@mui/icons-material/Terminal'
import HandymanIcon from '@mui/icons-material/Handyman'

export type Tool = 'json-editor' | 'json-string-to-json' | 'json-to-json-string' | 'terminal' | 'chat' | 'placeholder'

interface ToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
}

const tools = [
  { id: 'json-editor' as Tool, name: 'JSON Editor', icon: <EditNoteIcon /> },
  { id: 'json-string-to-json' as Tool, name: 'String → JSON', icon: <LockOpenIcon /> },
  { id: 'json-to-json-string' as Tool, name: 'JSON → String', icon: <LockIcon /> },
  { id: 'chat' as Tool, name: 'Chat Assistant', icon: <ChatIcon /> },
  { id: 'terminal' as Tool, name: 'Terminal', icon: <TerminalIcon /> },
]

export default function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <AppBar
      position="static"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        WebkitAppRegion: 'drag',
        paddingLeft: '80px' // Space for traffic lights
      }}
    >
      <MuiToolbar variant="dense">
        <Typography variant="h6" component="div" sx={{ mr: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HandymanIcon sx={{ fontSize: 28 }} />
          Dev Toolbox
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, height: '100%' }}>
          {tools.map((tool) => (
            <Button
              key={tool.id}
              color="inherit"
              startIcon={tool.icon}
              onClick={() => onToolChange(tool.id)}
              sx={{
                WebkitAppRegion: 'no-drag',
                opacity: activeTool === tool.id ? 1 : 0.7,
                borderBottom: activeTool === tool.id ? '2px solid white' : '2px solid transparent',
                borderRadius: 0,
                '&:hover': { opacity: 1 }
              }}
            >
              {tool.name}
            </Button>
          ))}
        </Box>
      </MuiToolbar>
    </AppBar>
  )
}

