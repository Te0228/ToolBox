import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Typography, Paper, Stack, IconButton } from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { ToolHandle } from '../../types/tool'

interface JsonStringToJsonProps {
    initialContent?: string | null
}

const JsonStringToJson = forwardRef<ToolHandle, JsonStringToJsonProps>(({ initialContent }, ref) => {
    const [input, setInput] = useState(initialContent || '')
    const [output, setOutput] = useState('')
    const [error, setError] = useState<string | null>(null);
    const [inputCollapsed, setInputCollapsed] = useState(false);

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
            setInput(initialContent);
            handleConvert(initialContent);
        }
    }, [initialContent]);

    const toggleInput = () => setInputCollapsed(prev => !prev);

    const handleConvert = (value: string) => {
        if (!value.trim()) {
            setOutput('');
            setError(null);
            return;
        }
        try {
            let parsed = JSON.parse(value);
            if (typeof parsed === 'string') {
                try {
                    const doubleParsed = JSON.parse(parsed);
                    parsed = doubleParsed;
                } catch (e) {
                    // It was just a string
                }
            }
            setOutput(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Invalid JSON String';
            setError(errorMessage);
            setOutput('');
        }
    };

    const handleInputChange = (value: string | undefined) => {
        const newValue = value || ''
        setInput(newValue);
        handleConvert(newValue);
    };

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
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                bgcolor: 'background.default',
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Typography variant="subtitle1" fontWeight="bold">JSON String to JSON</Typography>
                <IconButton size="small" onClick={toggleInput} title={inputCollapsed ? 'Expand Input' : 'Collapse Input'}>
                    {inputCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                </IconButton>
            </Box>

            <Stack direction="row" sx={{ flex: 1, overflow: 'hidden' }}>
                <Box sx={{ width: inputCollapsed ? '0px' : '50%', display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider', transition: 'width 0.3s ease', overflow: 'hidden' }}>
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', minWidth: '300px' }}>
                        <Box sx={{ p: 1, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="caption" fontWeight="bold">Input (Escaped String)</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <Editor
                                height="100%"
                                defaultLanguage="text"
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
                        <Typography variant="caption" fontWeight="bold">Output (JSON)</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={output}
                            theme="vs"
                            options={{
                                ...commonEditorOptions,
                                readOnly: true,
                                domReadOnly: true,
                            }}
                        />
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

export default JsonStringToJson
