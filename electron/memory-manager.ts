

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class MemoryManager {
  private history: ChatMessage[] = [];
  private readonly maxContextSize: number;

  constructor(maxContextSize = 4096) {
    this.maxContextSize = maxContextSize;
  }

  addMessage(role: 'system' | 'user' | 'assistant', content: string) {
    this.history.push({ role, content });
  }

  getHistory(): ChatMessage[] {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }

  async getContext(): Promise<ChatMessage[]> {
    // Basic sliding window for now. 
    // TODO: Implement smart compression/summarization using the LLM.
    
    // Estimate token count (rough character count / 4)
    let totalChars = 0;
    const context: ChatMessage[] = [];
    
    // Always keep system prompt if present (assuming first message)
    if (this.history.length > 0 && this.history[0].role === 'system') {
        context.push(this.history[0]);
        totalChars += this.history[0].content.length;
    }

    // Work backwards from the end
    const messagesToAdd: ChatMessage[] = [];
    for (let i = this.history.length - 1; i >= 0; i--) {
        const msg = this.history[i];
        if (msg.role === 'system' && i === 0) continue; // Already handled

        if (totalChars + msg.content.length > this.maxContextSize * 3) { // Rough char limit
            break; 
        }
        
        // Add to front of temporary list
        messagesToAdd.unshift(msg);
        totalChars += msg.content.length;
    }

    return [...context, ...messagesToAdd];
  }

  // Placeholder for future summarization logic
  /*
  async compressHistory(summarizer: (text: string) => Promise<string>) {
      // Logic to summarize older messages would go here
  }
  */
}
