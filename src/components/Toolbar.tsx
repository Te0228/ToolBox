import { AppBar, Toolbar as MuiToolbar, Typography, Button, Box } from '@mui/material'
import EditNoteIcon from '@mui/icons-material/EditNote'
import HandymanIcon from '@mui/icons-material/Handyman'
import DescriptionIcon from '@mui/icons-material/Description'

export type Tool = 'json-editor' | 'markdown-editor'

interface ToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
}

const tools = [
  { id: 'json-editor' as Tool, name: 'JSON', icon: <EditNoteIcon sx={{ fontSize: 18 }} /> },
  { id: 'markdown-editor' as Tool, name: 'Markdown', icon: <DescriptionIcon sx={{ fontSize: 18 }} /> },
]

export default function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        WebkitAppRegion: 'drag',
        paddingLeft: '80px',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <MuiToolbar variant="dense" sx={{ minHeight: 42 }}>
        <Typography
          variant="h6"
          component="div"
          sx={{
            mr: 4,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'text.primary',
            fontSize: '0.85rem',
          }}
        >
          <HandymanIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          ToolBox
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {tools.map((tool) => (
            <Button
              key={tool.id}
              startIcon={tool.icon}
              onClick={() => onToolChange(tool.id)}
              size="small"
              sx={{
                WebkitAppRegion: 'no-drag',
                color: activeTool === tool.id ? 'primary.main' : 'text.secondary',
                bgcolor: activeTool === tool.id ? 'action.selected' : 'transparent',
                fontWeight: activeTool === tool.id ? 600 : 400,
                borderRadius: 1.5,
                px: 1.5,
                '&:hover': {
                  bgcolor: activeTool === tool.id ? 'action.selected' : 'action.hover',
                },
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
