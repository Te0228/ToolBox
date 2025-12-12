import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Box } from '@mui/material'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { ToolHandle } from '../../types/tool'
import CommandSidebar from './CommandSidebar'

interface TerminalProps {
    initialContent?: string | null
}

const Terminal = forwardRef<ToolHandle, TerminalProps>((_props, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<XTerm | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const commandBufferRef = useRef('')

    useImperativeHandle(ref, () => ({
        getContent: () => '',
        clearContent: () => {
            if (xtermRef.current) {
                xtermRef.current.clear()
            }
        }
    }))

    useEffect(() => {
        if (!terminalRef.current || xtermRef.current) return

        // Create terminal instance
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'Fira Code', 'Courier New', monospace",
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#d4d4d4',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5',
            },
            allowProposedApi: true,
            scrollback: 1000,
            scrollOnUserInput: true,
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)

        term.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current = term
        fitAddonRef.current = fitAddon

        // Welcome message
        const platform = window.require('os').platform()
        const shell = platform === 'win32' ? 'PowerShell' : process.env.SHELL || 'bash'
        term.writeln('\x1b[1;32m╔════════════════════════════════════════╗\x1b[0m')
        term.writeln('\x1b[1;32m║      Welcome to ToolBox Terminal      ║\x1b[0m')
        term.writeln('\x1b[1;32m╚════════════════════════════════════════╝\x1b[0m')
        term.writeln('')
        term.writeln(`\x1b[36mShell: ${shell}\x1b[0m`)
        term.writeln(`\x1b[36mPlatform: ${platform}\x1b[0m`)
        term.writeln('')
        term.write('$ ')

        // Handle terminal input
        term.onData((data) => {
            const code = data.charCodeAt(0)

            // Handle Enter key
            if (code === 13) {
                term.writeln('')
                const command = commandBufferRef.current.trim()

                if (command) {
                    executeCommand(command, term)
                } else {
                    term.write('$ ')
                }

                commandBufferRef.current = ''
            }
            // Handle Backspace
            else if (code === 127) {
                if (commandBufferRef.current.length > 0) {
                    commandBufferRef.current = commandBufferRef.current.slice(0, -1)
                    term.write('\b \b')
                }
            }
            // Handle Ctrl+C
            else if (code === 3) {
                term.writeln('^C')
                commandBufferRef.current = ''
                term.write('$ ')
            }
            // Handle Ctrl+L (clear)
            else if (code === 12) {
                term.clear()
                term.write('$ ' + commandBufferRef.current)
            }
            // Regular character input
            else {
                commandBufferRef.current += data
                term.write(data)
            }
        })

        // Handle window resize
        const handleResize = () => {
            fitAddon.fit()
        }

        window.addEventListener('resize', handleResize)

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize)
            term.dispose()
            xtermRef.current = null
        }
    }, [])

    const executeCommand = async (command: string, term: XTerm) => {
        try {
            const { ipcRenderer } = window.require('electron')

            // Send command to main process
            const result = await ipcRenderer.invoke('terminal:execute', command)

            if (result.error) {
                term.writeln(`\x1b[31m${result.error}\x1b[0m`)
            } else {
                if (result.stdout) {
                    term.writeln(result.stdout)
                }
                if (result.stderr) {
                    term.writeln(`\x1b[33m${result.stderr}\x1b[0m`)
                }
            }
        } catch (error) {
            term.writeln(`\x1b[31mError: ${error}\x1b[0m`)
        }

        term.write('$ ')
    }

    const handleCommandClick = (command: string) => {
        if (xtermRef.current) {
            // Clear current input
            const currentLength = commandBufferRef.current.length
            for (let i = 0; i < currentLength; i++) {
                xtermRef.current.write('\b \b')
            }

            // Write new command
            commandBufferRef.current = command
            xtermRef.current.write(command)
        }
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', bgcolor: 'background.paper', overflow: 'hidden' }}>
            <CommandSidebar onCommandClick={handleCommandClick} />
            <Box
                sx={{
                    flex: 1,
                    bgcolor: '#1e1e1e',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }}
            >
                <Box
                    ref={terminalRef}
                    sx={{
                        flex: 1,
                        padding: '8px',
                        paddingBottom: '24px',
                        overflow: 'hidden',
                        '& .xterm': {
                            height: '100% !important',
                            padding: 0,
                        },
                        '& .xterm-viewport': {
                            width: '100% !important',
                        },
                        '& .xterm-screen': {
                            paddingBottom: '20px',
                        }
                    }}
                />
            </Box>
        </Box>
    )
})

export default Terminal
