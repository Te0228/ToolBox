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
import { insertTextAtSelections, readClipboardText, runDefaultPaste } from '../../utils/monacoClipboard'
import { parseTree, findNodeAtOffset, findNodeAtLocation, Node } from 'jsonc-parser'

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

  // 解析路径字符串为 (string | number)[]，与 buildAccuratePath 使用同一套规则（支持 [1][0].data 这种以数组索引开头的路径）
  const parsePathString = (path: string): (string | number)[] => {
    const parts: (string | number)[] = [];
    let current = '';
    let i = 0;

    while (i < path.length) {
      if (path[i] === '.') {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else if (path[i] === '[') {
        if (current) {
          parts.push(current);
          current = '';
        }
        const closeIndex = path.indexOf(']', i);
        if (closeIndex !== -1) {
          const indexStr = path.substring(i + 1, closeIndex);
          const index = parseInt(indexStr, 10);
          if (!isNaN(index)) {
            parts.push(index);
          }
          i = closeIndex;
        }
      } else {
        current += path[i];
      }
      i++;
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  };

  // 获取嵌套字段的值和引用信息（支持数组索引及以数组开头的路径，如 [1][0].data 或 data.conversation[0][0].data）
  const getNestedValue = useCallback((obj: any, path: string): { value: any, parent: any, key: string } | null => {
    const parts = parsePathString(path);
    if (parts.length === 0) return null;

    let current: any = obj;
    let parent: any = obj;
    let key: string = '';

    for (let i = 0; i < parts.length; i++) {
      if (current == null || typeof current !== 'object') {
        return null;
      }
      const part = parts[i];
      parent = current;

      if (typeof part === 'number') {
        if (!Array.isArray(current) || part < 0 || part >= current.length) {
          return null;
        }
        key = String(part);
        current = current[part];
      } else {
        if (!(part in current)) {
          return null;
        }
        key = part;
        current = current[part];
      }
    }

    return { value: current, parent, key };
  }, [])

  // 替换现有的 getKeyPathAtPosition 函数
  const getAccurateKeyPath = useCallback((editor: any, position: any, jsonContent?: string): { path: string, value: any } | null => {
    const contentToParse = jsonContent || content;
    if (!contentToParse.trim()) return null;

    try {
      const jsonObj = JSON.parse(contentToParse);
      const tree = parseTree(contentToParse);
      if (!tree) return null;

      const model = editor.getModel();
      if (!model) return null;

      const offset = model.getOffsetAt(position);
      
      // 1. 扩展搜索范围：不仅查找精确位置，还查找附近的有效节点
      let node: Node | null = null;
      const searchRadius = 20; // 向前后各搜索20个字符
      
      // 优先尝试精确位置
      node = findNodeAtOffset(tree, offset, true);
      
      // 如果没找到，尝试扩展搜索
      if (!node) {
        // 向前搜索
        for (let i = 1; i <= searchRadius; i++) {
          if (offset - i >= 0) {
            node = findNodeAtOffset(tree, offset - i, true);
            if (node) break;
          }
        }
        
        // 如果还没找到，向后搜索
        if (!node) {
          for (let i = 1; i <= searchRadius; i++) {
            if (offset + i < contentToParse.length) {
              node = findNodeAtOffset(tree, offset + i, true);
              if (node) break;
            }
          }
        }
      }
      
      if (!node) return null;

      // 2. 改进路径构建逻辑
      const buildAccuratePath = (targetNode: Node): { path: string, value: any } | null => {
        // 获取目标节点的完整路径
        const pathSegments: (string | number)[] = [];
        let current: Node | null = targetNode;
        
        // 向上遍历到根
        while (current && current.parent) {
          const parent = current.parent;
          
          if (parent.type === 'array') {
            // 数组：计算索引
            const index = parent.children?.indexOf(current) ?? -1;
            if (index >= 0) {
              pathSegments.unshift(index);
            }
          } else if (parent.type === 'property') {
            // 属性：获取键名
            const keyNode = parent.children?.[0];
            if (keyNode?.type === 'string') {
              pathSegments.unshift(keyNode.value as string);
            }
          }
          
          current = parent;
        }
        
        if (pathSegments.length === 0) return null;
        
        // 3. 构建路径字符串（正确处理数组索引）
        let pathStr = '';
        for (let i = 0; i < pathSegments.length; i++) {
          const segment = pathSegments[i];
          if (typeof segment === 'number') {
            // 数组索引：附加到前一个路径段
            if (i > 0 && typeof pathSegments[i-1] === 'string') {
              // 将前一个字符串段替换为带索引的形式
              const prevPath = pathStr.split('.').slice(0, -1).join('.');
              const lastSegment = pathStr.split('.').pop() || '';
              pathStr = prevPath ? `${prevPath}.${lastSegment}[${segment}]` : `${lastSegment}[${segment}]`;
            } else {
              pathStr += `[${segment}]`;
            }
          } else {
            pathStr += (pathStr ? '.' : '') + segment;
          }
        }
        
        // 4. 验证路径有效性并获取值
        try {
          let currentValue = jsonObj;
          const pathParts = parsePathString(pathStr);
          
          for (const part of pathParts) {
            if (typeof part === 'number') {
              if (!Array.isArray(currentValue) || part >= currentValue.length) {
                return null;
              }
              currentValue = currentValue[part];
            } else {
              if (currentValue === null || typeof currentValue !== 'object' || !(part in currentValue)) {
                return null;
              }
              currentValue = currentValue[part];
            }
          }
          
          return { path: pathStr, value: currentValue };
        } catch {
          return null;
        }
      };
      
      return buildAccuratePath(node);
    } catch (err) {
      console.error('Enhanced path detection error:', err);
      return null;
    }
  }, [content]);

  // 仅替换路径对应值的源码区间，不整份 setContent，以保留编辑器的折叠状态与焦点
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

  // 展开功能：将 JSON 字符串解析为对象
  const handleExpandField = useCallback((path: string, editorContent?: string) => {
    // 明确逻辑：如果传入了 editorContent（即使是空字符串），就使用它；否则使用 state 中的 content
    const contentToUse = editorContent !== undefined ? editorContent : content
    
    if (!contentToUse || !contentToUse.trim()) {
      setError('No content to process')
      return
    }

    try {
      // 重新解析 JSON 以确保使用最新内容
      const currentJson = JSON.parse(contentToUse)
      
      const fieldInfo = getNestedValue(currentJson, path)
      if (!fieldInfo) {
        // 如果自动检测失败，提供更友好的错误信息
        setError(`无法找到字段路径 "${path}"。请确保点击在有效的 JSON 键上。`);
        return
      }

      const { value, parent, key } = fieldInfo

      // 检查值类型
      const valueType = typeof value
      const valueConstructor = value?.constructor?.name
      
      if (valueType !== 'string') {
        const valueStr = JSON.stringify(value).substring(0, 200)
        setError(`字段 "${path}" 不是字符串类型 (当前类型: ${valueType}, 构造函数: ${valueConstructor}), 无法展开。值: ${valueStr}`)
        return
      }

      // 确保值是字符串，然后尝试解析
      const stringValue = String(value)
      try {
        const parsed = JSON.parse(stringValue)
        parent[key] = parsed
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
        setError(`无法解析 JSON 字符串: ${parseErr instanceof Error ? parseErr.message : '无效的 JSON 格式'}`)
      }
    } catch (err) {
      setError(`展开字段失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }, [content, getNestedValue, indentSize, applyValueReplace])

  // 压缩功能：将对象序列化为 JSON 字符串
  const handleCompressField = useCallback((path: string, editorContent?: string) => {
    // 明确逻辑：如果传入了 editorContent（即使是空字符串），就使用它；否则使用 state 中的 content
    const contentToUse = editorContent !== undefined ? editorContent : content
    
    if (!contentToUse || !contentToUse.trim()) {
      setError('No content to process')
      return
    }

    try {
      // 重新解析 JSON 以确保使用最新内容
      const currentJson = JSON.parse(contentToUse)
      const fieldInfo = getNestedValue(currentJson, path)
      if (!fieldInfo) {
        setError(`无法找到字段路径 "${path}"。请确保点击在有效的 JSON 键上。`)
        return
      }

      const { value, parent, key } = fieldInfo

      if (typeof value === 'object' && value !== null) {
        // 允许对象和数组
        try {
          const stringified = JSON.stringify(value)
          parent[key] = stringified
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
          setError(`序列化失败: ${stringifyErr instanceof Error ? stringifyErr.message : '未知错误'}`)
        }
      } else {
        setError(`字段 "${path}" 不是对象类型, 无法压缩`)
      }
    } catch (err) {
      setError(`压缩字段失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }, [content, getNestedValue, indentSize, applyValueReplace])

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

      {/* 路径显示面板 */}
      {currentPath && (
        <Box sx={{ 
          p: 1, 
          bgcolor: 'info.light', 
          fontSize: '0.85rem',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          Path: <code>{currentPath}</code>
        </Box>
      )}

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
                // Ensure paste works reliably in Electron (Cmd/Ctrl+V).
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
                  void (async () => {
                    const text = await readClipboardText()
                    if (typeof text !== 'string') {
                      await runDefaultPaste(editor)
                      return
                    }
                    insertTextAtSelections(editor, text)
                  })()
                })

                // Extra safety: on macOS Electron, Cmd+V can be handled by the native menu layer,
                // and Monaco keybindings may not fire reliably in some setups. Capture it here too.
                editor.onKeyDown((e: any) => {
                  const isPaste = (e?.keyCode === monaco.KeyCode.KeyV) && (e?.metaKey || e?.ctrlKey)
                  if (!isPaste) return
                  e.preventDefault?.()
                  e.stopPropagation?.()
                  void (async () => {
                    const text = await readClipboardText()
                    if (typeof text !== 'string') {
                      await runDefaultPaste(editor)
                      return
                    }
                    insertTextAtSelections(editor, text)
                  })()
                })

                // 添加光标位置变化监听
                editor.onDidChangeCursorPosition((e: any) => {
                  const position = e.position;
                  const model = editor.getModel();
                  const editorValue = model?.getValue();
                  const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content;
                  
                  if (currentContent && currentContent.trim()) {
                    const pathInfo = getAccurateKeyPath(editor, position, currentContent);
                    setCurrentPath(pathInfo?.path || null);
                  } else {
                    setCurrentPath(null);
                  }
                });

                // 更新菜单项显示/隐藏的函数（需要在事件处理器之前定义）
                const updateMenuVisibility = () => {
                  // 根据检测到的 value 类型确定显示哪个菜单项
                  let showExpand = false
                  let showCompress = false
                  
                  if (lastDetectedPathRef.current) {
                    const valueType = typeof lastDetectedPathRef.current.value
                    if (valueType === 'string') {
                      showExpand = true
                      showCompress = false
                    } else if (valueType === 'object' && lastDetectedPathRef.current.value !== null) {
                      showExpand = false
                      showCompress = true
                    }
                  }
                  
                  
                  // 多次尝试查找 context menu（因为菜单可能还没完全渲染）
                  const tryUpdate = (attempt: number = 0) => {
                    if (attempt > 10) {
                      return
                    }
                    
                    // 查找 context menu
                    const contextMenu = document.querySelector('.monaco-menu')
                    if (!contextMenu) {
                      setTimeout(() => tryUpdate(attempt + 1), 20)
                      return
                    }
                    
                    // 查找我们的菜单项
                    const menuItems = contextMenu.querySelectorAll('.monaco-action-bar .action-item')
                    
                    let foundExpand = false
                    let foundCompress = false
                    
                    menuItems.forEach((item: Element) => {
                      const actionLabel = item.querySelector('.action-label')
                      if (!actionLabel) return
                      
                      const itemText = actionLabel.textContent?.trim() || ''
                      
                      // 检查是否是"展开"菜单项
                      const isExpandItem = item.getAttribute('data-action-id') === 'expand-json-field' || itemText === '展开'
                      // 检查是否是"压缩"菜单项
                      const isCompressItem = item.getAttribute('data-action-id') === 'compress-json-field' || itemText === '压缩'
                      
                      if (isExpandItem) {
                        item.setAttribute('data-action-id', 'expand-json-field')
                        ;(item as HTMLElement).style.display = showExpand ? '' : 'none'
                        foundExpand = true
                      } else if (isCompressItem) {
                        item.setAttribute('data-action-id', 'compress-json-field')
                        ;(item as HTMLElement).style.display = showCompress ? '' : 'none'
                        foundCompress = true
                      }
                    })
                    
                    if ((!foundExpand || !foundCompress) && attempt < 10) {
                      setTimeout(() => tryUpdate(attempt + 1), 20)
                    }
                  }
                  
                  tryUpdate()
                }
                
                // 捕获鼠标右键点击的位置，并检测字段类型
                editor.onMouseDown((e: any) => {
                  // 检查是否是右键点击
                  if (e.event && (e.event.button === 2 || e.event.which === 3)) {
                    let position = null
                    if (e.target && e.target.position) {
                      position = e.target.position
                      contextMenuPositionRef.current = position
                    } else if (e.target && e.target.range) {
                      position = e.target.range.getStartPosition()
                      if (position) {
                        contextMenuPositionRef.current = position
                      }
                    }
                    
                    // 检测字段类型，确定应该显示"展开"还是"恢复"
                    if (position) {
                      const model = editor.getModel()
                      const editorValue = model?.getValue()
                      // 明确检查：如果编辑器有值就使用编辑器值，否则使用 state
                      const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content
                      const result = getAccurateKeyPath(editor, position, currentContent)
                      if (result) {
                        lastDetectedPathRef.current = result
                        // 检测完成后，延迟更新菜单显示/隐藏（确保菜单已经显示）
                        setTimeout(() => {
                          updateMenuVisibility()
                        }, 100)
                      } else {
                        lastDetectedPathRef.current = null
                      }
                    }
                  }
                })
                
                // 也监听鼠标右键释放事件
                editor.onMouseUp((e: any) => {
                  if (e.event && (e.event.button === 2 || e.event.which === 3)) {
                    // 右键释放时，光标应该已经移动到点击位置
                    const pos = editor.getPosition()
                    if (pos) {
                      contextMenuPositionRef.current = pos
                      // 再次检测字段类型
                      const model = editor.getModel()
                      const editorValue = model?.getValue()
                      // 明确检查：如果编辑器有值就使用编辑器值，否则使用 state
                      const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content
                      const result = getAccurateKeyPath(editor, pos, currentContent)
                      if (result) {
                        lastDetectedPathRef.current = result
                        // 检测完成后，延迟更新菜单显示/隐藏（确保菜单已经显示）
                        setTimeout(() => {
                          updateMenuVisibility()
                        }, 100)
                      } else {
                        lastDetectedPathRef.current = null
                      }
                    }
                  }
                })

                // 添加"展开"菜单项
                const expandAction = editor.addAction({
                  id: 'expand-json-field',
                  label: '展开',
                  contextMenuGroupId: 'navigation',
                  contextMenuOrder: 1.4,
                  run: (ed) => {
                    
                    // 优先使用保存的路径
                    if (lastDetectedPathRef.current) {
                      const { path } = lastDetectedPathRef.current
                      
                      // 从编辑器获取最新内容
                      const model = ed.getModel()
                      const editorValue = model?.getValue()
                      const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content
                      if (!currentContent || !currentContent.trim()) {
                        setError('Editor content is empty')
                        return
                      }
                      
                      handleExpandField(path, currentContent)
                      return
                    }
                    
                    // 如果没有保存的信息，尝试实时检测
                    const position = contextMenuPositionRef.current || ed.getPosition()
                    if (!position) {
                      setError('Unable to get cursor position')
                      return
                    }
                    
                    const model = ed.getModel()
                    const editorValue = model?.getValue()
                    const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content
                    
                    if (!currentContent || !currentContent.trim()) {
                      setError('Editor content is empty')
                      return
                    }
                    
                    const result = getAccurateKeyPath(ed, position, currentContent)
                    if (result) {
                      handleExpandField(result.path, currentContent)
                    } else {
                      setError('无法检测到光标位置的字段。请确保点击在有效的 JSON 键上。')
                    }
                  }
                })
                
                // 添加"压缩"菜单项
                const compressAction = editor.addAction({
                  id: 'compress-json-field',
                  label: '压缩',
                  contextMenuGroupId: 'navigation',
                  contextMenuOrder: 1.5,
                  run: (ed) => {
                    
                    // 优先使用保存的路径
                    if (lastDetectedPathRef.current) {
                      const { path } = lastDetectedPathRef.current
                      
                      // 从编辑器获取最新内容
                      const model = ed.getModel()
                      const editorValue = model?.getValue()
                      const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content
                      if (!currentContent || !currentContent.trim()) {
                        setError('Editor content is empty')
                        return
                      }
                      
                      handleCompressField(path, currentContent)
                      return
                    }
                    
                    // 如果没有保存的信息，尝试实时检测
                    const position = contextMenuPositionRef.current || ed.getPosition()
                    if (!position) {
                      setError('Unable to get cursor position')
                      return
                    }
                    
                    const model = ed.getModel()
                    const editorValue = model?.getValue()
                    const currentContent = editorValue !== undefined && editorValue !== null ? editorValue : content
                    
                    if (!currentContent || !currentContent.trim()) {
                      setError('Editor content is empty')
                      return
                    }
                    
                    const result = getAccurateKeyPath(ed, position, currentContent)
                    if (result) {
                      handleCompressField(result.path, currentContent)
                    } else {
                      setError('无法检测到光标位置的字段。请确保点击在有效的 JSON 键上。')
                    }
                  }
                })
                
                // 通过 DOM 操作动态修改菜单项标签
                const editorContainer = editor.getContainerDomNode()
                let observerTimeout: NodeJS.Timeout | null = null
                const observer = new MutationObserver((mutations) => {
                  // 检查是否有新的菜单项被添加
                  const hasMenuAdded = mutations.some(mutation => {
                    return Array.from(mutation.addedNodes).some((node: any) => {
                      return node.nodeType === 1 && (
                        node.classList?.contains('monaco-menu') ||
                        node.querySelector?.('.monaco-menu')
                      )
                    })
                  })
                  
                  if (hasMenuAdded) {
                    // 防抖处理
                    if (observerTimeout) {
                      clearTimeout(observerTimeout)
                    }
                    observerTimeout = setTimeout(() => {
                      updateMenuVisibility()
                    }, 50)
                  }
                })
                
                // 观察 editor 容器的变化
                observer.observe(editorContainer, {
                  childList: true,
                  subtree: true
                })
                
                // 也观察 document body，因为 context menu 可能附加到 body
                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                })


                setTimeout(() => editor.focus(), 100)
              }}
            />
          </Box>
        ) : (
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