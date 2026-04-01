import { useEffect, useState, useRef } from 'react'
import {
    Drawer, Box, Typography, List, ListItem, ListItemText,
    IconButton, Divider, ListItemButton, TextField
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
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setItems(historyService.getHistory(activeTool))
    }, [activeTool, refreshTrigger])

    // Auto-focus input when entering edit mode
    useEffect(() => {
        if (editingId) {
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [editingId])

    const handleClear = () => {
        if (confirm('Clear all history for this tool?')) {
            historyService.clear(activeTool)
            setItems([])
            onClear()
        }
    }

    const startRename = (item: HistoryItem) => {
        setEditingId(item.id)
        setEditValue(item.summary || '')
    }

    const commitRename = () => {
        if (editingId) {
            historyService.rename(editingId, editValue.trim())
            setItems(historyService.getHistory(activeTool))
            setEditingId(null)
        }
    }

    const cancelRename = () => {
        setEditingId(null)
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    const getDisplayName = (item: HistoryItem) =>
        item.summary || (item.content.slice(0, 30) + (item.content.length > 30 ? '...' : ''))

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
                                        '&:hover': { bgcolor: 'action.selected' },
                                    },
                                }}
                            >
                                {editingId === item.id ? (
                                    <TextField
                                        inputRef={inputRef}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={commitRename}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitRename()
                                            if (e.key === 'Escape') cancelRename()
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        variant="standard"
                                        size="small"
                                        fullWidth
                                        placeholder="Enter name..."
                                        autoComplete="off"
                                        InputProps={{
                                            disableUnderline: true,
                                            sx: {
                                                fontSize: '0.7rem',
                                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                                py: 0,
                                            }
                                        }}
                                        sx={{ my: -0.25 }}
                                    />
                                ) : (
                                    <ListItemText
                                        primary={getDisplayName(item)}
                                        secondary={formatDate(item.timestamp)}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation()
                                            startRename(item)
                                        }}
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
                                )}
                            </ListItemButton>
                        </ListItem>
                    ))
                )}
            </List>
        </Drawer>
    )
}
