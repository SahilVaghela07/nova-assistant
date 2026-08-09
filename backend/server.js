import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import chatRouter from './routes/chat.js';
import saveRouter from './routes/save.js';
import statusRouter from './routes/status.js';
import uploadRouter from './routes/upload.js';
import executeRouter from './routes/execute.js';

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NOVA backend is running' });
});

app.listen(PORT, () => {
  console.log(`\n🟢 NOVA Backend running at http://localhost:${PORT}`);
  console.log(`📡 Connecting to Ollama at http://localhost:11434`);
  console.log(`🔒 All data stays local — nothing leaves your machine\n`);
});
