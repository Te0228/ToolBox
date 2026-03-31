import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Button, Stack, Paper, Typography } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CodeIcon from '@mui/icons-material/Code'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { ToolHandle } from '../../types/tool'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { insertTextAtSelections, readClipboardText, runDefaultPaste } from '../../utils/monacoClipboard'

interface MarkdownEditorProps {
  initialContent?: string | null
}

type ViewMode = 'edit' | 'preview' | 'split'

// 处理 JSON 字符串中的所有转义字符
const unescapeString = (str: string): string => {
  // 如果字符串被引号包裹，先尝试作为 JSON 解析
  const trimmed = str.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      // 尝试作为 JSON 字符串解析
      return JSON.parse(trimmed)
    } catch (e) {
      // 如果 JSON 解析失败，继续使用手动替换
    }
  }

  // 手动处理所有 JSON 转义字符（使用单次正则匹配避免顺序问题）
  return str.replace(/\\(n|r|t|b|f|"|'|\/|\\|u[0-9a-fA-F]{4})/g, (match, seq) => {
    switch (seq) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      case 'b': return '\b'
      case 'f': return '\f'
      case '"': return '"'
      case "'": return "'"
      case '/': return '/'
      case '\\': return '\\'
      default:
        // Unicode escape: \uXXXX
        if (seq.startsWith('u')) {
          return String.fromCharCode(parseInt(seq.substring(1), 16))
        }
        return match
    }
  })
}

const MarkdownEditor = forwardRef<ToolHandle, MarkdownEditorProps>(({ initialContent }, ref) => {
  const [content, setContent] = useState(initialContent || '')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [copied, setCopied] = useState(false)
  const editorRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getContent: () => content,
    clearContent: () => {
      setContent('')
    }
  }))

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent)
    }
  }, [initialContent])

  const handleContentChange = (value: string | undefined) => {
    setContent(value || '')
  }

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
    const unescaped = unescapeString(content)
    setContent(unescaped)
  }

  const editorOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    automaticLayout: true,
    fontFamily: "'Fira Code', monospace",
    fontSize: 14,
    lineNumbers: 'on' as const,
    formatOnPaste: true,
    formatOnType: true,
  }

  const renderEditor = () => (
    <Box sx={{ flex: 1, minHeight: 0, height: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={content}
        onChange={handleContentChange}
        options={{
          ...editorOptions,
          contextmenu: true,
        }}
        theme="vs"
        onMount={(editor, monaco) => {
          // Store editor reference
          editorRef.current = editor

          // Add paste command (Cmd+V / Ctrl+V)
          // We handle clipboard read ourselves (Electron clipboard or navigator.clipboard),
          // and fall back to Monaco's default paste action if reading is blocked.
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
            void (async () => {
              const text = await readClipboardText()
              if (typeof text !== 'string') {
                await runDefaultPaste(editor)
                return
              }

              insertTextAtSelections(editor, unescapeString(text))
            })()
          });

          // Focus editor on mount
          setTimeout(() => editor.focus(), 100);
        }}
      />
    </Box>
  )

  const renderPreview = () => (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'auto',
        p: 3,
        bgcolor: 'background.paper',
        '& h1': { fontSize: '2em', fontWeight: 'bold', mt: 2, mb: 1 },
        '& h2': { fontSize: '1.5em', fontWeight: 'bold', mt: 2, mb: 1 },
        '& h3': { fontSize: '1.25em', fontWeight: 'bold', mt: 1.5, mb: 0.75 },
        '& p': { mb: 1, lineHeight: 1.6 },
        '& code': {
          bgcolor: 'rgba(91,91,214,0.08)',
          color: '#5B5BD6',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: '0.85em',
        },
        '& pre': { mb: 2, borderRadius: 1, overflow: 'auto' },
        '& ul, & ol': { pl: 3, mb: 1 },
        '& blockquote': {
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          pl: 2,
          ml: 0,
          fontStyle: 'italic',
          color: 'text.secondary'
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          mb: 2
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          px: 1,
          py: 0.5,
          textAlign: 'left'
        },
        '& th': {
          bgcolor: 'action.hover',
          fontWeight: 'bold'
        },
        '& a': {
          color: 'primary.main',
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' }
        },
        '& img': { maxWidth: '100%', height: 'auto' }
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content || '*No content to preview*'}
      </ReactMarkdown>
    </Box>
  )

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
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 1,
        py: 0.5,
      }}>
        <Stack direction="row" spacing={0.25}>
          <Button onClick={() => setViewMode('edit')} size="small" sx={viewButtonSx('edit')} startIcon={<CodeIcon sx={{ fontSize: '16px !important' }} />}>
            Edit
          </Button>
          <Button onClick={() => setViewMode('split')} size="small" sx={viewButtonSx('split')} startIcon={<ViewColumnIcon sx={{ fontSize: '16px !important' }} />}>
            Split
          </Button>
          <Button onClick={() => setViewMode('preview')} size="small" sx={viewButtonSx('preview')} startIcon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />}>
            Preview
          </Button>
        </Stack>

        <Stack direction="row" spacing={0.25}>
          <Button
            onClick={handleUnescape}
            size="small"
            sx={toolbarButtonSx}
            startIcon={<AutoFixHighIcon sx={{ fontSize: '16px !important' }} />}
            title="Unescape \n, \t etc."
          >
            Format
          </Button>
          <Button
            onClick={handleCopy}
            size="small"
            sx={{ ...toolbarButtonSx, ...(copied && { color: 'success.main' }) }}
            startIcon={<ContentCopyIcon sx={{ fontSize: '16px !important' }} />}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {viewMode === 'edit' && renderEditor()}
        {viewMode === 'preview' && renderPreview()}
        {viewMode === 'split' && (
          <>
            <Box sx={{ flex: 1, minHeight: 0, borderRight: 1, borderColor: 'divider' }}>
              {renderEditor()}
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              {renderPreview()}
            </Box>
          </>
        )}
      </Box>

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
    </Box>
  )
})

MarkdownEditor.displayName = 'MarkdownEditor'

export default MarkdownEditor

