import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Button, Stack, Paper, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material'
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

  // 手动处理所有 JSON 转义字符
  return str
    .replace(/\\n/g, '\n')       // 换行
    .replace(/\\r/g, '\r')       // 回车
    .replace(/\\t/g, '\t')       // 制表符
    .replace(/\\b/g, '\b')       // 退格
    .replace(/\\f/g, '\f')       // 换页
    .replace(/\\"/g, '"')        // 双引号
    .replace(/\\'/g, "'")        // 单引号
    .replace(/\\\//g, '/')       // 斜杠
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) // Unicode
    .replace(/\\\\/g, '\\')      // 反斜杠（最后处理）
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
        theme="vs-dark"
        onMount={(editor, monaco) => {
          // Store editor reference
          editorRef.current = editor

          // Add paste command (Cmd+V / Ctrl+V)
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
            try {
              let text = window.require('electron').clipboard.readText();
              // 处理转义字符
              text = unescapeString(text);
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
          bgcolor: 'rgba(0, 0, 0, 0.1)',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontFamily: 'monospace',
          fontSize: '0.9em'
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        p: 1,
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="edit">
              <CodeIcon sx={{ mr: 0.5 }} fontSize="small" />
              Edit
            </ToggleButton>
            <ToggleButton value="split">
              <ViewColumnIcon sx={{ mr: 0.5 }} fontSize="small" />
              Split
            </ToggleButton>
            <ToggleButton value="preview">
              <VisibilityIcon sx={{ mr: 0.5 }} fontSize="small" />
              Preview
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AutoFixHighIcon />}
            onClick={handleUnescape}
            size="small"
            title="将 JSON 字符串转换为 Markdown 格式（处理 \n, \t 等转义字符）"
          >
            Format
          </Button>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopy}
            size="small"
            color={copied ? 'success' : 'primary'}
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
          p: 0.5,
          px: 2,
          bgcolor: 'background.default',
          borderTop: 1,
          borderColor: 'divider',
          height: 36
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {content.trim() ? '✓ Markdown' : 'Ready'}
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Lines: {content.split('\n').length}
          </Typography>
          <Typography variant="caption" sx={{ minWidth: 100, textAlign: 'right', color: 'text.secondary' }}>
            Characters: {content.length}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
})

MarkdownEditor.displayName = 'MarkdownEditor'

export default MarkdownEditor

