import { Box, Typography, Paper, Chip } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface JsonMarkdownPreviewProps {
  error: string | null
  parsedJson: unknown
}

function renderMarkdown(text: string) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        '& h1': { fontSize: '1.5em', fontWeight: 'bold', mt: 1, mb: 1 },
        '& h2': { fontSize: '1.25em', fontWeight: 'bold', mt: 1, mb: 0.75 },
        '& h3': { fontSize: '1.1em', fontWeight: 'bold', mt: 0.75, mb: 0.5 },
        '& p': { mb: 1, lineHeight: 1.6 },
        '& code': {
          bgcolor: 'rgba(0, 0, 0, 0.1)',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          fontFamily: 'monospace',
          fontSize: '0.9em',
        },
        '& pre': { mb: 1, borderRadius: 1, overflow: 'auto' },
        '& ul, & ol': { pl: 2, mb: 1 },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          pl: 1.5,
          ml: 0,
          fontStyle: 'italic',
          color: 'text.secondary',
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          mb: 1,
          fontSize: '0.9em',
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          px: 1,
          py: 0.5,
          textAlign: 'left',
        },
        '& th': {
          bgcolor: 'action.hover',
          fontWeight: 'bold',
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const inline = !match
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ fontSize: '0.85em', margin: '0.5em 0' }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  )
}

function renderValue(value: unknown): JSX.Element {
  if (value === null) {
    return (
      <Typography component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
        null
      </Typography>
    )
  }

  if (value === undefined) {
    return (
      <Typography component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
        undefined
      </Typography>
    )
  }

  if (typeof value === 'string') {
    if (value.length > 0) {
      return (
        <Box sx={{ mt: 1 }}>
          <Chip label="String (Markdown)" size="small" color="primary" sx={{ mb: 1 }} />
          {renderMarkdown(value)}
        </Box>
      )
    }
    return (
      <Typography component="span" sx={{ color: 'success.main' }}>
        ""
      </Typography>
    )
  }

  if (typeof value === 'number') {
    return (
      <Typography component="span" sx={{ color: 'info.main' }}>
        {value}
      </Typography>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <Typography component="span" sx={{ color: 'warning.main' }}>
        {value.toString()}
      </Typography>
    )
  }

  if (Array.isArray(value)) {
    return (
      <Box sx={{ pl: 2 }}>
        <Typography component="span">[</Typography>
        {value.map((item, index) => (
          <Box key={index} sx={{ pl: 2, py: 0.5 }}>
            {renderValue(item)}
            {index < value.length - 1 && <Typography component="span">,</Typography>}
          </Box>
        ))}
        <Typography component="span">]</Typography>
      </Box>
    )
  }

  if (typeof value === 'object') {
    return (
      <Box sx={{ pl: 2 }}>
        <Typography component="span">{'{'}</Typography>
        {Object.entries(value as Record<string, unknown>).map(([k, v], index, arr) => (
          <Box key={k} sx={{ pl: 2, py: 0.5 }}>
            <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
              "{k}":
            </Typography>{' '}
            {renderValue(v)}
            {index < arr.length - 1 && <Typography component="span">,</Typography>}
          </Box>
        ))}
        <Typography component="span">{'}'}</Typography>
      </Box>
    )
  }

  return <Typography component="span">{String(value)}</Typography>
}

export default function JsonMarkdownPreview({ error, parsedJson }: JsonMarkdownPreviewProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2, bgcolor: 'background.paper' }}>
      {error ? (
        <Paper
          sx={{
            p: 2,
            bgcolor: 'error.light',
            color: 'error.contrastText',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            JSON Parse Error
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {error}
          </Typography>
        </Paper>
      ) : parsedJson ? (
        <Box sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>{renderValue(parsedJson)}</Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          Enter JSON data to see Markdown preview...
        </Typography>
      )}
    </Box>
  )
}
