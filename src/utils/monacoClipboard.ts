type MonacoEditorLike = {
  getSelections?: () => any[] | null
  getSelection?: () => any | null
  executeEdits?: (source: string, edits: any[]) => void
  trigger?: (source: string, handlerId: string, payload: any) => void
  getAction?: (id: string) => { run: () => Promise<void> } | null
}

export async function readClipboardText(): Promise<string | null> {
  // Prefer Electron clipboard when available (works even when navigator.clipboard is blocked).
  try {
    const electron = (window as any)?.require?.('electron')
    const text = electron?.clipboard?.readText?.()
    if (typeof text === 'string') return text
  } catch {
    // ignore
  }

  try {
    if (navigator?.clipboard?.readText) {
      return await navigator.clipboard.readText()
    }
  } catch {
    // ignore
  }

  return null
}

export function insertTextAtSelections(editor: MonacoEditorLike, text: string) {
  const single = editor.getSelection?.() || null
  const selections = editor.getSelections?.() || (single ? [single] : [])
  const validSelections = (selections || []).filter(Boolean)
  if (!validSelections.length) return

  editor.executeEdits?.('clipboard', validSelections.map((range) => ({
    range,
    text,
    forceMoveMarkers: true,
  })))
}

export async function runDefaultPaste(editor: MonacoEditorLike) {
  try {
    const action = editor.getAction?.('editor.action.clipboardPasteAction')
    if (action) {
      await action.run()
      return
    }
  } catch {
    // ignore
  }

  // Fallback (older Monaco versions / edge cases)
  try {
    editor.trigger?.('keyboard', 'editor.action.clipboardPasteAction', null)
  } catch {
    // ignore
  }
}

