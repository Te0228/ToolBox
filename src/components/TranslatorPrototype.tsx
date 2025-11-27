import { useState, useRef, useEffect } from 'react';
import { Wllama } from '@wllama/wllama';

const CONFIG = {
    // Using Qwen 3 0.6B Instruct from lm-kit (Q8_0 quantization) - ~805MB
    modelUrl: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf?download=true',
    wasmPath: '/wllama/wllama-single.wasm',
    workerPath: '/wllama/wllama.js',
};

export const TranslatorPrototype = () => {
    const [status, setStatus] = useState('Idle');
    const [progress, setProgress] = useState(0);
    const [output, setOutput] = useState('');
    const [input, setInput] = useState('Hello, how are you?');
    const [isTranslating, setIsTranslating] = useState(false);
    const wllamaRef = useRef<Wllama | null>(null);
    const shouldStopRef = useRef(false);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (wllamaRef.current) {
                console.log('Unloading Wllama...');
                wllamaRef.current.exit();
                wllamaRef.current = null;
            }
        };
    }, []);

    const initWllama = async () => {
        if (wllamaRef.current) return; // Already loaded

        try {
            setStatus('Loading Wllama...');
            setProgress(0);
            wllamaRef.current = new Wllama({
                'single-thread/wllama.wasm': CONFIG.wasmPath,
                'multi-thread/wllama.wasm': CONFIG.wasmPath,
            });

            setStatus('Downloading Model...');
            await wllamaRef.current.loadModelFromUrl(CONFIG.modelUrl, {
                n_ctx: 2048,
                progressCallback: ({ loaded, total }) => {
                    const percent = Math.round((loaded / total) * 100);
                    setProgress(percent);
                    setStatus(`Downloading Model: ${percent}%`);
                },
            });

            setStatus('Ready');
            setProgress(100);
        } catch (e: any) {
            console.error(e);
            setStatus('Error: ' + e.message);
            setProgress(0);
            // Cleanup if initialization failed
            if (wllamaRef.current) {
                wllamaRef.current.exit();
                wllamaRef.current = null;
            }
        }
    };

    const stopTranslation = () => {
        shouldStopRef.current = true;
        setStatus('Ready'); // Set to Ready so user can translate again
    };

    const translate = async () => {
        if (!wllamaRef.current) return;

        shouldStopRef.current = false; // Reset stop flag
        setIsTranslating(true);
        setStatus('Translating...');
        setOutput(''); // Clear previous output

        try {
            const prompt = `<|im_start|>system
You are a helpful English teacher and translator. When translating English to Chinese, provide:
1. 中文翻译 (Chinese translation)
2. 逐词解释 (Word-by-word explanation)
3. 语法分析 (Grammar analysis)
4. 使用场景 (Usage context)
<|im_end|>
<|im_start|>user
请详细解释并翻译这句英文: ${input}
<|im_end|>
<|im_start|>assistant
`;

            // Use streaming for progressive output
            const stream = await wllamaRef.current.createCompletion(prompt, {
                nPredict: 300,
                sampling: {
                    temp: 0.7,
                },
                stream: true, // Enable streaming
            });

            // TextDecoder to convert byte arrays to text
            const decoder = new TextDecoder('utf-8');

            // Process the stream
            for await (const chunk of stream) {
                // Check if user requested stop
                if (shouldStopRef.current) {
                    setStatus('Stopped');
                    break;
                }

                // chunk.piece is a Uint8Array, need to decode it
                let text = '';
                if (chunk.piece) {
                    if (typeof chunk.piece === 'string') {
                        text = chunk.piece;
                    } else if (chunk.piece instanceof Uint8Array) {
                        text = decoder.decode(chunk.piece, { stream: true });
                    }
                }
                setOutput(prev => prev + text);
            }

            if (!shouldStopRef.current) {
                setStatus('Done');
            }
        } catch (e: any) {
            // Check if it was aborted
            if (e.message?.includes('abort') || e.name === 'AbortError') {
                setStatus('Stopped');
            } else {
                setStatus('Error: ' + e.message);
            }
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>英文翻译助手 (English Translator)</h2>
            <p>Status: {status}</p>

            {progress > 0 && progress < 100 && (
                <div style={{ marginTop: 10, marginBottom: 10 }}>
                    <div style={{
                        width: '100%',
                        height: 20,
                        backgroundColor: '#e0e0e0',
                        borderRadius: 10,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: '#4caf50',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
                        {progress}% - 下载中...
                    </p>
                </div>
            )}

            {!wllamaRef.current && (
                <button onClick={initWllama} style={{ padding: '10px 20px', fontSize: 16 }}>
                    加载模型 (Load Model)
                </button>
            )}

            <div style={{ marginTop: 20 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                    输入英文 (Enter English):
                </label>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: 10, fontSize: 14 }}
                    placeholder="输入要翻译的英文..."
                />
            </div>

            <button
                onClick={translate}
                disabled={isTranslating || (status !== 'Ready' && status !== 'Done' && status !== 'Stopped')}
                style={{
                    padding: '10px 20px',
                    fontSize: 16,
                    marginTop: 10,
                    backgroundColor: !isTranslating && (status === 'Ready' || status === 'Done' || status === 'Stopped') ? '#2196f3' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: 5,
                    cursor: !isTranslating && (status === 'Ready' || status === 'Done' || status === 'Stopped') ? 'pointer' : 'not-allowed',
                    marginRight: 10
                }}
            >
                详细翻译 (Translate with Details)
            </button>

            {isTranslating && (
                <button
                    onClick={stopTranslation}
                    style={{
                        padding: '10px 20px',
                        fontSize: 16,
                        marginTop: 10,
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: 5,
                        cursor: 'pointer'
                    }}
                >
                    停止 (Stop)
                </button>
            )}

            {output && (
                <div style={{
                    marginTop: 20,
                    whiteSpace: 'pre-wrap',
                    border: '1px solid #ccc',
                    padding: 15,
                    backgroundColor: '#f9f9f9',
                    borderRadius: 5,
                    lineHeight: 1.6
                }}>
                    {output}
                </div>
            )}
        </div>
    );
};
