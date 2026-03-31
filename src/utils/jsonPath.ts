import { parseTree, findNodeAtOffset, Node } from 'jsonc-parser'

/**
 * Parse a path string like "data[0].name" or "[1][0].data" into an array of
 * string (object key) and number (array index) segments.
 */
export function parsePathString(path: string): (string | number)[] {
  const parts: (string | number)[] = []
  let current = ''
  let i = 0

  while (i < path.length) {
    if (path[i] === '.') {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else if (path[i] === '[') {
      if (current) {
        parts.push(current)
        current = ''
      }
      const closeIndex = path.indexOf(']', i)
      if (closeIndex !== -1) {
        const indexStr = path.substring(i + 1, closeIndex)
        const index = parseInt(indexStr, 10)
        if (!isNaN(index)) {
          parts.push(index)
        }
        i = closeIndex
      }
    } else {
      current += path[i]
    }
    i++
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

/**
 * Traverse an object along the given dot/bracket path and return the value,
 * its parent container, and the key used to reach it.
 */
export function getNestedValue(
  obj: unknown,
  path: string,
): { value: unknown; parent: unknown; key: string } | null {
  const parts = parsePathString(path)
  if (parts.length === 0) return null

  let current: any = obj
  let parent: any = obj
  let key = ''

  for (let i = 0; i < parts.length; i++) {
    if (current == null || typeof current !== 'object') {
      return null
    }
    const part = parts[i]
    parent = current

    if (typeof part === 'number') {
      if (!Array.isArray(current) || part < 0 || part >= current.length) {
        return null
      }
      key = String(part)
      current = current[part]
    } else {
      if (!(part in current)) {
        return null
      }
      key = part
      current = current[part]
    }
  }

  return { value: current, parent, key }
}

/** Position-like object expected by getAccurateKeyPath (matches Monaco IPosition). */
export interface EditorPosition {
  lineNumber: number
  column: number
}

/** Minimal editor model interface needed for offset calculation. */
export interface EditorModel {
  getOffsetAt(position: EditorPosition): number
}

/** Minimal editor interface needed by getAccurateKeyPath. */
export interface MinimalEditor {
  getModel(): EditorModel | null
}

/**
 * Use the jsonc-parser AST to detect the JSON key-path at a given cursor
 * position inside `jsonContent`. Returns the dot/bracket path string and the
 * corresponding runtime value, or `null` when no path can be determined.
 */
export function getAccurateKeyPath(
  editor: MinimalEditor,
  position: EditorPosition,
  jsonContent: string,
): { path: string; value: unknown } | null {
  if (!jsonContent.trim()) return null

  try {
    const jsonObj = JSON.parse(jsonContent)
    const tree = parseTree(jsonContent)
    if (!tree) return null

    const model = editor.getModel()
    if (!model) return null

    const offset = model.getOffsetAt(position)

    // 1. Expand search radius: look for a valid node near the cursor
    let node: Node | null = null
    const searchRadius = 20

    // Try exact position first
    node = findNodeAtOffset(tree, offset, true) ?? null

    // If not found, search backwards
    if (!node) {
      for (let i = 1; i <= searchRadius; i++) {
        if (offset - i >= 0) {
          node = findNodeAtOffset(tree, offset - i, true) ?? null
          if (node) break
        }
      }

      // Then search forwards
      if (!node) {
        for (let i = 1; i <= searchRadius; i++) {
          if (offset + i < jsonContent.length) {
            node = findNodeAtOffset(tree, offset + i, true) ?? null
            if (node) break
          }
        }
      }
    }

    if (!node) return null

    // 2. Build the path by walking up from the target node
    const buildAccuratePath = (
      targetNode: Node,
    ): { path: string; value: unknown } | null => {
      const pathSegments: (string | number)[] = []
      let current: Node | null = targetNode

      while (current && current.parent) {
        const parent: Node = current.parent

        if (parent.type === 'array') {
          const index = parent.children?.indexOf(current) ?? -1
          if (index >= 0) {
            pathSegments.unshift(index)
          }
        } else if (parent.type === 'property') {
          const keyNode = parent.children?.[0]
          if (keyNode?.type === 'string') {
            pathSegments.unshift(keyNode.value as string)
          }
        }

        current = parent
      }

      if (pathSegments.length === 0) return null

      // 3. Build path string (correctly handling array indices)
      let pathStr = ''
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        if (typeof segment === 'number') {
          if (i > 0 && typeof pathSegments[i - 1] === 'string') {
            const prevPath = pathStr.split('.').slice(0, -1).join('.')
            const lastSegment = pathStr.split('.').pop() || ''
            pathStr = prevPath
              ? `${prevPath}.${lastSegment}[${segment}]`
              : `${lastSegment}[${segment}]`
          } else {
            pathStr += `[${segment}]`
          }
        } else {
          pathStr += (pathStr ? '.' : '') + segment
        }
      }

      // 4. Validate the path and retrieve the value
      try {
        let currentValue: any = jsonObj
        const pathParts = parsePathString(pathStr)

        for (const part of pathParts) {
          if (typeof part === 'number') {
            if (!Array.isArray(currentValue) || part >= currentValue.length) {
              return null
            }
            currentValue = currentValue[part]
          } else {
            if (
              currentValue === null ||
              typeof currentValue !== 'object' ||
              !(part in currentValue)
            ) {
              return null
            }
            currentValue = currentValue[part]
          }
        }

        return { path: pathStr, value: currentValue }
      } catch {
        return null
      }
    }

    return buildAccuratePath(node)
  } catch (err) {
    console.error('Enhanced path detection error:', err)
    return null
  }
}
