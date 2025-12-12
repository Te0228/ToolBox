import { useState, useEffect } from 'react'
import {
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    IconButton,
    TextField,
    Button,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import EditIcon from '@mui/icons-material/Edit'

interface Command {
    id: string
    name: string
    command: string
}

interface CommandSidebarProps {
    onCommandClick: (command: string) => void
}

const STORAGE_KEY = 'terminal-custom-commands'

const defaultCommands: Command[] = [
    { id: '1', name: 'List Files', command: 'ls -la' },
    { id: '2', name: 'Current Directory', command: 'pwd' },
    { id: '3', name: 'Git Status', command: 'git status' },
    { id: '4', name: 'Git Log', command: 'git log --oneline -10' },
    { id: '5', name: 'Node Version', command: 'node --version' },
    { id: '6', name: 'NPM Version', command: 'npm --version' },
]

export default function CommandSidebar({ onCommandClick }: CommandSidebarProps) {
    const [commands, setCommands] = useState<Command[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCommand, setEditingCommand] = useState<Command | null>(null)
    const [newCommandName, setNewCommandName] = useState('')
    const [newCommandText, setNewCommandText] = useState('')

    // Load commands from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                setCommands(JSON.parse(stored))
            } catch {
                setCommands(defaultCommands)
            }
        } else {
            setCommands(defaultCommands)
        }
    }, [])

    // Save commands to localStorage
    useEffect(() => {
        if (commands.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(commands))
        }
    }, [commands])

    const handleAddCommand = () => {
        setEditingCommand(null)
        setNewCommandName('')
        setNewCommandText('')
        setDialogOpen(true)
    }

    const handleEditCommand = (command: Command) => {
        setEditingCommand(command)
        setNewCommandName(command.name)
        setNewCommandText(command.command)
        setDialogOpen(true)
    }

    const handleSaveCommand = () => {
        if (!newCommandName.trim() || !newCommandText.trim()) return

        if (editingCommand) {
            // Edit existing command
            setCommands(commands.map(cmd =>
                cmd.id === editingCommand.id
                    ? { ...cmd, name: newCommandName, command: newCommandText }
                    : cmd
            ))
        } else {
            // Add new command
            const newCommand: Command = {
                id: Date.now().toString(),
                name: newCommandName,
                command: newCommandText,
            }
            setCommands([...commands, newCommand])
        }

        setDialogOpen(false)
        setNewCommandName('')
        setNewCommandText('')
        setEditingCommand(null)
    }

    const handleDeleteCommand = (id: string) => {
        setCommands(commands.filter(cmd => cmd.id !== id))
    }

    const handleCommandClick = (command: string) => {
        onCommandClick(command)
    }

    return (
        <>
            <Box
                sx={{
                    width: 280,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.default',
                    overflow: 'hidden',
                    height: '100%',
                }}
            >
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ mb: 1, fontSize: 16, fontWeight: 600 }}>
                        Custom Commands
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddCommand}
                        fullWidth
                        size="small"
                    >
                        Add Command
                    </Button>
                </Box>

                <List sx={{
                    flex: 1,
                    overflow: 'auto',
                    py: 0,
                    '&::-webkit-scrollbar': {
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: '#555',
                    },
                }}>
                    {commands.map((cmd) => (
                        <ListItem
                            key={cmd.id}
                            disablePadding
                            secondaryAction={
                                <Box>
                                    <Tooltip title="Edit">
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => handleEditCommand(cmd)}
                                            sx={{ mr: 0.5 }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => handleDeleteCommand(cmd.id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            }
                        >
                            <ListItemButton
                                onClick={() => handleCommandClick(cmd.command)}
                                sx={{ pr: 10 }}
                            >
                                <PlayArrowIcon sx={{ mr: 1, fontSize: 18, color: 'primary.main' }} />
                                <ListItemText
                                    primary={cmd.name}
                                    secondary={cmd.command}
                                    primaryTypographyProps={{
                                        fontSize: 14,
                                        fontWeight: 500,
                                    }}
                                    secondaryTypographyProps={{
                                        fontSize: 12,
                                        fontFamily: 'monospace',
                                        noWrap: true,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>

                {commands.length === 0 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No commands yet. Click "Add Command" to create one.
                        </Typography>
                    </Box>
                )}
            </Box>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingCommand ? 'Edit Command' : 'Add New Command'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Command Name"
                        fullWidth
                        variant="outlined"
                        value={newCommandName}
                        onChange={(e) => setNewCommandName(e.target.value)}
                        placeholder="e.g., List Files"
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="Command"
                        fullWidth
                        variant="outlined"
                        value={newCommandText}
                        onChange={(e) => setNewCommandText(e.target.value)}
                        placeholder="e.g., ls -la"
                        multiline
                        rows={3}
                        inputProps={{
                            style: { fontFamily: 'monospace' }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSaveCommand}
                        variant="contained"
                        disabled={!newCommandName.trim() || !newCommandText.trim()}
                    >
                        {editingCommand ? 'Save' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
