import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = 'http://localhost:3001/api';

export function useChat(systemPrompt) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState('llama3.2:1b');

  // Use a ref so sendMessage always sees the latest messages
  // without needing to be re-created on every message change
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (userText, onStreamChunk = null) => {
    if (!userText.trim() || isLoading) return;

    const userMsg = {
      role: 'user',
      content: userText.trim(),
      timestamp: new Date().toISOString(),
    };
    const currentMessages = messagesRef.current;
    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
          model,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to connect to backend stream');
      }

      // Read chunked stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '';

      // Initialize the assistant message in state so UI updates
      const assistantTimestamp = new Date().toISOString();
      setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: assistantTimestamp }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        fullReply += chunkText;

        // Callback for the TTS engine or UI
        if (onStreamChunk) onStreamChunk(chunkText);

        // Update state progressively (optional, UI relies mostly on Voice in Jarvis mode, but good for logs)
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = fullReply;
          return newMessages;
        });
      }

      return fullReply;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, model]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages, model, setModel };
}

export function useOllamaStatus() {
  const [status, setStatus] = useState({ ollama: null, models: [] });

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ ollama: false, models: [] });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { ...status, checkStatus };
}

export async function saveSession(messages, assistantName) {
  const res = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, assistantName }),
  });
  return res.json();
}
