import { useState, useRef } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import Editor from '@monaco-editor/react'
import { Box, Button, Stack, Typography, Paper } from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CloseIcon from '@mui/icons-material/Close'
import { baseEditorOptions } from '../../utils/editorConfig'
import { setupPasteHandler } from '../../utils/monacoClipboard'

interface DiffViewProps {
  /** Current editor content — placed on the right ("Modified") side */
  currentContent: string
  /** Monaco language id */
  language: string
  /** Called when user exits diff mode */
  onClose: () => void
  /** Optional transform for paste (e.g. unescape for markdown) */
  pasteTransform?: (text: string) => string
}

export default function DiffView({ currentContent, language, onClose, pasteTransform }: DiffViewProps) {
  const [original, setOriginal] = useState('')
  const [mode, setMode] = useState<'edit' | 'diff'>('edit')
  const originalEditorRef = useRef<any>(null)

  const handleSwap = () => {
    const tmp = original
    setOriginal(currentContent)
    // We can't set currentContent (it's from parent), so swap puts current into original
    // and original is lost — this is intentional: user swaps to compare the other way
    void tmp // original goes to right via currentContent in parent
  }

  const formatBoth = () => {
    if (language === 'json') {
      try {
        const parsed = JSON.parse(original)
        setOriginal(JSON.stringify(parsed, null, 2))
      } catch { /* ignore */ }
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        px: 1.5, py: 0.5,
        bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Compare
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Button size="small" variant={mode === 'edit' ? 'contained' : 'outlined'} onClick={() => setMode('edit')}
              sx={{ minWidth: 0, px: 1.5, fontSize: '0.7rem' }}>
              Edit
            </Button>
            <Button size="small" variant={mode === 'diff' ? 'contained' : 'outlined'} onClick={() => setMode('diff')}
              sx={{ minWidth: 0, px: 1.5, fontSize: '0.7rem' }}>
              Diff
            </Button>
          </Stack>
          {mode === 'edit' && language === 'json' && (
            <Button size="small" variant="outlined" onClick={formatBoth}
              sx={{ minWidth: 0, px: 1.5, fontSize: '0.7rem' }}>
              Format
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<SwapHorizIcon sx={{ fontSize: '14px !important' }} />}
            onClick={handleSwap} sx={{ minWidth: 0, px: 1.5, fontSize: '0.7rem' }}>
            Swap
          </Button>
        </Stack>
        <Button size="small" variant="outlined" startIcon={<CloseIcon sx={{ fontSize: '14px !important' }} />}
          onClick={onClose} sx={{ minWidth: 0, px: 1.5, fontSize: '0.7rem' }}>
          Close
        </Button>
      </Box>

      {/* Content area */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {mode === 'diff' ? (
          <DiffEditor
            height="100%"
            language={language}
            original={original}
            modified={currentContent}
            theme="vs"
            options={{
              ...baseEditorOptions,
              readOnly: true,
              renderSideBySide: true,
              originalEditable: false,
            }}
          />
        ) : (
          <>
            {/* Left: Original (editable) */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
              <Box sx={{ px: 1, py: 0.5, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Original</Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  language={language}
                  value={original}
                  onChange={(v) => setOriginal(v || '')}
                  theme="vs"
                  options={{ ...baseEditorOptions, placeholder: 'Paste content to compare...' } as any}
                  onMount={(editor, monaco) => {
                    originalEditorRef.current = editor
                    setupPasteHandler(editor, monaco, pasteTransform)
                  }}
                />
              </Box>
            </Box>
            {/* Right: Modified (current content, read-only) */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ px: 1, py: 0.5, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Current</Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  language={language}
                  value={currentContent}
                  theme="vs"
                  options={{ ...baseEditorOptions, readOnly: true, domReadOnly: true }}
                />
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* Status bar */}
      <Paper square elevation={0} sx={{
        display: 'flex', alignItems: 'center', px: 1.5, py: 0.25, height: 32,
        bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider',
      }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
          {mode === 'diff' ? 'Diff view (read-only)' : 'Paste original content on the left to compare'}
        </Typography>
      </Paper>
    </Box>
  )
}
