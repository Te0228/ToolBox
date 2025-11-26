import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Button, Select, MenuItem, Typography, Stack, Paper } from '@mui/material'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import CompressIcon from '@mui/icons-material/Compress'
import { ToolHandle } from '../../types/tool'

interface JsonEditorProps {
  initialContent?: string | null
}

const JsonEditor = forwardRef<ToolHandle, JsonEditorProps>(({ initialContent }, ref) => {
  const [content, setContent] = useState(initialContent || '')
  const [error, setError] = useState<string | null>(null)
  const [indentSize, setIndentSize] = useState(2)
  const [isValidating, setIsValidating] = useState(false)

  useImperativeHandle(ref, () => ({
    getContent: () => content,
    clearContent: () => {
      setContent('')
      setError(null)
    }
  }))

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent)
    }
  }, [initialContent])

  // 验证JSON格式
  const validateJson = useCallback((jsonString: string) => {
    if (!jsonString.trim()) {
      setError(null)
      return true
    }

    try {
      JSON.parse(jsonString)
      setError(null)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON'
      setError(errorMessage)
      return false
    }
  }, [])

  // 延迟验证
  useEffect(() => {
    if (isValidating) {
      const timer = setTimeout(() => {
        validateJson(content)
        setIsValidating(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [content, isValidating, validateJson])

  const handleContentChange = (value: string | undefined) => {
    const newValue = value || ''
    setContent(newValue)
    setIsValidating(true)
  }

  const handleFormat = () => {
    if (!content.trim()) return

    try {
      const parsed = JSON.parse(content)
      const formatted = JSON.stringify(parsed, null, indentSize)
      setContent(formatted)
      setError(null)
    } catch (err) {
      // Error already handled by validation
    }
  }

  const handleMinify = () => {
    if (!content.trim()) return

    try {
      const parsed = JSON.parse(content)
      const minified = JSON.stringify(parsed)
      setContent(minified)
      setError(null)
    } catch (err) {
      // Error already handled by validation
    }
  }

  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    automaticLayout: true,
    fontFamily: "'Fira Code', monospace",
    fontSize: 14,
    tabSize: indentSize,
    formatOnPaste: true,
    formatOnType: true,
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        p: 1,
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider'
      }}>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FormatAlignLeftIcon />}
            onClick={handleFormat}
            size="small"
          >
            Format
          </Button>
          <Button
            variant="outlined"
            startIcon={<CompressIcon />}
            onClick={handleMinify}
            size="small"
          >
            Minify
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          defaultLanguage="json"
          value={content}
          onChange={handleContentChange}
          options={{
            ...editorOptions,
            contextmenu: true, // Ensure context menu is enabled
          }}
          onMount={(editor, monaco) => {
            // Add paste command (Cmd+V / Ctrl+V)
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
                // Fallback to default paste if electron require fails
                editor.trigger('keyboard', 'paste', null);
              }
            });

            // Focus editor on mount
            editor.focus();
          }}
        />
      </Box>

      <Paper
        square
        elevation={0}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 0.5,
          px: 2,
          bgcolor: error ? '#fff5f5' : 'background.default',
          borderTop: 1,
          borderColor: error ? '#e74c3c' : 'divider',
          borderTopWidth: error ? 2 : 1,
          height: 36
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            color: error ? 'error.main' : 'success.main',
            fontWeight: 600
          }}
        >
          {error ? `🚫 ${error}` : content.trim() ? '✓ Valid JSON' : 'Ready'}
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">Indent:</Typography>
            <Select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              variant="standard"
              disableUnderline
              sx={{ fontSize: 12 }}
            >
              <MenuItem value={2}>2 Spaces</MenuItem>
              <MenuItem value={4}>4 Spaces</MenuItem>
              <MenuItem value={8}>8 Spaces</MenuItem>
            </Select>
          </Box>
          <Typography variant="caption" sx={{ minWidth: 80, textAlign: 'right' }}>
            Length: {content.length}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
})

export default JsonEditor
