import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Button, Stack, Paper, Typography } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CodeIcon from '@mui/icons-material/Code'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import DiffView from './DiffView'
import { ToolHandle } from '../../types/tool'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { setupPasteHandler } from '../../utils/monacoClipboard'
import { unescapeJsonString } from '../../utils/stringUtils'
import { baseEditorOptions } from '../../utils/editorConfig'

interface MarkdownEditorProps {
  initialContent?: string | null
  activeSessionId?: string | null
}

type ViewMode = 'edit' | 'preview' | 'split'

const editorOptions = {
  ...baseEditorOptions,
  lineNumbers: 'on' as const,
}

const markdownStyles = {
  '& h1': { fontSize: '2em', fontWeight: 'bold', mt: 2, mb: 1 },
  '& h2': { fontSize: '1.5em', fontWeight: 'bold', mt: 2, mb: 1 },
  '& h3': { fontSize: '1.25em', fontWeight: 'bold', mt: 1.5, mb: 0.75 },
  '& p': { mb: 1, lineHeight: 1.6 },
  '& code': {
    bgcolor: 'rgba(91,91,214,0.08)',
    color: '#5B5BD6',
    px: 0.5, py: 0.25,
    borderRadius: 0.5,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '0.85em',
  },
  '& pre': { mb: 2, borderRadius: 1, overflow: 'auto' },
  '& pre code': { bgcolor: 'transparent', color: 'inherit', p: 0 },
  '& ul, & ol': { pl: 3, mb: 1 },
  '& blockquote': {
    borderLeft: '4px solid',
    borderColor: 'primary.main',
    pl: 2, ml: 0,
    fontStyle: 'italic',
    color: 'text.secondary',
  },
  '& table': { borderCollapse: 'collapse', width: '100%', mb: 2 },
  '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1, py: 0.5, textAlign: 'left' },
  '& th': { bgcolor: 'action.hover', fontWeight: 'bold' },
  '& a': { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
  '& img': { maxWidth: '100%', height: 'auto' },
} as const

const MarkdownEditor = forwardRef<ToolHandle, MarkdownEditorProps>(({ initialContent, activeSessionId }, ref) => {
  const [content, setContent] = useState(initialContent || '')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [copied, setCopied] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const editorRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getContent: () => content,
    clearContent: () => setContent(''),
  }))

  useEffect(() => {
    if (initialContent) setContent(initialContent)
  }, [initialContent])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleUnescape = () => {
    if (!content.trim()) return
    setContent(unescapeJsonString(content))
  }

  const toolbarButtonSx = {
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 500,
    px: 1, py: 0.25, minWidth: 0,
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  }

  const viewButtonSx = (mode: ViewMode) => ({
    ...toolbarButtonSx,
    ...(viewMode === mode && !showDiff && { color: 'primary.main', bgcolor: 'action.selected' }),
  })

  // ---- Sub-renders ----

  const editorPane = (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={content}
        onChange={(v) => setContent(v || '')}
        options={{ ...editorOptions, contextmenu: true }}
        theme="vs"
        onMount={(editor, monaco) => {
          editorRef.current = editor
          setupPasteHandler(editor, monaco, unescapeJsonString)
          setTimeout(() => editor.focus(), 100)
        }}
      />
    </Box>
  )

  const previewPane = (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'auto', p: 3, bgcolor: 'background.paper', ...markdownStyles }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>{children}</code>
            )
          }
        }}
      >
        {content || '*No content to preview*'}
      </ReactMarkdown>
    </Box>
  )

  // ---- Main layout ----

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.5 }}>
        <Stack direction="row" spacing={0.25}>
          <Button onClick={() => { setViewMode('edit'); setShowDiff(false) }} size="small" sx={viewButtonSx('edit')} startIcon={<CodeIcon sx={{ fontSize: '16px !important' }} />}>
            Edit
          </Button>
          <Button onClick={() => { setViewMode('split'); setShowDiff(false) }} size="small" sx={viewButtonSx('split')} startIcon={<ViewColumnIcon sx={{ fontSize: '16px !important' }} />}>
            Split
          </Button>
          <Button onClick={() => { setViewMode('preview'); setShowDiff(false) }} size="small" sx={viewButtonSx('preview')} startIcon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />}>
            Preview
          </Button>
        </Stack>

        <Stack direction="row" spacing={0.25}>
          <Button onClick={handleUnescape} size="small" sx={toolbarButtonSx} startIcon={<AutoFixHighIcon sx={{ fontSize: '16px !important' }} />} title="Unescape \n, \t etc.">
            Format
          </Button>
          <Button onClick={handleCopy} size="small" sx={{ ...toolbarButtonSx, ...(copied && { color: 'success.main' }) }} startIcon={<ContentCopyIcon sx={{ fontSize: '16px !important' }} />}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            onClick={() => setShowDiff(!showDiff)}
            size="small"
            sx={{ ...toolbarButtonSx, ...(showDiff && { color: 'primary.main', bgcolor: 'action.selected' }) }}
            startIcon={<CompareArrowsIcon sx={{ fontSize: '16px !important' }} />}
          >
            Compare
          </Button>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {showDiff ? (
          <DiffView
            language="markdown"
            toolId="markdown-editor"
            activeSessionId={activeSessionId ?? null}
            currentContent={content}
            onClose={() => setShowDiff(false)}
            pasteTransform={unescapeJsonString}
          />
        ) : viewMode === 'edit' ? (
          editorPane
        ) : viewMode === 'preview' ? (
          previewPane
        ) : (
          /* split */
          <>
            <Box sx={{ flex: 1, minHeight: 0, borderRight: 1, borderColor: 'divider' }}>
              {editorPane}
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              {previewPane}
            </Box>
          </>
        )}
      </Box>

      {/* Status bar */}
      {!showDiff && (
        <Paper square elevation={0} sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          px: 1.5, py: 0.25, height: 32,
          bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider',
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.65rem' }}>
            {content.trim() ? 'Markdown' : 'Ready'}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              Lines: {content.split('\n').length}
            </Typography>
            <Typography variant="caption" sx={{ minWidth: 80, textAlign: 'right', color: 'text.secondary', fontSize: '0.65rem' }}>
              Chars: {content.length}
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  )
})

MarkdownEditor.displayName = 'MarkdownEditor'

export default MarkdownEditor
