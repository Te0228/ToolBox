import { useEffect, useState } from 'react'
import {
    Drawer, Box, Typography, List, ListItem, ListItemText,
    IconButton, Divider, ListItemButton
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import AddIcon from '@mui/icons-material/Add'
import { HistoryItem, historyService } from '../utils/history'
import { Tool } from './Toolbar'

interface HistorySidebarProps {
    activeTool: Tool
    activeSessionId: string | null
    onSelect: (id: string) => void
    onNew: () => void
    onDelete: (id: string) => void
    onClear: () => void
    refreshTrigger: number
}

const drawerWidth = 240

export default function HistorySidebar({ activeTool, activeSessionId, onSelect, onNew, onDelete, onClear, refreshTrigger }: HistorySidebarProps) {
    const [items, setItems] = useState<HistoryItem[]>([])

    useEffect(() => {
        setItems(historyService.getHistory(activeTool))
    }, [activeTool, refreshTrigger])

    const handleClear = () => {
        if (confirm('Clear all history for this tool?')) {
            historyService.clear(activeTool)
            setItems([])
            onClear()
        }
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    position: 'relative',
                    height: '100%',
                    bgcolor: 'background.default',
                    border: 'none',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                },
            }}
        >
            <Box sx={{ px: 1.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    History
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <IconButton size="small" onClick={onNew} title="New" sx={{ width: 26, height: 26 }}>
                        <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    {items.length > 0 && (
                        <IconButton size="small" onClick={handleClear} title="Clear All" sx={{ width: 26, height: 26 }}>
                            <DeleteSweepIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    )}
                </Box>
            </Box>
            <Divider />
            <List dense sx={{ flex: 1, overflowY: 'auto', px: 0.5, py: 0.5 }}>
                {items.length === 0 ? (
                    <ListItem>
                        <ListItemText
                            primary="No history yet"
                            sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}
                            primaryTypographyProps={{ variant: 'caption' }}
                        />
                    </ListItem>
                ) : (
                    items.map((item) => (
                        <ListItem
                            key={item.id}
                            disablePadding
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    size="small"
                                    onClick={() => onDelete(item.id)}
                                    sx={{
                                        width: 24, height: 24,
                                        opacity: 0,
                                        transition: 'opacity 0.15s',
                                        '.MuiListItem-root:hover &': { opacity: 1 },
                                    }}
                                >
                                    <DeleteIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            }
                        >
                            <ListItemButton
                                selected={activeSessionId === item.id}
                                onClick={() => onSelect(item.id)}
                                sx={{
                                    borderRadius: 1.5,
                                    py: 0.75,
                                    px: 1,
                                    '&.Mui-selected': {
                                        bgcolor: 'action.selected',
                                        '&:hover': {
                                            bgcolor: 'action.selected',
                                        },
                                    },
                                }}
                            >
                                <ListItemText
                                    primary={item.summary || (item.content.slice(0, 30) + (item.content.length > 30 ? '...' : ''))}
                                    secondary={formatDate(item.timestamp)}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        sx: {
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                            fontSize: '0.7rem',
                                            fontWeight: activeSessionId === item.id ? 600 : 400,
                                            color: activeSessionId === item.id ? 'primary.main' : 'text.primary',
                                        }
                                    }}
                                    secondaryTypographyProps={{
                                        variant: 'caption',
                                        sx: { fontSize: '0.65rem', color: 'text.secondary' }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))
                )}
            </List>
        </Drawer>
    )
}
