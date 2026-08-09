import { useState, useCallback, useRef, useEffect } from 'react';
import './index.css';

import Sidebar, { DEFAULT_SYSTEM_PROMPT } from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import { useChat, useOllamaStatus, saveSession } from './hooks/useNova';
import { useVoice } from './hooks/useVoice';

export default function App() {
  const [assistantName, setAssistantName] = useState('NOVA');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [savedSessions, setSavedSessions] = useState([]);
  const [toast, setToast] = useState(null);

  const { messages, isLoading, error, sendMessage, clearMessages } = useChat(systemPrompt);
  const ollamaStatus = useOllamaStatus();

  // Show toast helper
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Voice: handle transcript → auto-send
  const handleTranscript = useCallback((text) => {
    if (text.trim()) {
      sendMessage(text).then(reply => {
        if (reply) speak(reply, voiceEnabled);
      });
    }
  }, [sendMessage, voiceEnabled]);

  const { isRecording, isSpeaking, voiceSupported, startRecording, stopRecording, speak, stopSpeaking } =
    useVoice({
      onTranscript: handleTranscript,
    });

  // Handle send from input bar
  const handleSend = useCallback(async (text) => {
    stopSpeaking();
    const reply = await sendMessage(text);
    if (reply) speak(reply, voiceEnabled);
  }, [sendMessage, speak, voiceEnabled, stopSpeaking]);

  // Handle mic toggle
  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Handle save session
  const handleSave = useCallback(async () => {
    if (messages.length === 0) return;
    try {
      const result = await saveSession(messages, assistantName);
      if (result.success) {
        setSavedSessions(prev => [{ name: result.filename, path: result.path }, ...prev.slice(0, 4)]);
        showToast(`✅ Saved: ${result.filename}`);
      } else {
        showToast('Failed to save session', 'error');
      }
    } catch {
      showToast('Error saving session', 'error');
    }
  }, [messages, assistantName, showToast]);

  // Handle new session
  const handleNewSession = useCallback(() => {
    if (messages.length > 0) {
      const confirm = window.confirm('Start a new session? Current conversation will be cleared.');
      if (!confirm) return;
    }
    stopSpeaking();
    clearMessages();
    showToast('New session started');
  }, [messages.length, clearMessages, stopSpeaking, showToast]);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        assistantName={assistantName}
        setAssistantName={setAssistantName}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        ollamaStatus={ollamaStatus}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        isSpeaking={isSpeaking}
        messageCount={messages.length}
        onSave={handleSave}
        onNewSession={handleNewSession}
        savedSessions={savedSessions}
      />

      {/* Main chat area */}
      <div className="chat-area">
        {/* Offline banner */}
        {ollamaStatus.ollama === false && (
          <div className="offline-banner">
            ⚠️ Ollama is not running. Please start Ollama on your machine, then{' '}
            <a onClick={ollamaStatus.checkStatus}>refresh status</a>.
          </div>
        )}

        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="header-avatar">🤖</div>
            <div className="header-info">
              <h2>{assistantName}</h2>
              <span className="sub">
                {isSpeaking ? '🔊 Speaking...' :
                 isRecording ? '🎙️ Listening...' :
                 isLoading ? '⏳ Thinking...' : 'Ready'}
              </span>
            </div>
          </div>
          <div className="header-right">
            {messages.length > 0 && (
              <span className="msg-count">{messages.length} msgs</span>
            )}
          </div>
        </div>

        {/* Chat messages */}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          assistantName={assistantName}
          onChipClick={handleSend}
        />

        {/* Input */}
        <InputBar
          onSend={handleSend}
          isLoading={isLoading}
          isRecording={isRecording}
          voiceSupported={voiceSupported}
          onMicClick={handleMicClick}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
