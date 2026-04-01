import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { Box, Button, Stack, Paper, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CompareIcon from '@mui/icons-material/Compare'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { ToolHandle } from '../../types/tool'
import { baseEditorOptions } from '../../utils/editorConfig'

interface JsonDiffProps {
  initialContent?: string | null
}

type ViewMode = 'edit' | 'diff'

const JsonDiff = forwardRef<ToolHandle, JsonDiffProps>(({ initialContent }, ref) => {
  const [original, setOriginal] = useState(initialContent || '')
  const [modified, setModified] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const leftEditorRef = useRef<any>(null)
  const rightEditorRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getContent: () => original,
    clearContent: () => {
      setOriginal('')
      setModified('')
    }
  }))

  useEffect(() => {
    if (initialContent) {
      setOriginal(initialContent)
    }
  }, [initialContent])

  const isValidJson = useCallback((text: string): boolean => {
    if (!text.trim()) return true
    try {
      JSON.parse(text)
      return true
    } catch {
      return false
    }
  }, [])

  const formatJson = useCallback((text: string): string => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }, [])

  const handleFormatBoth = useCallback(() => {
    setOriginal(prev => formatJson(prev))
    setModified(prev => formatJson(prev))
  }, [formatJson])

  const handleSwap = useCallback(() => {
    const temp = original
    setOriginal(modified)
    setModified(temp)
  }, [original, modified])

  const editorOptions = {
    ...baseEditorOptions,
    lineNumbers: 'on' as const,
  }

  const originalValid = isValidJson(original)
  const modifiedValid = isValidJson(modified)

  const toolbarButtonSx = {
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 500,
    px: 1,
    py: 0.25,
    minWidth: 0,
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  }

  const viewButtonSx = (mode: ViewMode) => ({
    ...toolbarButtonSx,
    ...(viewMode === mode && { color: 'primary.main', bgcolor: 'action.selected' }),
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 1,
        py: 0.5,
      }}>
        <Stack direction="row" spacing={0.25}>
          <Button onClick={() => setViewMode('edit')} size="small" sx={viewButtonSx('edit')} startIcon={<EditIcon sx={{ fontSize: '16px !important' }} />}>
            Edit
          </Button>
          <Button onClick={() => setViewMode('diff')} size="small" sx={viewButtonSx('diff')} startIcon={<CompareIcon sx={{ fontSize: '16px !important' }} />}>
            Diff
          </Button>
        </Stack>

        <Stack direction="row" spacing={0.25}>
          <Button
            onClick={handleFormatBoth}
            size="small"
            sx={toolbarButtonSx}
            startIcon={<FormatAlignLeftIcon sx={{ fontSize: '16px !important' }} />}
          >
            Format Both
          </Button>
          <Button
            onClick={handleSwap}
            size="small"
            sx={toolbarButtonSx}
            startIcon={<SwapHorizIcon sx={{ fontSize: '16px !important' }} />}
          >
            Swap
          </Button>
        </Stack>
      </Box>

      {/* Editor area */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {viewMode === 'edit' && (
          <>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ px: 1, py: 0.25, color: 'text.secondary', fontSize: '0.65rem', bgcolor: 'background.default' }}>
                Original
              </Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={original}
                  onChange={(value) => setOriginal(value || '')}
                  options={editorOptions}
                  theme="vs"
                  onMount={(editor) => {
                    leftEditorRef.current = editor
                    setTimeout(() => editor.focus(), 100)
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ px: 1, py: 0.25, color: 'text.secondary', fontSize: '0.65rem', bgcolor: 'background.default' }}>
                Modified
              </Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={modified}
                  onChange={(value) => setModified(value || '')}
                  options={editorOptions}
                  theme="vs"
                  onMount={(editor) => {
                    rightEditorRef.current = editor
                  }}
                />
              </Box>
            </Box>
          </>
        )}
        {viewMode === 'diff' && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DiffEditor
              height="100%"
              language="json"
              original={original}
              modified={modified}
              theme="vs"
              options={{
                ...editorOptions,
                readOnly: true,
                renderSideBySide: true,
              }}
            />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Paper
        square
        elevation={0}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1.5,
          py: 0.25,
          bgcolor: 'background.default',
          borderTop: '1px solid',
          borderColor: 'divider',
          height: 32,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.65rem' }}>
          JSON Diff
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" sx={{
            color: originalValid ? 'text.secondary' : 'error.main',
            fontSize: '0.65rem',
          }}>
            Original: {original.trim() ? (originalValid ? 'Valid' : 'Invalid') : 'Empty'}
          </Typography>
          <Typography variant="caption" sx={{
            color: modifiedValid ? 'text.secondary' : 'error.main',
            fontSize: '0.65rem',
            minWidth: 80,
            textAlign: 'right',
          }}>
            Modified: {modified.trim() ? (modifiedValid ? 'Valid' : 'Invalid') : 'Empty'}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
})

JsonDiff.displayName = 'JsonDiff'

export default JsonDiff
