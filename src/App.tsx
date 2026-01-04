import { useState, useRef, useEffect } from 'react'
import { Box } from '@mui/material'
import Toolbar, { Tool } from './components/Toolbar'
import HistorySidebar from './components/HistorySidebar'
import JsonEditor from './components/tools/JsonEditor'
import JsonStringToJson from './components/tools/JsonStringToJson'
import JsonToJsonString from './components/tools/JsonToJsonString'
import MarkdownEditor from './components/tools/MarkdownEditor'
import Terminal from './components/tools/Terminal'
import WebBrowser from './components/tools/WebBrowser'
import { historyService } from './utils/history'
import { ToolHandle } from './types/tool'


function App() {
  const [activeTool, setActiveTool] = useState<Tool>('json-editor')
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [loadedContent, setLoadedContent] = useState<string | null>(null)
  const [refreshHistory, setRefreshHistory] = useState(0)
  
  // 为每个工具保存独立的 ref
  const toolRefs = useRef<Record<Tool, ToolHandle | null>>({
    'json-editor': null,
    'json-string-to-json': null,
    'json-to-json-string': null,
    'markdown-editor': null,
    'terminal': null,
    'browser': null,
    'placeholder': null
  })
  
  // 保存每个工具的内容状态
  const [toolContents, setToolContents] = useState<Record<Tool, string>>({
    'json-editor': '',
    'json-string-to-json': '',
    'json-to-json-string': '',
    'markdown-editor': '',
    'terminal': '',
    'browser': '',
    'placeholder': ''
  })

  // 切换工具时清空历史选择
  useEffect(() => {
    setSelectedHistoryId(null)
    setLoadedContent(null)
  }, [activeTool])

  const handleHistorySelect = (id: string) => {
    // Find the history item by ID
    const allHistory = historyService.getHistory(activeTool)
    const item = allHistory.find(h => h.id === id)
    if (item) {
      setSelectedHistoryId(id)
      setLoadedContent(item.content)
      // 更新当前工具的内容
      setToolContents(prev => ({
        ...prev,
        [activeTool]: item.content
      }))
    }
  }

  const handleCreateHistory = () => {
    const currentRef = toolRefs.current[activeTool]
    const content = currentRef?.getContent()
    if (content && content.trim()) {
      historyService.add(activeTool, content)
      setRefreshHistory(prev => prev + 1)
      // Clear the tool content after saving
      currentRef?.clearContent()
      setSelectedHistoryId(null)
      setLoadedContent(null)
      // 清空当前工具的内容状态
      setToolContents(prev => ({
        ...prev,
        [activeTool]: ''
      }))
    }
  }
  
  // 当工具内容变化时更新状态
  const handleContentChange = (tool: Tool, content: string) => {
    setToolContents(prev => ({
      ...prev,
      [tool]: content
    }))
  }

  const renderAllTools = () => {
    const tools: Array<{ id: Tool; component: JSX.Element }> = [
      {
        id: 'json-editor',
        component: (
          <JsonEditor
            initialContent={toolContents['json-editor']}
            ref={(ref) => { toolRefs.current['json-editor'] = ref }}
          />
        )
      },
      {
        id: 'json-string-to-json',
        component: (
          <JsonStringToJson
            initialContent={toolContents['json-string-to-json']}
            ref={(ref) => { toolRefs.current['json-string-to-json'] = ref }}
          />
        )
      },
      {
        id: 'json-to-json-string',
        component: (
          <JsonToJsonString
            initialContent={toolContents['json-to-json-string']}
            ref={(ref) => { toolRefs.current['json-to-json-string'] = ref }}
          />
        )
      },
      {
        id: 'markdown-editor',
        component: (
          <MarkdownEditor
            initialContent={toolContents['markdown-editor']}
            ref={(ref) => { toolRefs.current['markdown-editor'] = ref }}
          />
        )
      },
      {
        id: 'terminal',
        component: (
          <Terminal
            initialContent={toolContents['terminal']}
            ref={(ref) => { toolRefs.current['terminal'] = ref }}
          />
        )
      },
      {
        id: 'browser',
        component: <WebBrowser />
      }
    ]

    return tools.map(({ id, component }) => (
      <Box
        key={id}
        sx={{
          display: activeTool === id ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          width: '100%'
        }}
      >
        {component}
      </Box>
    ))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {activeTool !== 'terminal' && activeTool !== 'browser' && (
          <HistorySidebar
            activeTool={activeTool}
            selectedHistoryId={selectedHistoryId}
            onSelect={handleHistorySelect}
            onCreate={handleCreateHistory}
            refreshTrigger={refreshHistory}
          />
        )}
        <Box component="main" sx={{ flex: 1, overflow: 'hidden', position: 'relative', bgcolor: 'background.paper' }}>
          {renderAllTools()}
        </Box>
      </Box>
    </Box>
  )
}

export default App
