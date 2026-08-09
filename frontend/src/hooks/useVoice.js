import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoice({ onTranscript, onSpeakStart, onSpeakEnd }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Use refs for callbacks to avoid stale closures and
  // prevent re-creating the recognition object on every render
  const onTranscriptRef = useRef(onTranscript);
  const onSpeakStartRef = useRef(onSpeakStart);
  const onSpeakEndRef = useRef(onSpeakEnd);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onSpeakStartRef.current = onSpeakStart; }, [onSpeakStart]);
  useEffect(() => { onSpeakEndRef.current = onSpeakEnd; }, [onSpeakEnd]);

  // Initialize recognition only once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        onTranscriptRef.current?.(transcript);
      }
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      synthRef.current?.cancel();
    };
  }, []); // ← empty deps: only runs once

  const startRecording = useCallback(() => {
    if (!recognitionRef.current || isRecording) return;
    try {
      synthRef.current?.cancel();
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Could not start recognition:', err);
      setIsRecording(false);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current || !isRecording) return;
    recognitionRef.current.stop();
    setIsRecording(false);
  }, [isRecording]);

  const speak = useCallback((text, enabled) => {
    if (!enabled || !synthRef.current || !text) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick the best available voice
    const voices = synthRef.current.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find((v) => v.name.includes('Neural') || v.name.includes('Premium')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeakStartRef.current?.();
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakEndRef.current?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onSpeakEndRef.current?.();
    };

    synthRef.current.speak(utterance);
  }, []); // stable — uses refs

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isRecording,
    isSpeaking,
    voiceSupported,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
  };
}
