/**
 * Unescape a JSON-encoded string, handling all standard escape sequences.
 * If the input is wrapped in quotes, it attempts JSON.parse first.
 */
export function unescapeJsonString(str: string): string {
  const trimmed = str.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // JSON parse failed, fall through to manual replacement
    }
  }

  return str.replace(/\\(n|r|t|b|f|"|'|\/|\\|u[0-9a-fA-F]{4})/g, (_match, seq: string) => {
    switch (seq) {
      case 'n': return '\n'
      case 'r': return '\r'
      case 't': return '\t'
      case 'b': return '\b'
      case 'f': return '\f'
      case '"': return '"'
      case "'": return "'"
      case '/': return '/'
      case '\\': return '\\'
      default:
        if (seq.startsWith('u')) {
          return String.fromCharCode(parseInt(seq.substring(1), 16))
        }
        return _match
    }
  })
}
