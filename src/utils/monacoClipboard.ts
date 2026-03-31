import type { editor, KeyMod, KeyCode } from 'monaco-editor'

type IStandaloneCodeEditor = editor.IStandaloneCodeEditor

export async function readClipboardText(): Promise<string | null> {
  try {
    const electron = (window as any)?.require?.('electron')
    if (electron?.clipboard) {
      const text = electron.clipboard.readText()
      if (typeof text === 'string') return text
    }
  } catch {
    // not available
  }

  try {
    if (navigator?.clipboard?.readText) {
      return await navigator.clipboard.readText()
    }
  } catch {
    // not available
  }

  return null
}

export function insertTextAtSelections(ed: IStandaloneCodeEditor, text: string) {
  const single = ed.getSelection()
  const selections = ed.getSelections() || (single ? [single] : [])
  if (!selections.length) return

  ed.executeEdits('clipboard', selections.map((range) => ({
    range,
    text,
    forceMoveMarkers: true,
  })))
}

async function runDefaultPaste(ed: IStandaloneCodeEditor) {
  try {
    const action = ed.getAction('editor.action.clipboardPasteAction')
    if (action) {
      await action.run()
      return
    }
  } catch {
    // ignored
  }
  try {
    ed.trigger('keyboard', 'editor.action.clipboardPasteAction', null)
  } catch {
    // ignored
  }
}

/**
 * Set up paste (Cmd/Ctrl+V) for a Monaco editor inside Electron.
 *
 * Uses addCommand (Monaco keybinding) as primary handler and onKeyDown
 * (DOM level) as backup for macOS where the native Edit menu can
 * intercept Cmd+V before Monaco keybindings fire.
 * A timestamp guard prevents double-paste when both fire.
 */
export function setupPasteHandler(
  ed: IStandaloneCodeEditor,
  monaco: { KeyMod: typeof KeyMod; KeyCode: typeof KeyCode },
  transform?: (text: string) => string,
) {
  let lastPasteTs = 0

  const doPaste = async () => {
    const now = Date.now()
    if (now - lastPasteTs < 100) return
    lastPasteTs = now

    const text = await readClipboardText()
    if (typeof text === 'string') {
      insertTextAtSelections(ed, transform ? transform(text) : text)
      return
    }
    await runDefaultPaste(ed)
  }

  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
    void doPaste()
  })

  ed.onKeyDown((e: any) => {
    if (!(e?.keyCode === monaco.KeyCode.KeyV && (e?.metaKey || e?.ctrlKey))) return
    e.preventDefault?.()
    e.stopPropagation?.()
    void doPaste()
  })
}
