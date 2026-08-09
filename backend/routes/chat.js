import express from 'express';

const router = express.Router();
const OLLAMA_URL = 'http://localhost:11434/api/chat';

router.post('/', async (req, res) => {
  const { messages, model = 'llama3.2:3b', systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  // Build message array with system prompt
  const fullMessages = [
    {
      role: 'system',
      content: systemPrompt || `You are NOVA, a private and intelligent local AI assistant built at the Zero to One Workshop. You are direct, helpful, and concise. You remember everything said in this conversation. You run entirely on the user's local machine — no data ever leaves their computer. Be conversational, smart, and occasionally show personality.`
    },
    ...messages
  ];

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Ollama error:', errText);
      return res.status(502).json({ 
        error: 'Ollama returned an error. Make sure Ollama is running.' 
      });
    }

    const data = await response.json();
    const reply = data.message?.content || 'No response from model.';
    
    res.json({ reply, model: data.model });
  } catch (err) {
    console.error('Chat route error:', err.message);
    // node-fetch v3 throws TypeError("fetch failed") for connection refused
    const isConnectionError = 
      err.code === 'ECONNREFUSED' || 
      err.cause?.code === 'ECONNREFUSED' ||
      err.message === 'fetch failed' ||
      err.message?.includes('ECONNREFUSED');
    if (isConnectionError) {
      return res.status(503).json({ 
        error: 'Ollama is not running. Please install Ollama from ollama.com, pull a model, and start it.' 
      });
    }
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

export default router;
