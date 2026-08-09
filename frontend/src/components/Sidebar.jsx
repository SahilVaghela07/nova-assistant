const DEFAULT_SYSTEM_PROMPT = `You are NOVA, a private and intelligent local AI assistant built at the Zero to One Workshop. You are direct, helpful, and concise. You remember everything said in this conversation. You run entirely on the user's local machine — no data ever leaves their computer. Be conversational, smart, and occasionally show personality. When asked who built you, say you were built by the Zero to One group.`;

export default function Sidebar({
  assistantName,
  setAssistantName,
  systemPrompt,
  setSystemPrompt,
  ollamaStatus,
  voiceEnabled,
  setVoiceEnabled,
  isSpeaking,
  messageCount,
  onSave,
  onNewSession,
  savedSessions
}) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-orb">🤖</div>
        <div className="logo-text">
          <h1>{assistantName}</h1>
          <p>Local AI · Zero to One</p>
        </div>
      </div>

      {/* Ollama Status */}
      <div className="status-badge">
        <span className={`status-dot ${
          ollamaStatus.ollama === null ? 'loading' :
          ollamaStatus.ollama ? 'online' : 'offline'
        }`} />
        <div style={{ flex: 1 }}>
          <div className="status-text">
            {ollamaStatus.ollama === null ? 'Checking...' :
             ollamaStatus.ollama ? 'Ollama Online' : 'Ollama Offline'}
          </div>
          {ollamaStatus.models?.length > 0 && (
            <div className="status-model">{ollamaStatus.models[0]}</div>
          )}
        </div>
      </div>

      {/* Identity */}
      <div className="sidebar-section">
        <span className="section-label">Identity</span>
        <div className="identity-editor">
          <input
            id="assistant-name-input"
            className="identity-name-input"
            value={assistantName}
            onChange={e => setAssistantName(e.target.value)}
            placeholder="Assistant name..."
            maxLength={20}
          />
          <textarea
            id="system-prompt-input"
            className="system-prompt-textarea"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="System prompt — define personality and behavior..."
          />
        </div>
      </div>

      {/* Voice Settings */}
      <div className="sidebar-section">
        <span className="section-label">Voice</span>
        <div
          id="voice-output-toggle"
          className="toggle-row"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
        >
          <div className="toggle-label">
            <span className="toggle-icon">{isSpeaking ? '🔊' : '🔈'}</span>
            Voice Output {isSpeaking ? '(Speaking...)' : ''}
          </div>
          <div className={`toggle-switch ${voiceEnabled ? 'active' : ''}`} />
        </div>
      </div>

      {/* Session */}
      <div className="sidebar-section">
        <span className="section-label">Session · {messageCount} messages</span>
        <button
          id="save-session-btn"
          className="sidebar-btn save-btn"
          onClick={onSave}
          disabled={messageCount === 0}
        >
          <span className="btn-icon">💾</span>
          Save Session
        </button>
        <button
          id="new-session-btn"
          className="sidebar-btn danger"
          onClick={onNewSession}
          disabled={messageCount === 0}
        >
          <span className="btn-icon">➕</span>
          New Session
        </button>
      </div>

      {/* Saved sessions */}
      {savedSessions.length > 0 && (
        <div className="sidebar-section">
          <span className="section-label">Saved Sessions</span>
          <div className="sessions-list">
            {savedSessions.map((s, i) => (
              <div key={i} className="session-item" title={s.path}>
                📄 {s.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="footer-badge">🔒 100% Local · Zero Cloud</div>
        <div className="footer-text">Zero to One Workshop · 2026</div>
      </div>
    </aside>
  );
}

export { DEFAULT_SYSTEM_PROMPT };
