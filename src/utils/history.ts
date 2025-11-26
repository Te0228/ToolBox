const electron = window.require('electron')
const { ipcRenderer } = electron
const fs = window.require('fs')
const path = window.require('path')

export interface HistoryItem {
  id: string
  toolId: string
  content: string
  timestamp: number
  summary?: string
}

class HistoryService {
  private filePath: string | null = null
  private history: HistoryItem[] = []

  async init() {
    if (this.filePath) return

    try {
      const userDataPath = await ipcRenderer.invoke('get-user-data-path')
      this.filePath = path.join(userDataPath, 'history.json')
      this.load()
    } catch (error) {
      console.error('Failed to initialize history service:', error)
    }
  }

  private load() {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      this.history = []
      return
    }

    try {
      const data = fs.readFileSync(this.filePath, 'utf-8')
      this.history = JSON.parse(data)
    } catch (error) {
      console.error('Failed to load history:', error)
      this.history = []
    }
  }

  private save() {
    if (!this.filePath) return

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.history, null, 2))
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }

  getHistory(toolId: string): HistoryItem[] {
    return this.history
      .filter(item => item.toolId === toolId)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  add(toolId: string, content: string, summary?: string) {
    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      toolId,
      content,
      timestamp: Date.now(),
      summary
    }
    
    // Keep only last 50 items per tool to avoid bloating
    const toolHistory = this.getHistory(toolId)
    if (toolHistory.length >= 50) {
      const idsToRemove = toolHistory.slice(49).map(h => h.id)
      this.history = this.history.filter(h => !idsToRemove.includes(h.id))
    }

    this.history.push(newItem)
    this.save()
    return newItem
  }

  delete(id: string) {
    this.history = this.history.filter(item => item.id !== id)
    this.save()
  }
  
  clear(toolId: string) {
    this.history = this.history.filter(item => item.toolId !== toolId)
    this.save()
  }
}

export const historyService = new HistoryService()
