import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/data/mockData';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
}

// Render **bold** markdown and plain text
function renderContent(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-semibold">$1</strong>');
}

// Animated typing dots (Vinny is thinking)
const TypingDots = () => (
  <div className="flex justify-start">
    <div className="bg-secondary/60 rounded-xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  </div>
);

// Blinking cursor appended to streaming messages
const StreamingCursor = () => (
  <span
    className="inline-block w-[2px] h-[13px] bg-primary/70 rounded-sm align-middle ml-0.5 animate-pulse"
    style={{ animationDuration: '0.8s' }}
  />
);

const ChatInterface = ({ messages, onSendMessage, isTyping }: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Is Vinny currently composing a response?
  const isBusy = isTyping || messages.at(-1)?.isStreaming === true;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Re-focus input once Vinny finishes
  useEffect(() => {
    if (!isBusy) {
      inputRef.current?.focus();
    }
  }, [isBusy]);

  const handleSend = () => {
    if (!input.trim() || isBusy) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Ask Vinny</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/20 text-foreground rounded-br-md'
                  : 'bg-secondary/60 text-foreground rounded-bl-md'
              }`}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html: renderContent(msg.content),
                }}
              />
              {msg.isStreaming && <StreamingCursor />}
              {!msg.isStreaming && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {msg.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator — shown before first token arrives */}
        {isTyping && <TypingDots />}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isBusy}
            placeholder={isBusy ? 'Vinny is thinking…' : 'Ask Vinny anything about your network…'}
            className="flex-1 h-9 px-3.5 rounded-lg bg-secondary/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={isBusy || !input.trim()}
            className="w-9 h-9 rounded-lg bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
