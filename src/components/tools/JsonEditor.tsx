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
  const contextMenuPositionRef = useRef<any>(null)
  const lastDetectedPathRef = useRef<{ path: string, value: any } | null>(null)

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

  // 获取嵌套字段的值和引用信息（支持数组索引，如 data.conversation[0][0].data）
  const getNestedValue = useCallback((obj: any, path: string): { value: any, parent: any, key: string } | null => {
    const keys = path.split('.')
    let current = obj
    
    // 解析路径段，支持连续的数组索引，如 conversation[0][0]
    const parsePathSegment = (segment: string): { key: string, indices: number[] } => {
      // 匹配格式：key[index1][index2]...
      const match = segment.match(/^([^\[\]]+)((?:\[\d+\])+)?$/)
      if (!match) {
        return { key: segment, indices: [] }
      }
      
      const key = match[1]
      const indicesStr = match[2] || ''
      // 提取所有索引，如 "[0][1]" -> [0, 1]
      const indices: number[] = []
      const indexMatches = indicesStr.matchAll(/\[(\d+)\]/g)
      for (const m of indexMatches) {
        indices.push(parseInt(m[1], 10))
      }
      
      return { key, indices }
    }
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (current == null || typeof current !== 'object') {
        return null
      }
      
      const { key, indices } = parsePathSegment(keys[i])
      
      // 先访问 key
      if (!(key in current)) {
        return null
      }
      current = current[key]
      
      // 然后依次访问数组索引
      for (let idx = 0; idx < indices.length; idx++) {
        const index = indices[idx]
        if (!Array.isArray(current)) {
          return null
        }
        if (current[index] == null) {
          return null
        }
        current = current[index]
      }
    }
    
    // 处理最后一个 key
    const { key: lastKey, indices: lastIndices } = parsePathSegment(keys[keys.length - 1])
    
    // 先访问最后一个 key
    if (current == null || typeof current !== 'object' || !(lastKey in current)) {
      return null
    }
    const lastValue = current[lastKey]
    
    // 如果有数组索引，继续访问
    let finalValue = lastValue
    let finalParent = current
    let finalKey = lastKey
    
    if (lastIndices.length > 0) {
      // 最后一个 key 后面还有数组索引，需要访问数组
      if (!Array.isArray(lastValue)) {
        return null
      }
      let temp = lastValue
      for (let i = 0; i < lastIndices.length; i++) {
        const index = lastIndices[i]
        if (temp[index] == null) {
          return null
        }
        if (i === lastIndices.length - 1) {
          // 最后一个索引，这就是我们要的值
          finalValue = temp[index]
          finalParent = temp
          finalKey = String(index)
        } else {
          temp = temp[index]
        }
      }
    }
    
    return { value: finalValue, parent: finalParent, key: finalKey }
  }, [])

  // 从 Monaco Editor 位置检测 key 路径和值信息
  const getKeyPathAtPosition = useCallback((editor: any, position: any, jsonContent?: string): { path: string, value: any } | null => {
    const contentToParse = jsonContent || content
    if (!contentToParse.trim()) return null

    try {
      // 解析 JSON
      const jsonObj = JSON.parse(contentToParse)
      
      const model = editor.getModel()
      if (!model) return null

      // 获取当前位置的文本
      const lineContent = model.getLineContent(position.lineNumber)
      const offset = position.column - 1

      // 检查当前行是否是 key 行（格式：  "key": value）
      // 尝试使用 Monaco Editor 的 getWordAtPosition 获取单词
      const word = model.getWordAtPosition(position)
      let key: string | null = null
      let keyStartQuote = -1
      let keyEndQuote = -1

      if (word) {
        // Monaco 可能返回包含引号的单词，也可能不包含
        // 检查单词内容
        const wordText = word.word
        const wordStartCol = word.startColumn - 1
        const wordEndCol = word.endColumn - 1
        
        
        // 检查单词本身是否以引号开头和结尾
        if (wordText.startsWith('"') && wordText.endsWith('"') && wordText.length > 2) {
          // 单词包含引号，去掉引号
          key = wordText.substring(1, wordText.length - 1)
          keyStartQuote = wordStartCol
          keyEndQuote = wordEndCol
        } else {
          // 检查单词前后是否有引号
          if (wordStartCol > 0 && wordEndCol < lineContent.length) {
            const beforeChar = lineContent[wordStartCol - 1]
            const afterChar = lineContent[wordEndCol]
            if (beforeChar === '"' && afterChar === '"') {
              key = wordText
              keyStartQuote = wordStartCol - 1
              keyEndQuote = wordEndCol
            }
          }
        }
      }

      // 如果 getWordAtPosition 没有获取到有效的 key，手动查找引号对
      if (!key) {
        // 从光标位置开始，向前查找结束引号（key 的右引号）
        for (let i = offset; i >= 0; i--) {
          if (lineContent[i] === '"') {
            // 检查是否是转义的引号
            let escapeCount = 0
            let j = i - 1
            while (j >= 0 && lineContent[j] === '\\') {
              escapeCount++
              j--
            }
            // 如果是偶数个反斜杠（包括0个），说明是真正的引号
            if (escapeCount % 2 === 0) {
              keyEndQuote = i
              break
            }
          }
        }
        
        if (keyEndQuote < 0) {
          return null
        }
        
        // 从结束引号向前查找开始引号（key 的左引号）
        for (let i = keyEndQuote - 1; i >= 0; i--) {
          if (lineContent[i] === '"') {
            // 检查是否是转义的引号
            let escapeCount = 0
            let j = i - 1
            while (j >= 0 && lineContent[j] === '\\') {
              escapeCount++
              j--
            }
            if (escapeCount % 2 === 0) {
              keyStartQuote = i
              break
            }
          }
        }
        
        if (keyStartQuote < 0 || keyStartQuote >= keyEndQuote) {
          return null
        }
        
        // 提取 key（去掉引号）
        key = lineContent.substring(keyStartQuote + 1, keyEndQuote)
      }
      
      if (!key) {
        return null
      }
      

      // 根据当前行的缩进，确定 key 所在的层级
      const currentIndent = lineContent.match(/^\s*/)?.[0]?.length || 0
      const allLines = contentToParse.split('\n')
      const currentLineNum = position.lineNumber - 1 // 转换为 0-based
      
      // 辅助函数：计算当前行在数组中的索引（支持嵌套数组）
      const findArrayIndex = (arrayStartLine: number, targetLine: number, indentLevel: number): number[] => {
        const elementIndent = indentLevel + 2 // 数组元素缩进
        let arrayIndex = 0
        
        for (let i = arrayStartLine + 1; i <= targetLine; i++) {
          const line = allLines[i] || ''
          const lineIndent = line.match(/^\s*/)?.[0]?.length || 0
          const trimmed = line.trim()
          
          // 如果遇到数组结束，停止
          if (lineIndent <= indentLevel && trimmed === ']') {
            break
          }
          
          // 如果缩进等于元素层级，这是一个新元素
          if (lineIndent === elementIndent && !trimmed.match(/^[,}\]\]]/)) {
            // 找到这个元素的结束位置
            let elementEnd = i
            let bracketDepth = 0
            let braceDepth = 0
            let inString = false
            let escapeNext = false
            
            for (let j = i; j < allLines.length; j++) {
              const nextLine = allLines[j] || ''
              const nextIndent = nextLine.match(/^\s*/)?.[0]?.length || 0
              const nextTrimmed = nextLine.trim()
              
              // 计算括号和花括号深度（忽略字符串内的）
              for (let k = 0; k < nextTrimmed.length; k++) {
                const char = nextTrimmed[k]
                if (escapeNext) {
                  escapeNext = false
                  continue
                }
                if (char === '\\') {
                  escapeNext = true
                  continue
                }
                if (char === '"' && !escapeNext) {
                  inString = !inString
                  continue
                }
                if (!inString) {
                  if (char === '[') bracketDepth++
                  if (char === ']') bracketDepth--
                  if (char === '{') braceDepth++
                  if (char === '}') braceDepth--
                }
              }
              
              // 如果缩进回到元素层级或更小，且括号和花括号都闭合，说明元素结束
              if (nextIndent <= elementIndent && bracketDepth === 0 && braceDepth === 0 && !inString) {
                if (nextTrimmed === ']' || nextTrimmed === ',' || (nextTrimmed.startsWith('}') && j > i)) {
                  elementEnd = j
                  break
                }
              }
            }
            
            // 如果目标行在这个元素范围内
            if (targetLine >= i && targetLine <= elementEnd) {
              const result = [arrayIndex]
              
              // 检查这个元素是否是嵌套数组
              if (trimmed.startsWith('[')) {
                // 递归查找嵌套数组索引
                const nested = findArrayIndex(i, targetLine, elementIndent)
                if (nested.length > 0) {
                  result.push(...nested)
                }
              }
              
              return result
            }
            
            arrayIndex++
          }
        }
        
        return []
      }
      
      // 构建路径：向上查找父对象，同时记录数组索引
      // 使用更简单的方法：直接通过 JSON 对象结构来查找，而不是依赖文本解析
      const path: string[] = []
      let currentDepth = currentIndent
      
      // 从当前行向上查找，找到所有父对象的 key
      for (let i = currentLineNum - 1; i >= 0; i--) {
        const line = allLines[i] || ''
        const lineIndent = line.match(/^\s*/)?.[0]?.length || 0
        
        // 如果找到更小的缩进，说明找到了父对象
        if (lineIndent < currentDepth) {
          const trimmedLine = line.trim()
          // 检查是否是对象 key 行（格式：  "key": { 或 "key": [）
          const keyMatch = trimmedLine.match(/^"([^"]+)":\s*[{\[]/)
          if (keyMatch) {
            path.unshift(keyMatch[1])
            currentDepth = lineIndent
          }
        }
      }
      
      // 添加当前 key
      path.push(key)
      
      // 根据路径和行号信息，计算数组索引
      // 策略：从 JSON 对象开始，按照路径访问，当遇到数组时，根据当前行号确定索引
      let target = jsonObj
      const finalPathParts: string[] = []
      
      for (let i = 0; i < path.length; i++) {
        const p = path[i]
        
        // 访问对象属性
        if (target == null || typeof target !== 'object' || !(p in target)) {
          return null
        }
        
        const nextTarget = target[p]
        
        // 如果下一个目标是数组，需要计算当前行在数组中的索引
        if (Array.isArray(nextTarget)) {
          // 找到这个数组在文本中的开始位置
          // 通过向上查找找到包含这个 key 的行
          let arrayKeyLine = -1
          for (let j = currentLineNum; j >= 0; j--) {
            const line = allLines[j] || ''
            if (line.includes(`"${p}"`) && line.includes('[')) {
              arrayKeyLine = j
              break
            }
          }
          
          if (arrayKeyLine >= 0) {
            const arrayKeyIndent = allLines[arrayKeyLine].match(/^\s*/)?.[0]?.length || 0
            const arrayIndices = findArrayIndex(arrayKeyLine, currentLineNum, arrayKeyIndent)
            
            if (arrayIndices.length > 0) {
              // 访问数组索引
              let arrayTarget = nextTarget
              for (let idx = 0; idx < arrayIndices.length; idx++) {
                const arrayIndex = arrayIndices[idx]
                if (arrayIndex < 0 || arrayIndex >= arrayTarget.length) {
                  return null
                }
                arrayTarget = arrayTarget[arrayIndex]
                
                // 如果还有更多索引，继续访问嵌套数组
                if (idx < arrayIndices.length - 1 && !Array.isArray(arrayTarget)) {
                  return null
                }
              }
              
              // 构建路径部分
              const indexStr = arrayIndices.map(idx => `[${idx}]`).join('')
              finalPathParts.push(`${p}${indexStr}`)
              
              if (i === path.length - 1) {
                // 这是最后一个路径，返回值和路径
                const finalPath = finalPathParts.join('.')
                return { path: finalPath, value: arrayTarget }
              }
              
              target = arrayTarget
              continue
            }
          }
        }
        
        // 普通对象属性
        finalPathParts.push(p)
        
        if (i === path.length - 1) {
          // 这是最后一个路径，返回值和路径
          const value = nextTarget
          const finalPath = finalPathParts.join('.')
          return { path: finalPath, value: value }
        }
        
        target = nextTarget
      }
      
      return null
    } catch (err) {
      console.error('Error in getKeyPathAtPosition:', err)
      return null
    }
  }, [content])

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
        setError(`Field path "${path}" not found`)
        return
      }

      const { value, parent, key } = fieldInfo

      // 检查值类型
      const valueType = typeof value
      const valueConstructor = value?.constructor?.name
      
      if (valueType !== 'string') {
        const valueStr = JSON.stringify(value).substring(0, 200)
        setError(`Field "${path}" is not a string (type: ${valueType}, constructor: ${valueConstructor}), cannot expand. Value: ${valueStr}`)
        return
      }

      // 确保值是字符串，然后尝试解析
      const stringValue = String(value)
      try {
        const parsed = JSON.parse(stringValue)
        parent[key] = parsed
        const formatted = JSON.stringify(currentJson, null, indentSize)
        setContent(formatted)
        setParsedJson(currentJson)
        setError(null)
        // 清除缓存的检测结果，强制下次右键时重新检测
        lastDetectedPathRef.current = null
      } catch (parseErr) {
        setError(`Failed to parse JSON string: ${parseErr instanceof Error ? parseErr.message : 'Invalid JSON'}`)
      }
    } catch (err) {
      setError(`Failed to expand field: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [content, getNestedValue, indentSize])

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
        setError(`Field path "${path}" not found`)
        return
      }

      const { value, parent, key } = fieldInfo

      if (typeof value === 'object' && value !== null) {
        // 允许对象和数组
        try {
          const stringified = JSON.stringify(value)
          parent[key] = stringified
          const formatted = JSON.stringify(currentJson, null, indentSize)
          setContent(formatted)
          setParsedJson(currentJson)
          setError(null)
          // 清除缓存的检测结果，强制下次右键时重新检测
          lastDetectedPathRef.current = null
        } catch (stringifyErr) {
          setError(`Failed to stringify: ${stringifyErr instanceof Error ? stringifyErr.message : 'Unknown error'}`)
        }
      } else {
        setError(`Field "${path}" is not an object, cannot compress`)
      }
    } catch (err) {
      setError(`Failed to compress field: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [content, getNestedValue, indentSize])

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
                      const result = getKeyPathAtPosition(editor, position, currentContent)
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
                      const result = getKeyPathAtPosition(editor, pos, currentContent)
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
                    
                    const result = getKeyPathAtPosition(ed, position, currentContent)
                    if (result) {
                      handleExpandField(result.path, currentContent)
                    } else {
                      setError('Unable to detect field at cursor position. Please click on a key name.')
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
                    
                    const result = getKeyPathAtPosition(ed, position, currentContent)
                    if (result) {
                      handleCompressField(result.path, currentContent)
                    } else {
                      setError('Unable to detect field at cursor position. Please click on a key name.')
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
