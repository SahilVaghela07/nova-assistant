import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);
const router = express.Router();
const TEMP_DIR = path.join(process.cwd(), 'temp_run');

router.post('/', async (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided.' });
  }

  // Ensure temp dir exists
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

  try {
    let output = '';

    if (language === 'javascript' || language === 'js') {
      const filePath = path.join(TEMP_DIR, 'temp.js');
      fs.writeFileSync(filePath, code);
      // Run with absolute timeout of 5 seconds to prevent frozen loops
      const { stdout, stderr } = await execAsync(`node ${filePath}`, { timeout: 5000 });
      output = stdout || stderr;
      fs.unlinkSync(filePath);
    } 
    else if (language === 'python' || language === 'py') {
      const filePath = path.join(TEMP_DIR, 'temp.py');
      fs.writeFileSync(filePath, code);
      const { stdout, stderr } = await execAsync(`python ${filePath}`, { timeout: 5000 });
      output = stdout || stderr;
      fs.unlinkSync(filePath);
    } 
    else {
      return res.status(400).json({ error: `Execution for language '${language}' is not supported yet.` });
    }

    res.json({ success: true, output: output || 'Program finished with no output.' });

  } catch (err) {
    // If timeout or runtime error occurs
    let errorMsg = err.message || 'Unknown runtime error';
    if (err.killed) errorMsg = 'Process forcefully terminated (Timeout limit reached). Prevented infinite loop.';
    if (err.stderr) errorMsg = err.stderr;

    res.status(500).json({ error: errorMsg });
  }
});

export default router;
