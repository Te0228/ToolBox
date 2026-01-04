import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Button, Typography, Paper, Stack, IconButton } from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { ToolHandle } from '../../types/tool'

interface JsonToJsonStringProps {
    initialContent?: string | null
}

const JsonToJsonString = forwardRef<ToolHandle, JsonToJsonStringProps>(({ initialContent }, ref) => {
    const [input, setInput] = useState(initialContent || '')
    const [output, setOutput] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [inputCollapsed, setInputCollapsed] = useState(false)

    useImperativeHandle(ref, () => ({
        getContent: () => input,
        clearContent: () => {
            setInput('')
            setOutput('')
            setError(null)
        }
    }))

    useEffect(() => {
        if (initialContent) {
            setInput(initialContent)
            handleConvert(initialContent)
        }
    }, [initialContent])

    const toggleInput = () => setInputCollapsed(prev => !prev)

    const handleConvert = (value: string) => {
        if (!value.trim()) {
            setOutput('')
            setError(null)
            return
        }

        try {
            // Validate JSON first
            const parsed = JSON.parse(value)
            // Stringify to get the string representation
            setOutput(JSON.stringify(JSON.stringify(parsed)))
            setError(null)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Invalid JSON'
            setError(errorMessage)
            setOutput('')
        }
    }

    const handleInputChange = (value: string | undefined) => {
        const newValue = value || ''
        setInput(newValue)
        handleConvert(newValue)
    }

    const handleCopyOutput = () => {
        if (output) {
            navigator.clipboard.writeText(output)
        }
    }

    const commonEditorOptions = {
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on' as const,
        automaticLayout: true,
        fontFamily: "'Fira Code', monospace",
        fontSize: 14,
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight="bold">JSON to JSON String</Typography>
                <IconButton size="small" onClick={toggleInput} title={inputCollapsed ? 'Expand Input' : 'Collapse Input'}>
                    {inputCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                </IconButton>
            </Box>

            <Stack direction="row" sx={{ flex: 1, overflow: 'hidden' }}>
                <Box sx={{ width: inputCollapsed ? '0px' : '50%', display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider', transition: 'width 0.3s ease', overflow: 'hidden' }}>
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', minWidth: '300px' }}>
                        <Box sx={{ p: 1, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="caption" fontWeight="bold">Input (JSON)</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                value={input}
                                onChange={handleInputChange}
                                theme="vs"
                                options={{
                                    ...commonEditorOptions,
                                    contextmenu: true,
                                }}
                                onMount={(editor, monaco) => {
                                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
                                        try {
                                            const text = window.require('electron').clipboard.readText();
                                            const selection = editor.getSelection();
                                            if (selection) {
                                                editor.executeEdits('paste', [{
                                                    range: selection,
                                                    text: text,
                                                    forceMoveMarkers: true
                                                }]);
                                            }
                                        } catch (e) {
                                            console.error('Failed to read from clipboard:', e);
                                            editor.trigger('keyboard', 'paste', null);
                                        }
                                    });
                                }}
                            />
                        </Box>
                    </Box>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ p: 1, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight="bold">Output (Escaped String)</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="text"
                            value={output}
                            theme="vs"
                            options={{
                                ...commonEditorOptions,
                                readOnly: true,
                                domReadOnly: true,
                            }}
                        />
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyOutput} disabled={!output} size="small">
                            Copy Output
                        </Button>
                    </Box>
                </Box>
            </Stack>

            {error && (
                <Paper
                    square
                    elevation={0}
                    sx={{
                        p: 1,
                        px: 2,
                        bgcolor: '#fff5f5',
                        borderTop: 2,
                        borderColor: 'error.main',
                    }}
                >
                    <Typography variant="caption" color="error.main" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        Error: {error}
                    </Typography>
                </Paper>
            )}
        </Box>
    )
})

export default JsonToJsonString
