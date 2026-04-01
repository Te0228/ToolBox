import { useState, useRef, useCallback } from 'react'
import { Box } from '@mui/material'
import Toolbar, { Tool } from './components/Toolbar'
import HistorySidebar from './components/HistorySidebar'
import JsonEditor from './components/tools/JsonEditor'
import MarkdownEditor from './components/tools/MarkdownEditor'
import { historyService } from './utils/history'
import { ToolHandle } from './types/tool'

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('json-editor')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [refreshHistory, setRefreshHistory] = useState(0)

  const toolRefs = useRef<Record<Tool, ToolHandle | null>>({
    'json-editor': null,
    'markdown-editor': null,
  })

  const [toolContents, setToolContents] = useState<Record<Tool, string>>({
    'json-editor': '',
    'markdown-editor': '',
  })

  /** Save the current editor content into history (create or update). */
  const saveCurrentSession = useCallback(() => {
    const currentRef = toolRefs.current[activeTool]
    const content = currentRef?.getContent() || ''

    if (activeSessionId) {
      historyService.update(activeSessionId, content)
    } else if (content && content.trim()) {
      const item = historyService.create(activeTool, content)
      if (item) {
        setActiveSessionId(item.id)
      }
    }
    setRefreshHistory(prev => prev + 1)
  }, [activeTool, activeSessionId])

  const handleToolChange = useCallback((tool: Tool) => {
    if (tool === activeTool) return
    saveCurrentSession()
    setActiveTool(tool)

    const history = historyService.getHistory(tool)
    if (history.length > 0) {
      const latest = history[0]
      setActiveSessionId(latest.id)
      setToolContents(prev => ({ ...prev, [tool]: latest.content }))
    } else {
      setActiveSessionId(null)
      setToolContents(prev => ({ ...prev, [tool]: '' }))
    }
  }, [activeTool, saveCurrentSession])

  const handleHistorySelect = useCallback((id: string) => {
    saveCurrentSession()

    const item = historyService.getById(id)
    if (item) {
      setActiveSessionId(id)
      setToolContents(prev => ({
        ...prev,
        [activeTool]: item.content
      }))
    }
  }, [activeTool, saveCurrentSession])

  const handleNew = useCallback(() => {
    saveCurrentSession()
    setActiveSessionId(null)
    toolRefs.current[activeTool]?.clearContent()
    setToolContents(prev => ({
      ...prev,
      [activeTool]: ''
    }))
  }, [activeTool, saveCurrentSession])

  const jsonEditorRef = useCallback((ref: ToolHandle | null) => { toolRefs.current['json-editor'] = ref }, [])
  const markdownEditorRef = useCallback((ref: ToolHandle | null) => { toolRefs.current['markdown-editor'] = ref }, [])

  const renderAllTools = () => {
    const tools: Array<{ id: Tool; component: JSX.Element }> = [
      {
        id: 'json-editor',
        component: (
          <JsonEditor
            initialContent={toolContents['json-editor']}
            activeSessionId={activeSessionId}
            ref={jsonEditorRef}
          />
        )
      },
      {
        id: 'markdown-editor',
        component: (
          <MarkdownEditor
            initialContent={toolContents['markdown-editor']}
            activeSessionId={activeSessionId}
            ref={markdownEditorRef}
          />
        )
      },
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
      <Toolbar activeTool={activeTool} onToolChange={handleToolChange} />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <HistorySidebar
          activeTool={activeTool}
          activeSessionId={activeSessionId}
          onSelect={handleHistorySelect}
          onNew={handleNew}
          onDelete={(id) => {
            historyService.delete(id)
            if (id === activeSessionId) {
              setActiveSessionId(null)
              toolRefs.current[activeTool]?.clearContent()
              setToolContents(prev => ({ ...prev, [activeTool]: '' }))
            }
            setRefreshHistory(prev => prev + 1)
          }}
          onClear={() => {
            setActiveSessionId(null)
            toolRefs.current[activeTool]?.clearContent()
            setToolContents(prev => ({ ...prev, [activeTool]: '' }))
            setRefreshHistory(prev => prev + 1)
          }}
          refreshTrigger={refreshHistory}
        />
        <Box component="main" sx={{ flex: 1, overflow: 'hidden', position: 'relative', bgcolor: 'background.paper' }}>
          {renderAllTools()}
        </Box>
      </Box>
    </Box>
  )
}

export default App
