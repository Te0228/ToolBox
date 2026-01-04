import { useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Button, Select, MenuItem, Typography, Stack, Paper, Chip, ToggleButton } from '@mui/material'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import CompressIcon from '@mui/icons-material/Compress'
import PreviewIcon from '@mui/icons-material/Preview'
import CodeIcon from '@mui/icons-material/Code'
import { ToolHandle } from '../../types/tool'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface JsonEditorProps {
  initialContent?: string | null
}

const JsonEditor = forwardRef<ToolHandle, JsonEditorProps>(({ initialContent }, ref) => {
  const [content, setContent] = useState(initialContent || '')
  const [error, setError] = useState<string | null>(null)
  const [indentSize, setIndentSize] = useState(2)
  const [isValidating, setIsValidating] = useState(false)
  const [showMarkdown, setShowMarkdown] = useState(false)
  const [parsedJson, setParsedJson] = useState<any>(null)
  const editorInstanceRef = useRef<any>(null)

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
      setParsedJson(null)
      return true
    }

    try {
      const parsed = JSON.parse(jsonString)
      setParsedJson(parsed)
      setError(null)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON'
      setError(errorMessage)
      setParsedJson(null)
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
      setParsedJson(parsed)
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
      setParsedJson(parsed)
      setError(null)
    } catch (err) {
      // Error already handled by validation
    }
  }

  const renderMarkdown = (text: string) => (
    <Box
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        '& h1': { fontSize: '1.5em', fontWeight: 'bold', mt: 1, mb: 1 },
        '& h2': { fontSize: '1.25em', fontWeight: 'bold', mt: 1, mb: 0.75 },
        '& h3': { fontSize: '1.1em', fontWeight: 'bold', mt: 0.75, mb: 0.5 },
        '& p': { mb: 1, lineHeight: 1.6 },
        '& code': {
          bgcolor: 'rgba(0, 0, 0, 0.1)',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontFamily: 'monospace',
          fontSize: '0.9em'
        },
        '& pre': { mb: 1, borderRadius: 1, overflow: 'auto' },
        '& ul, & ol': { pl: 2, mb: 1 },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          pl: 1.5,
          ml: 0,
          fontStyle: 'italic',
          color: 'text.secondary'
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          mb: 1,
          fontSize: '0.9em'
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
        }
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
                customStyle={{ fontSize: '0.85em', margin: '0.5em 0' }}
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
        {text}
      </ReactMarkdown>
    </Box>
  )

  const renderValue = (value: any): JSX.Element => {
    if (value === null) {
      return <Typography component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>null</Typography>
    }

    if (value === undefined) {
      return <Typography component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>undefined</Typography>
    }

    if (typeof value === 'string') {
      // 所有字符串都按 Markdown 渲染
      if (value.length > 0) {
        return (
          <Box sx={{ mt: 1 }}>
            <Chip label="String (Markdown)" size="small" color="primary" sx={{ mb: 1 }} />
            {renderMarkdown(value)}
          </Box>
        )
      }
      return <Typography component="span" sx={{ color: 'success.main' }}>""</Typography>
    }

    if (typeof value === 'number') {
      return <Typography component="span" sx={{ color: 'info.main' }}>{value}</Typography>
    }

    if (typeof value === 'boolean') {
      return <Typography component="span" sx={{ color: 'warning.main' }}>{value.toString()}</Typography>
    }

    if (Array.isArray(value)) {
      return (
        <Box sx={{ pl: 2 }}>
          <Typography component="span">[</Typography>
          {value.map((item, index) => (
            <Box key={index} sx={{ pl: 2, py: 0.5 }}>
              {renderValue(item)}
              {index < value.length - 1 && <Typography component="span">,</Typography>}
            </Box>
          ))}
          <Typography component="span">]</Typography>
        </Box>
      )
    }

    if (typeof value === 'object') {
      return (
        <Box sx={{ pl: 2 }}>
          <Typography component="span">{'{'}</Typography>
          {Object.entries(value).map(([k, v], index, arr) => (
            <Box key={k} sx={{ pl: 2, py: 0.5 }}>
              <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                "{k}":
              </Typography>{' '}
              {renderValue(v)}
              {index < arr.length - 1 && <Typography component="span">,</Typography>}
            </Box>
          ))}
          <Typography component="span">{'}'}</Typography>
        </Box>
      )
    }

    return <Typography component="span">{String(value)}</Typography>
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

        <ToggleButton
          value="markdown"
          selected={showMarkdown}
          onChange={() => setShowMarkdown(!showMarkdown)}
          size="small"
          sx={{ px: 2 }}
        >
          {showMarkdown ? <CodeIcon sx={{ mr: 0.5 }} /> : <PreviewIcon sx={{ mr: 0.5 }} />}
          {showMarkdown ? 'Hide Preview' : 'Show Markdown'}
        </ToggleButton>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {!showMarkdown ? (
          /* JSON 编辑器 */
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              defaultLanguage="json"
              value={content}
              onChange={handleContentChange}
              theme="vs"
              options={{
                ...editorOptions,
                contextmenu: true,
              }}
              onMount={(editor, monaco) => {
                // Store editor instance
                editorInstanceRef.current = editor
                
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
                    editor.trigger('keyboard', 'paste', null);
                  }
                });

                // Focus editor on mount
                setTimeout(() => editor.focus(), 100);
              }}
            />
          </Box>
        ) : (
          /* Markdown 预览 */
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2, bgcolor: 'background.paper' }}>
            {error ? (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'error.light',
                  color: 'error.contrastText'
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  JSON 解析错误
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {error}
                </Typography>
              </Paper>
            ) : parsedJson ? (
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                {renderValue(parsedJson)}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                输入 JSON 数据以查看 Markdown 预览...
              </Typography>
            )}
          </Box>
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
