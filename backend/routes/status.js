import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) {
      return res.json({ ollama: false, models: [] });
    }

    const data = await response.json();
    const models = data.models?.map(m => m.name) || [];

    res.json({ ollama: true, models });
  } catch {
    res.json({ ollama: false, models: [] });
  }
});

export default router;
