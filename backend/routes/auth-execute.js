import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';

const execAsync = util.promisify(exec);
const router = express.Router();

router.post('/', async (req, res) => {
  const { tool, args, approved } = req.body;

  if (!approved) {
    return res.json({ result: "❌ Action denied by the User." });
  }

  try {
    if (tool === 'run_terminal_command') {
      const { command } = args;
      if (!command) throw new Error("No command provided.");
      
      // Execute the native command
      const { stdout, stderr } = await execAsync(command, { timeout: 15000 });
      let output = stdout || stderr || 'Command executed silently (no output).';
      
      return res.json({ result: `✅ Terminal execution complete.\nOutput:\n${output.substring(0, 3000)}` });
    }

    if (tool === 'write_local_file') {
      const { path: filePath, content } = args;
      if (!filePath || !content) throw new Error("Missing path or content.");
      
      fs.writeFileSync(filePath, content);
      return res.json({ result: `✅ File successfully written to ${filePath}` });
    }

    return res.status(400).json({ error: "Unknown verified tool" });
  } catch (err) {
    return res.json({ result: `❌ Failed to execute tool: ${err.message}` });
  }
});

export default router;
