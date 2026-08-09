import { useState, useRef, useEffect, useCallback } from 'react';

export default function InputBar({
  onSend,
  isLoading,
  isRecording,
  voiceSupported,
  onMicClick,
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  }, [text]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    if (!text.trim() || isLoading) return;
    onSend(text);
    setText('');
  }, [text, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="input-area">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? '🎙️ Listening...' : 'Ask me anything...'}
          disabled={isLoading || isRecording}
          rows={1}
          id="chat-input"
        />
        <div className="input-actions">
          {voiceSupported && (
            <button
              id="mic-btn"
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={onMicClick}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              disabled={isLoading}
            >
              {isRecording ? '⏹' : '🎙️'}
            </button>
          )}
          <button
            id="send-btn"
            className="send-btn"
            onClick={handleSend}
            disabled={!text.trim() || isLoading}
            title="Send message (Enter)"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
      <div className="input-hint">
        <span>Enter to send · Shift+Enter for new line</span>
        <span>{isLoading ? '⏳ Thinking...' : isRecording ? '🎙️ Listening...' : ''}</span>
      </div>
    </div>
  );
}
