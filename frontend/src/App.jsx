import { useState, useCallback, useEffect } from 'react';
import './index.css';

import Sidebar, { DEFAULT_SYSTEM_PROMPT } from './components/Sidebar';
import JarvisOrb from './components/JarvisOrb';
import { useChat, useOllamaStatus, saveSession } from './hooks/useNova';
import { useVoice } from './hooks/useVoice';

export default function App() {
  const [assistantName, setAssistantName] = useState('NOVA');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // default to true in Jarvis mode
  const [recognitionLang, setRecognitionLang] = useState('en-US'); // Default spoken language
  const [savedSessions, setSavedSessions] = useState([]);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { messages, isLoading, error, sendMessage, clearMessages } = useChat(systemPrompt);
  const ollamaStatus = useOllamaStatus();

  // Show toast helper
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Set up File Upload Handler
  useEffect(() => {
    const handleFileUpload = async (event) => {
      const file = event.detail;
      if (!file) return;

      showToast(`Uploading ${file.name}...`, 'loading');
      
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || `✅ Successfully read ${file.name}`);
          // Force NOVA to read the newly uploaded documents
          sendMessage(`NOVA, I have just uploaded a file named ${file.name}. Please automatically trigger your 'read_uploaded_documents' tool to read the latest documents, and then tell me out loud that you have gathered the context successfully.`);
        } else {
          showToast(data.error || 'Upload failed', 'error');
        }
      } catch (err) {
        showToast('Failed to connect to backend for upload', 'error');
      }
    };

    document.addEventListener('nova-upload', handleFileUpload);
    return () => document.removeEventListener('nova-upload', handleFileUpload);
  }, [showToast, sendMessage]);

  const voiceHook = useVoice({
    onTranscript: (text) => {
      if (text.trim()) {
        let isFirstChunk = true;
        sendMessage(text, (chunk) => {
          if (voiceEnabled) {
            voiceHook.streamSpeak(chunk, voiceEnabled, isFirstChunk);
            isFirstChunk = false;
          }
        });
      }
    },
    recognitionLang
  });

  const { isRecording, isSpeaking, voiceSupported, startRecording, stopRecording, speak, streamSpeak, stopSpeaking } = voiceHook;

  // Handle orb click
  const handleOrbClick = useCallback(() => {
    if (isRecording) stopRecording();
    else if (isSpeaking) stopSpeaking();
    else startRecording();
  }, [isRecording, isSpeaking, startRecording, stopRecording, stopSpeaking]);

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
    stopSpeaking();
    clearMessages();
    showToast('Memory cleared. New session started.');
  }, [clearMessages, stopSpeaking, showToast]);

  return (
    <div className="app-layout" style={{ display: 'block' }}>
      
      {/* Top minimalistic bar */}
      <div className="jarvis-top-bar">
        <div className="jarvis-title">{assistantName} // CORE ONLINE</div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Spoken Language Dropdown */}
          <select 
            className="settings-btn" 
            style={{ width: 'auto', padding: '0 12px', fontSize: '11px', borderRadius: '20px' }}
            value={recognitionLang}
            onChange={(e) => setRecognitionLang(e.target.value)}
          >
            <option value="en-US">English</option>
            <option value="hi-IN">Hindi (हिंदी)</option>
            <option value="gu-IN">Gujarati (ગુજરાતી)</option>
          </select>

          <button className="settings-btn" onClick={() => setSidebarOpen(true)}>
            ⚙️
          </button>
        </div>
      </div>

      {/* Main Orb Centerpiece */}
      <JarvisOrb 
        isRecording={isRecording} 
        isSpeaking={isSpeaking} 
        onClick={handleOrbClick} 
      />

      {/* Sidebar as an Overlay */}
      <div className={`sidebar overlay ${sidebarOpen ? '' : 'hidden'}`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px' }}>
          <button className="settings-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
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
      </div>

      {/* Offline banner (Overlay) */}
      {ollamaStatus.ollama === false && (
        <div className="offline-banner" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60, justifyContent: 'center' }}>
          ⚠️ Ollama is offline. Please ensure the Llama backend is running.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="offline-banner" style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 60, borderRadius: '10px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
