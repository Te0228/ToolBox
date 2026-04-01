import { useState, useRef } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import Editor from '@monaco-editor/react'
import { Box, Button, Stack, Typography, Paper, Select, MenuItem } from '@mui/material'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CloseIcon from '@mui/icons-material/Close'
import { baseEditorOptions } from '../../utils/editorConfig'
import { setupPasteHandler } from '../../utils/monacoClipboard'
import { HistoryItem, historyService } from '../../utils/history'

interface DiffViewProps {
  /** Current editor content — placed on the right ("Current") side */
  currentContent: string
  /** Monaco language id */
  language: string
  /** Tool id for loading history items */
  toolId: string
  /** Currently active session id (excluded from the dropdown) */
  activeSessionId: string | null
  /** Called when user exits diff mode */
  onClose: () => void
  /** Optional transform for paste (e.g. unescape for markdown) */
  pasteTransform?: (text: string) => string
}

export default function DiffView({ currentContent, language, toolId, activeSessionId, onClose, pasteTransform }: DiffViewProps) {
  const [original, setOriginal] = useState('')
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('')
  const [mode, setMode] = useState<'edit' | 'diff'>('diff')
  const originalEditorRef = useRef<any>(null)

  // Get history items for the dropdown (exclude the current session)
  const historyItems = historyService.getHistory(toolId)
    .filter((item: HistoryItem) => item.id !== activeSessionId)

  const handleHistorySelect = (id: string) => {
    setSelectedHistoryId(id)
    if (id === '') {
      setOriginal('')
      return
    }
    const item = historyService.getById(id)
    if (item) {
      setOriginal(item.content)
    }
  }

  const getHistoryLabel = (item: HistoryItem) => {
    if (item.summary) return item.summary
    const preview = item.content.slice(0, 40).replace(/\n/g, ' ')
    return preview + (item.content.length > 40 ? '...' : '')
  }

  const handleSwap = () => {
    const tmp = original
    setOriginal(currentContent)
    void tmp
  }

  const formatOriginal = () => {
    if (language === 'json') {
      try {
        setOriginal(JSON.stringify(JSON.parse(original), null, 2))
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
            <Button size="small" variant="outlined" onClick={formatOriginal}
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
            {/* Left: Original */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
              <Box sx={{
                px: 1, py: 0.5, bgcolor: 'background.default',
                borderBottom: 1, borderColor: 'divider',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Original</Typography>
                {historyItems.length > 0 && (
                  <Select
                    value={selectedHistoryId}
                    onChange={(e) => handleHistorySelect(e.target.value)}
                    variant="standard"
                    displayEmpty
                    disableUnderline
                    sx={{ fontSize: '0.7rem', maxWidth: 180 }}
                    renderValue={(v) => {
                      if (!v) return <Typography variant="caption" sx={{ color: 'text.secondary' }}>Select from history...</Typography>
                      const item = historyItems.find((h: HistoryItem) => h.id === v)
                      return item ? <Typography variant="caption" noWrap>{getHistoryLabel(item)}</Typography> : ''
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: '0.75rem' }}><em>Manual input</em></MenuItem>
                    {historyItems.map((item: HistoryItem) => (
                      <MenuItem key={item.id} value={item.id} sx={{ fontSize: '0.75rem' }}>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                          {getHistoryLabel(item)}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </Box>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  language={language}
                  value={original}
                  onChange={(v) => { setOriginal(v || ''); setSelectedHistoryId('') }}
                  theme="vs"
                  options={baseEditorOptions}
                  onMount={(editor, monaco) => {
                    originalEditorRef.current = editor
                    setupPasteHandler(editor, monaco, pasteTransform)
                  }}
                />
              </Box>
            </Box>
            {/* Right: Current (read-only) */}
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
          {mode === 'diff'
            ? 'Diff view (read-only)'
            : original
              ? 'Comparing — switch to Diff view to see highlighted changes'
              : 'Select a history version or paste content on the left'}
        </Typography>
      </Paper>
    </Box>
  )
}
