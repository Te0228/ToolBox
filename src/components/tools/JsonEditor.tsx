import { useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Box, Button, Select, MenuItem, Typography, Stack, Paper } from '@mui/material'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import CompressIcon from '@mui/icons-material/Compress'
import PreviewIcon from '@mui/icons-material/Preview'
import CodeIcon from '@mui/icons-material/Code'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import LockIcon from '@mui/icons-material/Lock'
import { ToolHandle } from '../../types/tool'
import { setupPasteHandler } from '../../utils/monacoClipboard'
import { baseEditorOptions } from '../../utils/editorConfig'
import { parsePathString, getNestedValue, getAccurateKeyPath } from '../../utils/jsonPath'
import { setupContextMenu } from '../../utils/jsonContextMenu'
import { parseTree, findNodeAtLocation } from 'jsonc-parser'
import JsonMarkdownPreview from './JsonMarkdownPreview'

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
  const monacoRef = useRef<any>(null)
  const contextMenuPositionRef = useRef<any>(null)
  const lastDetectedPathRef = useRef<{ path: string, value: any } | null>(null)
  const handleExpandFieldRef = useRef<(path: string, editorContent?: string) => void>(() => {})
  const handleCompressFieldRef = useRef<(path: string, editorContent?: string) => void>(() => {})
  const mutationObserverRef = useRef<MutationObserver | null>(null)
  const observerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPath, setCurrentPath] = useState<string | null>(null);

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

  // Escape: convert current JSON to an escaped JSON string
  const handleEscape = () => {
    if (!content.trim()) return
    try {
      const parsed = JSON.parse(content)
      const escaped = JSON.stringify(JSON.stringify(parsed))
      setContent(escaped)
      setParsedJson(null)
      setError(null)
    } catch {
      setError('Cannot escape: content is not valid JSON')
    }
  }

  // Unescape: parse an escaped JSON string back to JSON
  const handleUnescape = () => {
    if (!content.trim()) return
    try {
      let parsed = JSON.parse(content)
      // If the result is a string, try to parse it as JSON (handles double-encoded)
      while (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch {
          break
        }
      }
      const formatted = JSON.stringify(parsed, null, indentSize)
      setContent(formatted)
      setParsedJson(parsed)
      setError(null)
    } catch {
      setError('Cannot unescape: content is not a valid JSON string')
    }
  }

  // Validate JSON
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

  // Debounced validation
  useEffect(() => {
    if (isValidating) {
      const timer = setTimeout(() => {
        validateJson(content)
        setIsValidating(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [content, isValidating, validateJson])

  // Replace only the value span for a given path via editor edits (preserves fold state & focus)
  const applyValueReplace = useCallback((path: string, newText: string, contentToUse: string): boolean => {
    const tree = parseTree(contentToUse)
    if (!tree) return false
    const pathParts = parsePathString(path)
    const node = findNodeAtLocation(tree, pathParts)
    if (!node) return false
    const editor = editorInstanceRef.current
    if (!editor) return false
    const model = editor.getModel()
    if (!model) return false
    const monaco = monacoRef.current
    if (!monaco) return false
    const startPos = model.getPositionAt(node.offset)
    const endPos = model.getPositionAt(node.offset + node.length)
    const range = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column)
    editor.executeEdits('json-field-edit', [{ range, text: newText }])
    const newContent = model.getValue()
    setContent(newContent)
    setParsedJson(JSON.parse(newContent))
    setError(null)
    lastDetectedPathRef.current = null
    setTimeout(() => editor.focus(), 0)
    return true
  }, [])

  // Expand: parse a JSON string field into an object
  const handleExpandField = useCallback((path: string, editorContent?: string) => {
    const contentToUse = editorContent !== undefined ? editorContent : content

    if (!contentToUse || !contentToUse.trim()) {
      setError('No content to process')
      return
    }

    try {
      const currentJson = JSON.parse(contentToUse)

      const fieldInfo = getNestedValue(currentJson, path)
      if (!fieldInfo) {
        setError(`Cannot find field path "${path}". Make sure you click on a valid JSON key.`)
        return
      }

      const { value, parent, key } = fieldInfo

      const valueType = typeof value
      const valueConstructor = (value as any)?.constructor?.name

      if (valueType !== 'string') {
        const valueStr = JSON.stringify(value).substring(0, 200)
        setError(`Field "${path}" is not a string (type: ${valueType}, constructor: ${valueConstructor}), cannot expand. Value: ${valueStr}`)
        return
      }

      const stringValue = String(value)
      try {
        const parsed = JSON.parse(stringValue)
        ;(parent as any)[key] = parsed
        const newText = JSON.stringify(parsed, null, indentSize)
        if (!applyValueReplace(path, newText, contentToUse)) {
          const formatted = JSON.stringify(currentJson, null, indentSize)
          setContent(formatted)
          setParsedJson(currentJson)
          setError(null)
          lastDetectedPathRef.current = null
          setTimeout(() => editorInstanceRef.current?.focus(), 0)
        }
      } catch (parseErr) {
        setError(`Cannot parse JSON string: ${parseErr instanceof Error ? parseErr.message : 'Invalid JSON format'}`)
      }
    } catch (err) {
      setError(`Expand field failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [content, indentSize, applyValueReplace])

  // Compress: serialize an object field into a JSON string
  const handleCompressField = useCallback((path: string, editorContent?: string) => {
    const contentToUse = editorContent !== undefined ? editorContent : content

    if (!contentToUse || !contentToUse.trim()) {
      setError('No content to process')
      return
    }

    try {
      const currentJson = JSON.parse(contentToUse)
      const fieldInfo = getNestedValue(currentJson, path)
      if (!fieldInfo) {
        setError(`Cannot find field path "${path}". Make sure you click on a valid JSON key.`)
        return
      }

      const { value, parent, key } = fieldInfo

      if (typeof value === 'object' && value !== null) {
        try {
          const stringified = JSON.stringify(value)
          ;(parent as any)[key] = stringified
          const newText = JSON.stringify(stringified)
          if (!applyValueReplace(path, newText, contentToUse)) {
            const formatted = JSON.stringify(currentJson, null, indentSize)
            setContent(formatted)
            setParsedJson(currentJson)
            setError(null)
            lastDetectedPathRef.current = null
            setTimeout(() => editorInstanceRef.current?.focus(), 0)
          }
        } catch (stringifyErr) {
          setError(`Serialization failed: ${stringifyErr instanceof Error ? stringifyErr.message : 'Unknown error'}`)
        }
      } else {
        setError(`Field "${path}" is not an object, cannot compress`)
      }
    } catch (err) {
      setError(`Compress field failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [content, indentSize, applyValueReplace])

  // Keep refs in sync so onMount closures always call the latest version
  useEffect(() => { handleExpandFieldRef.current = handleExpandField }, [handleExpandField])
  useEffect(() => { handleCompressFieldRef.current = handleCompressField }, [handleCompressField])

  // Cleanup MutationObserver and debounce timeout on unmount
  useEffect(() => {
    return () => {
      mutationObserverRef.current?.disconnect()
      if (observerTimeoutRef.current) {
        clearTimeout(observerTimeoutRef.current)
      }
    }
  }, [])

  const editorOptions = {
    ...baseEditorOptions,
    tabSize: indentSize,
  }

  const toolbarButtonSx = {
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 500,
    px: 1,
    py: 0.25,
    minWidth: 0,
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  }

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
          <Button onClick={handleFormat} size="small" sx={toolbarButtonSx} startIcon={<FormatAlignLeftIcon sx={{ fontSize: '16px !important' }} />}>
            Format
          </Button>
          <Button onClick={handleMinify} size="small" sx={toolbarButtonSx} startIcon={<CompressIcon sx={{ fontSize: '16px !important' }} />}>
            Minify
          </Button>
          <Button onClick={handleEscape} size="small" sx={toolbarButtonSx} startIcon={<LockIcon sx={{ fontSize: '16px !important' }} />}>
            Escape
          </Button>
          <Button onClick={handleUnescape} size="small" sx={toolbarButtonSx} startIcon={<LockOpenIcon sx={{ fontSize: '16px !important' }} />}>
            Unescape
          </Button>
        </Stack>

        <Button
          onClick={() => setShowMarkdown(!showMarkdown)}
          size="small"
          sx={{
            ...toolbarButtonSx,
            ...(showMarkdown && { color: 'primary.main', bgcolor: 'action.selected' }),
          }}
          startIcon={showMarkdown ? <CodeIcon sx={{ fontSize: '16px !important' }} /> : <PreviewIcon sx={{ fontSize: '16px !important' }} />}
        >
          {showMarkdown ? 'Code' : 'Preview'}
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {!showMarkdown ? (
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
                editorInstanceRef.current = editor
                monacoRef.current = monaco

                // Paste handler
                setupPasteHandler(editor, monaco)

                // Cursor tracking for path bar
                editor.onDidChangeCursorPosition((e: any) => {
                  const position = e.position
                  const model = editor.getModel()
                  const editorValue = model?.getValue()
                  const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content

                  if (currentContent && currentContent.trim()) {
                    const pathInfo = getAccurateKeyPath(editor, position, currentContent)
                    setCurrentPath(pathInfo?.path || null)
                  } else {
                    setCurrentPath(null)
                  }
                })

                // Context menu (right-click expand/compress actions)
                setupContextMenu(editor, monaco, {
                  contextMenuPositionRef,
                  lastDetectedPathRef,
                  handleExpandFieldRef,
                  handleCompressFieldRef,
                  mutationObserverRef,
                  observerTimeoutRef,
                }, { setError })

                setTimeout(() => editor.focus(), 100)
              }}
            />
          </Box>
        ) : (
          <JsonMarkdownPreview error={error} parsedJson={parsedJson} />
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
          bgcolor: error ? 'rgba(229,72,77,0.05)' : 'background.default',
          borderTop: '1px solid',
          borderColor: error ? 'rgba(229,72,77,0.3)' : 'divider',
          height: 32,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              color: error ? 'error.main' : 'success.main',
              fontWeight: 500,
              fontSize: '0.65rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {error ? error : content.trim() ? 'Valid JSON' : 'Ready'}
          </Typography>
          {currentPath && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                color: 'text.secondary',
                fontSize: '0.65rem',
                whiteSpace: 'nowrap',
              }}
            >
              {currentPath}
            </Typography>
          )}
        </Box>

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

JsonEditor.displayName = 'JsonEditor'

export default JsonEditor
