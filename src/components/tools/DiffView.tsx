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
  currentContent: string
  language: string
  toolId: string
  activeSessionId: string | null
  onClose: () => void
  pasteTransform?: (text: string) => string
}

export default function DiffView({ currentContent, language, toolId, activeSessionId, onClose, pasteTransform }: DiffViewProps) {
  const [original, setOriginal] = useState('')
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('')
  const [mode, setMode] = useState<'edit' | 'diff'>('edit')
  const originalEditorRef = useRef<any>(null)

  const historyItems = historyService.getHistory(toolId)

  const handleHistorySelect = (id: string) => {
    setSelectedHistoryId(id)
    if (id === '') {
      setOriginal('')
      setMode('edit')
      return
    }
    const item = historyService.getById(id)
    if (item) {
      setOriginal(item.content)
      setMode('diff')
    }
  }

  const getHistoryLabel = (item: HistoryItem) => {
    if (item.summary) return item.summary
    const preview = item.content.slice(0, 40).replace(/\n/g, ' ')
    return preview + (item.content.length > 40 ? '...' : '')
  }

  const handleSwap = () => {
    setOriginal(currentContent)
    setSelectedHistoryId('')
  }

  const formatOriginal = () => {
    if (language !== 'json') return
    try { setOriginal(JSON.stringify(JSON.parse(original), null, 2)) } catch { /* ignore */ }
  }

  const btnSx = { minWidth: 0, px: 1.5, fontSize: '0.7rem' }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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

          {/* History selector — always visible */}
          {historyItems.length > 0 && (
            <Select
              value={selectedHistoryId}
              onChange={(e) => handleHistorySelect(e.target.value)}
              variant="standard"
              displayEmpty
              disableUnderline
              sx={{ fontSize: '0.7rem', maxWidth: 200 }}
              renderValue={(v) => {
                if (!v) return <Typography variant="caption" sx={{ color: 'text.secondary' }}>Select version...</Typography>
                const idx = historyItems.findIndex((h: HistoryItem) => h.id === v)
                const item = idx >= 0 ? historyItems[idx] : null
                return item ? <Typography variant="caption" noWrap>#{idx + 1} {getHistoryLabel(item)}</Typography> : ''
              }}
            >
              <MenuItem value="" sx={{ fontSize: '0.75rem' }}><em>Manual input</em></MenuItem>
              {historyItems.map((item: HistoryItem, index: number) => {
                const isCurrent = item.id === activeSessionId
                return (
                  <MenuItem key={item.id} value={item.id} disabled={isCurrent} sx={{ fontSize: '0.75rem' }}>
                    <Typography variant="caption" noWrap sx={{ maxWidth: 200, color: isCurrent ? 'text.disabled' : 'inherit' }}>
                      #{index + 1} {getHistoryLabel(item)}{isCurrent ? ' (current)' : ''}
                    </Typography>
                  </MenuItem>
                )
              })}
            </Select>
          )}

          <Stack direction="row" spacing={0.5}>
            <Button size="small" variant={mode === 'edit' ? 'contained' : 'outlined'} onClick={() => setMode('edit')} sx={btnSx}>
              Edit
            </Button>
            <Button size="small" variant={mode === 'diff' ? 'contained' : 'outlined'} onClick={() => setMode('diff')} sx={btnSx}>
              Diff
            </Button>
          </Stack>

          {mode === 'edit' && language === 'json' && (
            <Button size="small" variant="outlined" onClick={formatOriginal} sx={btnSx}>Format</Button>
          )}
          <Button size="small" variant="outlined" startIcon={<SwapHorizIcon sx={{ fontSize: '14px !important' }} />} onClick={handleSwap} sx={btnSx}>
            Swap
          </Button>
        </Stack>

        <Button size="small" variant="outlined" startIcon={<CloseIcon sx={{ fontSize: '14px !important' }} />} onClick={onClose} sx={btnSx}>
          Close
        </Button>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
        {mode === 'diff' ? (
          <Box sx={{ flex: 1, minHeight: 0 }}>
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
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
              <Box sx={{ px: 1, py: 0.5, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Original</Typography>
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
            ? original ? 'Diff view (read-only)' : 'Select a history version or switch to Edit to paste content'
            : original ? 'Switch to Diff to see highlighted changes' : 'Select a version above or paste content on the left'}
        </Typography>
      </Paper>
    </Box>
  )
}
