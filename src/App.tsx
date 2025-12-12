import { useState, useRef, useEffect } from 'react'
import { Box } from '@mui/material'
import Toolbar, { Tool } from './components/Toolbar'
import HistorySidebar from './components/HistorySidebar'
import JsonEditor from './components/tools/JsonEditor'
import JsonStringToJson from './components/tools/JsonStringToJson'
import JsonToJsonString from './components/tools/JsonToJsonString'
import ChatInterface from './components/tools/ChatInterface'
import Terminal from './components/tools/Terminal'
import { historyService } from './utils/history'
import { ToolHandle } from './types/tool'


function App() {
  const [activeTool, setActiveTool] = useState<Tool>('json-editor')
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [loadedContent, setLoadedContent] = useState<string | null>(null)
  const [refreshHistory, setRefreshHistory] = useState(0)
  const toolRef = useRef<ToolHandle>(null)

  // Clear selection and content when switching tools
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
    }
  }

  const handleCreateHistory = () => {
    const content = toolRef.current?.getContent()
    if (content && content.trim()) {
      historyService.add(activeTool, content)
      setRefreshHistory(prev => prev + 1)
      // Clear the tool content after saving
      toolRef.current?.clearContent()
      setSelectedHistoryId(null)
      setLoadedContent(null)
    }
  }

  const renderTool = () => {
    const key = loadedContent ? `loaded-${selectedHistoryId}` : 'default';
    const commonProps = {
      initialContent: loadedContent,
      ref: toolRef,
    }

    switch (activeTool) {
      case 'json-editor':
        return <JsonEditor key={key} {...commonProps} />
      case 'json-string-to-json':
        return <JsonStringToJson key={key} {...commonProps} />
      case 'json-to-json-string':
        return <JsonToJsonString key={key} {...commonProps} />
      case 'terminal':
        return <Terminal key={key} {...commonProps} />
      case 'chat':
        return <ChatInterface />
      default:
        return <div className="tool-placeholder">Tool coming soon...</div>
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {activeTool !== 'terminal' && (
          <HistorySidebar
            activeTool={activeTool}
            selectedHistoryId={selectedHistoryId}
            onSelect={handleHistorySelect}
            onCreate={handleCreateHistory}
            refreshTrigger={refreshHistory}
          />
        )}
        <Box component="main" sx={{ flex: 1, overflow: 'hidden', position: 'relative', bgcolor: 'background.paper' }}>
          {renderTool()}
        </Box>
      </Box>
    </Box>
  )
}

export default App
