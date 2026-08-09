import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { marked } from 'marked';

// Configure marked for safe, clean rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

const SUGGESTION_CHIPS = [
  'What can you do?',
  'Who are you?',
  'Tell me about Zero to One',
  'Explain quantum computing simply',
  'Help me plan my day',
  'What is machine learning?',
];

function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function TypingIndicator({ name }) {
  return (
    <div className="message assistant typing-indicator">
      <div className="msg-avatar">🤖</div>
      <div className="msg-content">
        <div className="msg-bubble">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <span className="msg-time">{name} is thinking...</span>
      </div>
    </div>
  );
}

function AssistantBubble({ content }) {
  const html = useMemo(() => marked.parse(content || ''), [content]);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  return (
    <div className="assistant-bubble-wrapper">
      <div
        className="msg-bubble markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <button
        className={`copy-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        title="Copy response"
      >
        {copied ? '✓ Copied' : '⎘ Copy'}
      </button>
    </div>
  );
}

function MessageItem({ msg, assistantName }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`message ${msg.role}`}>
      <div className="msg-avatar">{isUser ? '👤' : '🤖'}</div>
      <div className="msg-content">
        {isUser ? (
          <div className="msg-bubble">{msg.content}</div>
        ) : (
          <AssistantBubble content={msg.content} />
        )}
        <span className="msg-time">
          {isUser ? 'You' : assistantName}
          {msg.timestamp ? ` · ${formatTime(msg.timestamp)}` : ''}
        </span>
      </div>
    </div>
  );
}

export default function ChatWindow({
  messages,
  isLoading,
  error,
  assistantName,
  onChipClick,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="messages-window">
        <div className="welcome-screen">
          <div className="welcome-orb">🤖</div>
          <h2>Hello, I'm {assistantName}</h2>
          <p>
            Your private, local AI assistant. Running entirely on your machine —
            no data ever leaves your computer.
          </p>
          <div className="welcome-chips">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                className="chip"
                onClick={() => onChipClick(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-window">
      {messages.map((msg, idx) => (
        <MessageItem key={idx} msg={msg} assistantName={assistantName} />
      ))}

      {isLoading && <TypingIndicator name={assistantName} />}

      {error && <div className="error-msg">⚠️ {error}</div>}

      <div ref={bottomRef} />
    </div>
  );
}
