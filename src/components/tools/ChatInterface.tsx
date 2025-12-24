import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    TextField,
    CircularProgress,
    Button,
    Avatar,
    Card
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [defaultModelStatus, setDefaultModelStatus] = useState<{ exists: boolean, path: string | null }>({ exists: false, path: null });
    const [lastModelPath, setLastModelPath] = useState<string | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');

        const onProgress = (_event: any, progress: number) => {
            setDownloadProgress(progress);
        };

        const onToken = (_event: any, token: string) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...lastMsg, content: lastMsg.content + token };
                    return newMsgs;
                } else {
                    return [...prev, { role: 'assistant', content: token }];
                }
            });
        };

        // Initialize and check status
        const checkStatus = async () => {
            try {
                const status = await ipcRenderer.invoke('chat:init');
                if (status.isLoaded) {
                    setModelLoaded(true);
                    setMessages([{ role: 'system', content: "Model Active (Restored)" }]);
                }

                if (status.lastModelPath) {
                    setLastModelPath(status.lastModelPath);
                }

                if (status.defaultModelExists) {
                    setDefaultModelStatus({ exists: true, path: status.defaultModelPath });
                }

            } catch (e) {
                console.error("Init check failed", e);
            }
        };

        checkStatus();

        ipcRenderer.on('chat:download-progress', onProgress);
        ipcRenderer.on('chat:token', onToken);

        return () => {
            ipcRenderer.removeListener('chat:download-progress', onProgress);
            ipcRenderer.removeListener('chat:token', onToken);
        };
    }, []);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');
            const result = await ipcRenderer.invoke('chat:send', input);

            if (result.error) {
                setMessages(prev => [...prev, { role: 'system', content: `Error: ${result.error}` }]);
            } else if (result.response) {
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last.role === 'assistant') {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1] = { role: 'assistant', content: result.response };
                        return newMsgs;
                    } else {
                        return [...prev, { role: 'assistant', content: result.response }];
                    }
                });
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${error.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDefault = async () => {
        setDownloadProgress(0);
        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');
            const userDataPath = await ipcRenderer.invoke('get-user-data-path');
            const modelPath = `${userDataPath}/models/`;

            const result = await ipcRenderer.invoke('chat:download-model', modelPath);
            console.log('[Chat] Download result:', result);

            if (result && result.success) {
                setDownloadProgress(null);
                // Auto load
                await ipcRenderer.invoke('chat:load-model', result.path);
                setModelLoaded(true);
                setMessages(prev => [...prev, { role: 'system', content: "Model loaded successfully. You can now chat." }]);
            } else {
                const errorMsg = result?.error || "Unknown error";
                setDownloadProgress(null);
                setMessages(prev => [...prev, { role: 'system', content: `Download failed: ${errorMsg}` }]);
            }
        } catch (e: any) {
            setDownloadProgress(null);
            setMessages(prev => [...prev, { role: 'system', content: `Download failed: ${e.message || e.error || JSON.stringify(e)}` }]);
        }
    };

    // Extracted load logic
    const handleLoadModel = async (path: string) => {
        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');
            const loadResult = await ipcRenderer.invoke('chat:load-model', path);
            if (loadResult.success) {
                setModelLoaded(true);
                setMessages(prev => [...prev, { role: 'system', content: `Model loaded successfully.` }]);
            } else {
                setMessages(prev => [...prev, { role: 'system', content: `Failed to load model: ${loadResult.error}` }]);
            }
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'system', content: `Error loading model: ${e.message}` }]);
        }
    };

    const handlePickModel = async () => {
        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');
            const result = await ipcRenderer.invoke('chat:pick-model');

            if (result.canceled) return;

            if (result.path) {
                const loadResult = await ipcRenderer.invoke('chat:load-model', result.path);
                if (loadResult.success) {
                    setModelLoaded(true);
                    setMessages(prev => [...prev, { role: 'system', content: `Model loaded: ${result.path}` }]);
                } else {
                    setMessages(prev => [...prev, { role: 'system', content: `Failed to load model: ${loadResult.error}` }]);
                }
            } else if (result.error) {
                setMessages(prev => [...prev, { role: 'system', content: `Selection error: ${result.error}` }]);
            }
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'system', content: `Error: ${e.message}` }]);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>

            {/* Header / Status Bar */}
            <Paper elevation={0} square sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">AI Assistant</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {!modelLoaded && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {lastModelPath && (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    onClick={() => handleLoadModel(lastModelPath)}
                                    disabled={downloadProgress !== null}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Load Last Used
                                </Button>
                            )}

                            <Button
                                variant={defaultModelStatus.exists ? "outlined" : "contained"}
                                size="small"
                                startIcon={downloadProgress !== null ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
                                onClick={defaultModelStatus.exists ? () => handleLoadModel(defaultModelStatus.path!) : handleDownloadDefault}
                                disabled={downloadProgress !== null}
                                sx={{ textTransform: 'none' }}
                            >
                                {downloadProgress !== null ? `Downloading ${downloadProgress.toFixed(0)}%` : (defaultModelStatus.exists ? "Load Default Model" : "Download Default")}
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<FolderOpenIcon />}
                                onClick={handlePickModel}
                                disabled={downloadProgress !== null}
                                sx={{ textTransform: 'none' }}
                            >
                                Select Local
                            </Button>
                        </Box>
                    )}
                    {modelLoaded && (
                        <Typography variant="caption" color="success.main" fontWeight="bold">
                            ● Model Active
                        </Typography>
                    )}
                </Box>
            </Paper>

            {/* Chat Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {messages.length === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                        <SmartToyIcon sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h6">How can I help you today?</Typography>
                    </Box>
                )}

                {messages.map((msg, index) => (
                    <Box
                        key={index}
                        sx={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            width: '100%',
                            gap: 2
                        }}
                    >
                        {msg.role !== 'user' && (
                            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                {msg.role === 'assistant' ? <SmartToyIcon fontSize="small" /> : 'S'}
                            </Avatar>
                        )}

                        <Card
                            elevation={1}
                            sx={{
                                p: 2,
                                maxWidth: '80%',
                                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                '& p': { m: 0 }
                            }}
                        >
                            {msg.role === 'system' ? (
                                <Typography variant="body2" color="error">{msg.content}</Typography>
                            ) : (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code(props) {
                                            const { children, className, node, ...rest } = props
                                            const match = /language-(\w+)/.exec(className || '')
                                            return match ? (
                                                // @ts-ignore
                                                <SyntaxHighlighter
                                                    {...rest}
                                                    PreTag="div"
                                                    children={String(children).replace(/\n$/, '')}
                                                    language={match[1]}
                                                    style={vscDarkPlus}
                                                    customStyle={{ margin: '0.5em 0', borderRadius: '4px' }}
                                                />
                                            ) : (
                                                <code {...rest} className={className} style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {String(msg.content || '')}
                                </ReactMarkdown>
                            )}
                        </Card>

                        {msg.role === 'user' && (
                            <Avatar sx={{ bgcolor: 'primary.dark', width: 32, height: 32 }}>
                                <PersonIcon fontSize="small" />
                            </Avatar>
                        )}
                    </Box>
                ))}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Paper elevation={0} square sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', maxWidth: 'md', mx: 'auto' }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        disabled={loading || !modelLoaded}
                        multiline
                        maxRows={4}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: 'background.default'
                            }
                        }}
                    />
                    <IconButton
                        color="primary"
                        onClick={handleSend}
                        disabled={loading || !modelLoaded || !input.trim()}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 48,
                            height: 48,
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                    </IconButton>
                </Box>
            </Paper>
        </Box>
    );
};

export default ChatInterface;
