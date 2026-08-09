import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = 'http://localhost:3001/api';

export function useChat(systemPrompt) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState('llama3.2:3b');

  // Use a ref so sendMessage always sees the latest messages
  // without needing to be re-created on every message change
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (userText) => {
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
          // Only send role + content to Ollama (not timestamps)
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
          systemPrompt,
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return data.reply;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, systemPrompt, model]);

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
