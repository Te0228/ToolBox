import { getAccurateKeyPath } from './jsonPath'
import type { MutableRefObject } from 'react'

/** Refs that the context menu setup needs access to. */
export interface ContextMenuRefs {
  contextMenuPositionRef: MutableRefObject<any>
  lastDetectedPathRef: MutableRefObject<{ path: string; value: unknown } | null>
  handleExpandFieldRef: MutableRefObject<(path: string, editorContent?: string) => void>
  handleCompressFieldRef: MutableRefObject<(path: string, editorContent?: string) => void>
  mutationObserverRef: MutableRefObject<MutationObserver | null>
  observerTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
}

/** Callbacks into the React component for setting state. */
export interface ContextMenuCallbacks {
  setError: (error: string | null) => void
}

/**
 * Set up context-menu related behaviour on the Monaco editor instance:
 * - right-click detection (onMouseDown / onMouseUp) to record the cursor path
 * - "Expand" and "Compress" editor actions
 * - MutationObserver to toggle menu-item visibility based on detected value type
 */
export function setupContextMenu(
  editor: any,
  _monaco: any,
  refs: ContextMenuRefs,
  callbacks: ContextMenuCallbacks,
) {
  const {
    contextMenuPositionRef,
    lastDetectedPathRef,
    handleExpandFieldRef,
    handleCompressFieldRef,
    mutationObserverRef,
    observerTimeoutRef,
  } = refs
  const { setError } = callbacks

  // Helper: read the current editor content (never stale)
  const getEditorContent = (): string => {
    const model = editor.getModel()
    const v = model?.getValue()
    return v !== undefined && v !== null ? v : ''
  }

  // ---- Menu visibility toggling ----

  const updateMenuVisibility = () => {
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

    const tryUpdate = (attempt = 0) => {
      if (attempt > 10) return

      const contextMenu = document.querySelector('.monaco-menu')
      if (!contextMenu) {
        setTimeout(() => tryUpdate(attempt + 1), 20)
        return
      }

      const menuItems = contextMenu.querySelectorAll('.monaco-action-bar .action-item')

      let foundExpand = false
      let foundCompress = false

      menuItems.forEach((item: Element) => {
        const actionLabel = item.querySelector('.action-label')
        if (!actionLabel) return

        const itemText = actionLabel.textContent?.trim() || ''

        const isExpandItem =
          item.getAttribute('data-action-id') === 'expand-json-field' || itemText === 'Expand'
        const isCompressItem =
          item.getAttribute('data-action-id') === 'compress-json-field' || itemText === 'Compress'

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

  // ---- Right-click detection ----

  const detectPathAtPosition = (position: any) => {
    const currentContent = getEditorContent()
    const result = getAccurateKeyPath(editor, position, currentContent)
    if (result) {
      lastDetectedPathRef.current = result
      setTimeout(() => updateMenuVisibility(), 100)
    } else {
      lastDetectedPathRef.current = null
    }
  }

  editor.onMouseDown((e: any) => {
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

      if (position) {
        detectPathAtPosition(position)
      }
    }
  })

  editor.onMouseUp((e: any) => {
    if (e.event && (e.event.button === 2 || e.event.which === 3)) {
      const pos = editor.getPosition()
      if (pos) {
        contextMenuPositionRef.current = pos
        detectPathAtPosition(pos)
      }
    }
  })

  // ---- Editor actions (Expand / Compress) ----

  const runAction = (
    ed: any,
    handlerRef: MutableRefObject<(path: string, editorContent?: string) => void>,
  ) => {
    if (lastDetectedPathRef.current) {
      const { path } = lastDetectedPathRef.current
      const currentContent = getEditorContent()
      if (!currentContent || !currentContent.trim()) {
        setError('Editor content is empty')
        return
      }
      handlerRef.current(path, currentContent)
      return
    }

    const position = contextMenuPositionRef.current || ed.getPosition()
    if (!position) {
      setError('Unable to get cursor position')
      return
    }

    const currentContent = getEditorContent()
    if (!currentContent || !currentContent.trim()) {
      setError('Editor content is empty')
      return
    }

    const result = getAccurateKeyPath(ed, position, currentContent)
    if (result) {
      handlerRef.current(result.path, currentContent)
    } else {
      setError('Cannot detect field at cursor position. Make sure you click on a valid JSON key.')
    }
  }

  editor.addAction({
    id: 'expand-json-field',
    label: 'Expand',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.4,
    run: (ed: any) => runAction(ed, handleExpandFieldRef),
  })

  editor.addAction({
    id: 'compress-json-field',
    label: 'Compress',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run: (ed: any) => runAction(ed, handleCompressFieldRef),
  })

  // ---- MutationObserver for menu appearance ----

  const editorContainer = editor.getContainerDomNode()
  mutationObserverRef.current?.disconnect()

  const observer = new MutationObserver((mutations) => {
    const hasMenuAdded = mutations.some((mutation) => {
      return Array.from(mutation.addedNodes).some((node: any) => {
        return (
          node.nodeType === 1 &&
          (node.classList?.contains('monaco-menu') || node.querySelector?.('.monaco-menu'))
        )
      })
    })

    if (hasMenuAdded) {
      if (observerTimeoutRef.current) {
        clearTimeout(observerTimeoutRef.current)
      }
      observerTimeoutRef.current = setTimeout(() => {
        updateMenuVisibility()
      }, 50)
    }
  })

  observer.observe(editorContainer, { childList: true, subtree: true })
  observer.observe(document.body, { childList: true, subtree: true })
  mutationObserverRef.current = observer

  editor.onDidDispose(() => {
    mutationObserverRef.current?.disconnect()
    mutationObserverRef.current = null
  })
}
