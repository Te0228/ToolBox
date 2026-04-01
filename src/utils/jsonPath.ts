import { getLocation } from 'jsonc-parser'

// ---------------------------------------------------------------------------
// Path parsing & object traversal (used by expand / compress features)
// ---------------------------------------------------------------------------

/**
 * Parse a path string like "data[0].name" into an array of
 * string (object key) and number (array index) segments.
 */
export function parsePathString(path: string): (string | number)[] {
  const parts: (string | number)[] = []
  let current = ''
  let i = 0

  while (i < path.length) {
    if (path[i] === '.') {
      if (current) { parts.push(current); current = '' }
    } else if (path[i] === '[') {
      if (current) { parts.push(current); current = '' }
      const close = path.indexOf(']', i)
      if (close !== -1) {
        const n = parseInt(path.substring(i + 1, close), 10)
        if (!isNaN(n)) parts.push(n)
        i = close
      }
    } else {
      current += path[i]
    }
    i++
  }
  if (current) parts.push(current)
  return parts
}

/**
 * Convert a segments array like ["users", 0, "name"] to a display string
 * like "users[0].name".
 */
export function segmentsToPath(segments: (string | number)[]): string {
  let out = ''
  for (const seg of segments) {
    if (typeof seg === 'number') {
      out += `[${seg}]`
    } else {
      out += out ? `.${seg}` : seg
    }
  }
  return out
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

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null
    parent = current

    if (typeof part === 'number') {
      if (!Array.isArray(current) || part < 0 || part >= current.length) return null
      key = String(part)
      current = current[part]
    } else {
      if (!(part in current)) return null
      key = part
      current = current[part]
    }
  }

  return { value: current, parent, key }
}

// ---------------------------------------------------------------------------
// Cursor path detection (used by status bar & context menu)
// ---------------------------------------------------------------------------

/** Minimal editor interface needed by getAccurateKeyPath. */
export interface MinimalEditor {
  getModel(): { getOffsetAt(pos: { lineNumber: number; column: number }): number } | null
}

/**
 * Detect the JSON key-path at a given cursor position using
 * `jsonc-parser.getLocation`.  Returns the dot/bracket path string and
 * the corresponding runtime value, or `null` when no path can be determined.
 */
export function getAccurateKeyPath(
  editor: MinimalEditor,
  position: { lineNumber: number; column: number },
  jsonContent: string,
): { path: string; value: unknown } | null {
  if (!jsonContent.trim()) return null

  try {
    const model = editor.getModel()
    if (!model) return null

    const offset = model.getOffsetAt(position)
    const location = getLocation(jsonContent, offset)

    // getLocation returns an empty path for the root or whitespace outside any property
    if (!location.path.length) return null

    // Resolve the runtime value along the path
    const jsonObj = JSON.parse(jsonContent)
    let current: any = jsonObj
    for (const seg of location.path) {
      if (current == null || typeof current !== 'object') return null
      if (typeof seg === 'number') {
        if (!Array.isArray(current) || seg >= current.length) return null
      } else if (!(seg in current)) {
        return null
      }
      current = current[seg]
    }

    return { path: segmentsToPath(location.path), value: current }
  } catch {
    return null
  }
}
