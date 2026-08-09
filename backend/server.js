import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import chatRouter from './routes/chat.js';
import saveRouter from './routes/save.js';
import statusRouter from './routes/status.js';
import uploadRouter from './routes/upload.js';
import executeRouter from './routes/execute.js';
import authExecuteRouter from './routes/auth-execute.js';
import eventsRouter, { triggerProactiveEvent } from './routes/events.js';
import cron from 'node-cron';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload({ createParentPath: true }));

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/save', saveRouter);
app.use('/api/status', statusRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/execute', executeRouter);
app.use('/api/auth-execute', authExecuteRouter);
app.use('/api/events', eventsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NOVA backend is running' });
});

app.listen(PORT, () => {
  console.log(`\n🟢 NOVA Backend running at http://localhost:${PORT}`);
  console.log(`📡 Connecting to Ollama at http://localhost:11434`);
  console.log(`🔒 All data stays local — nothing leaves your machine\n`);
  
  // --- PROACTIVE AGENT BEHAVIOR (PHASE 2) ---
  // A Cron job that triggers every morning at 8:00 AM (for testing, every minute: '* * * * *')
  // We will run it every 1 minute for this testing workshop.
  cron.schedule('* * * * *', async () => {
    console.log("⏰ Cron Triggered: Synthesizing Proactive Greeting...");
    try {
      const { Ollama } = await import('ollama');
      const ollama = new Ollama({ host: 'http://localhost:11434' });
      
      const res = await ollama.chat({
        model: 'llama3.2:1b',
        messages: [{
          role: 'system',
          content: 'You are NOVA. The time is exactly 8:00 AM (simulated). You just woke up Sahil. Generate a short, punchy 2-sentence morning greeting acknowledging him, telling him to get ready for the Zero to One workshop, and end it. Be excited. No markdown.'
        }]
      });
      
      if (res.message?.content) {
         triggerProactiveEvent('tts_speak', res.message.content);
      }
    } catch(err) {
      console.error("Proactive Cron Failed: ", err.message);
    }
  });
});
