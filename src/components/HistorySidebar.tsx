import { useEffect, useState } from 'react'
import {
    Drawer, Box, Typography, List, ListItem, ListItemText,
    IconButton, Divider, ListItemButton, alpha
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import AddIcon from '@mui/icons-material/Add'
import { HistoryItem, historyService } from '../utils/history'

interface HistorySidebarProps {
    activeTool: string
    activeSessionId: string | null
    onSelect: (id: string) => void
    onNew: () => void
    onDelete: (id: string) => void
    refreshTrigger: number
}

const drawerWidth = 250

export default function HistorySidebar({ activeTool, activeSessionId, onSelect, onNew, onDelete, refreshTrigger }: HistorySidebarProps) {
    const [items, setItems] = useState<HistoryItem[]>([])

    useEffect(() => {
        const loadHistory = async () => {
            await historyService.init()
            setItems(historyService.getHistory(activeTool))
        }
        loadHistory()
    }, [activeTool, refreshTrigger])

    const handleClear = () => {
        if (confirm('Are you sure you want to clear all history for this tool?')) {
            historyService.clear(activeTool)
            setItems([])
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
                    borderRight: '1px solid rgba(0, 0, 0, 0.12)'
                },
            }}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" fontWeight="bold">History</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={onNew} title="New">
                        <AddIcon fontSize="small" />
                    </IconButton>
                    {items.length > 0 && (
                        <IconButton size="small" onClick={handleClear} title="Clear All">
                            <DeleteSweepIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </Box>
            <Divider />
            <List dense sx={{ flex: 1, overflowY: 'auto' }}>
                {items.length === 0 ? (
                    <ListItem>
                        <ListItemText
                            primary="No history yet"
                            sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}
                        />
                    </ListItem>
                ) : (
                    items.map((item) => (
                        <ListItem
                            key={item.id}
                            disablePadding
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" size="small" onClick={() => onDelete(item.id)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            }
                        >
                            <ListItemButton
                                selected={activeSessionId === item.id}
                                onClick={() => onSelect(item.id)}
                                sx={{
                                    borderLeft: '3px solid transparent',
                                    '&.Mui-selected': {
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                        borderLeftColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                        },
                                        '& .MuiListItemText-secondary': {
                                            color: (theme) => alpha(theme.palette.primary.main, 0.8)
                                        }
                                    }
                                }}
                            >
                                <ListItemText
                                    primary={item.summary || (item.content.slice(0, 30) + (item.content.length > 30 ? '...' : ''))}
                                    secondary={formatDate(item.timestamp)}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        style: {
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontFamily: 'monospace',
                                            fontWeight: activeSessionId === item.id ? 600 : 400
                                        }
                                    }}
                                    secondaryTypographyProps={{
                                        variant: 'caption',
                                        style: { fontSize: '0.7rem' }
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
