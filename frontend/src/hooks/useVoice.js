import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoice({ onTranscript, onSpeakStart, onSpeakEnd }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const shouldListenRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // Use refs for callbacks to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onSpeakStartRef = useRef(onSpeakStart);
  const onSpeakEndRef = useRef(onSpeakEnd);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onSpeakStartRef.current = onSpeakStart; }, [onSpeakStart]);
  useEffect(() => { onSpeakEndRef.current = onSpeakEnd; }, [onSpeakEnd]);

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Let it run continuously for longer phrases
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      // Get the last recognized phrase (continuous mode keeps appending results)
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      if (transcript.trim()) {
        onTranscriptRef.current?.(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        shouldListenRef.current = false;
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      // ALWAYS LISTENING LOGIC: Automatically restart if we should be listening and AI is not speaking
      if (shouldListenRef.current && !isSpeakingRef.current) {
        try {
          recognitionRef.current?.start();
          setIsRecording(true);
        } catch (e) {
          // Ignore state collision errors
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.abort();
      synthRef.current?.cancel();
    };
  }, []); 

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldListenRef.current = true;
    if (!isRecording && !isSpeakingRef.current) {
      try {
        synthRef.current?.cancel();
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Could not start recognition:', err);
      }
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const speak = useCallback((text, enabled) => {
    if (!enabled || !synthRef.current || !text) return;

    // Pause microphone while speaking so AI doesn't hear itself
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const voices = synthRef.current.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find((v) => v.name.includes('Neural') || v.name.includes('Premium')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      onSpeakStartRef.current?.();
    };
    
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onSpeakEndRef.current?.();
      
      // ALWAYS LISTENING LOGIC: Resume mic after speaking if it was active
      if (shouldListenRef.current) {
        try {
          recognitionRef.current?.start();
          setIsRecording(true);
        } catch (e) {
          // Ignore
        }
      }
    };
    
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onSpeakEndRef.current?.();
      
      if (shouldListenRef.current) {
        try {
          recognitionRef.current?.start();
          setIsRecording(true);
        } catch (e) {}
      }
    };

    synthRef.current.speak(utterance);
  }, [isRecording]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    
    if (shouldListenRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {}
    }
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
