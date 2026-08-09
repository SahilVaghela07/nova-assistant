import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

router.post('/', (req, res) => {
  const { messages, assistantName = 'NOVA' } = req.body;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No messages to save' });
  }

  try {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${assistantName}_session_${timestamp}.md`;
    const filepath = path.join(SESSIONS_DIR, filename);

    // Format as clean markdown
    const dateStr = now.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full', 
      timeStyle: 'short' 
    });

    let content = `# ${assistantName} Session\n`;
    content += `**Date:** ${dateStr}\n`;
    content += `**Total Messages:** ${messages.length}\n\n`;
    content += `---\n\n`;

    messages.forEach((msg) => {
      const speaker = msg.role === 'user' ? '**You**' : `**${assistantName}**`;
      content += `${speaker}: ${msg.content}\n\n`;
    });

    content += `\n---\n*Session saved locally by NOVA — Zero to One Workshop*\n`;

    fs.writeFileSync(filepath, content, 'utf8');

    res.json({ 
      success: true, 
      filename,
      path: filepath,
      messageCount: messages.length
    });
  } catch (err) {
    console.error('Save error:', err.message);
    res.status(500).json({ error: 'Failed to save session: ' + err.message });
  }
});

// Get list of saved sessions
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => ({
        name: f,
        path: path.join(SESSIONS_DIR, f),
        size: fs.statSync(path.join(SESSIONS_DIR, f)).size,
        created: fs.statSync(path.join(SESSIONS_DIR, f)).birthtime
      }))
      .sort((a, b) => b.created - a.created);
    
    res.json({ sessions: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
