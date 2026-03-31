import type { editor } from 'monaco-editor'

/** Shared Monaco editor options used by all tool editors. */
export const baseEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  fontFamily: "'Fira Code', monospace",
  fontSize: 14,
  formatOnPaste: true,
  formatOnType: true,
  contextmenu: true,
}
