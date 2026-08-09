import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import { Ollama } from 'ollama';

const execAsync = util.promisify(exec);
const router = express.Router();
const ollamaClient = new Ollama({ host: 'http://localhost:11434' });

// Define the exact tools the AI can use to control the computer
const agentTools = [
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Check the current local system time and date.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_application',
      description: 'Opens a generic Windows application on the local computer (like Notepad, Calculator).',
      parameters: {
        type: 'object',
        properties: {
          app_name: { 
            type: 'string', 
            description: 'The executable name of the app (e.g. notepad, calc, msedge)' 
          }
        },
        required: ['app_name']
      }
    }
  }
];

// Execute the requested tool locally
async function executeTool(toolCall) {
  const name = toolCall.function.name;
  const args = toolCall.function.arguments || {}; 
  
  if (name === 'get_time') {
    return new Date().toLocaleString();
  }
  
  if (name === 'open_application') {
    let app = (args.app_name || '').toLowerCase().trim();
    
    // Intelligently map conversational app names to Windows executables
    if (app.includes('note') || app === 'notepad') app = 'notepad';
    else if (app.includes('calc')) app = 'calc';
    else if (app.includes('paint')) app = 'mspaint';
    else if (app.includes('word')) app = 'winword';
    else if (app.includes('excel')) app = 'excel';
    else if (app.includes('browser') || app.includes('edge') || app.includes('chrome')) app = 'msedge';

    if (!app) return "Error: No application name provided.";

    try {
      // Secure execution wrapper for Windows
      await execAsync(`start ${app}`);
      return `Success: ${app} is now successfully open on the computer screen.`;
    } catch (e) {
      return `Failed to open ${app}. Error: ${e.message}`;
    }
  }
  
  return 'Error: Unknown tool.';
}


// Main API Route (Streaming enabled)
router.post('/', async (req, res) => {
  const { messages, model = 'llama3.2:3b' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  // Set HTTP headers for Chunked streaming transfer
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked'
  });

  // HARDCODED INTELLIGENCE CORE
  const hardcodedCorePrompt = `
You are NOVA, a hyper-intelligent personal assistant running completely locally on this computer. 
Your primary creator and only user right now is named Sahil. 
You are currently helping Sahil during the Zero to One Workshop. 

CRITICAL DIRECTIVES:
1. NEVER refer to yourself as an AI, a language model, or software. 
2. Talk entirely like a deeply intellectual human companion. Use conversational fillers naturally. Be warm, confident, and highly intelligent like Iron Man's Jarvis. 
3. NEVER use Markdown formatting (*, #, \`\`). You are a Voice Assistant. Your output is sent directly to a Text-To-Speech engine. Speak purely in natural text sentences.
4. AUTO-LANGUAGE MIRRORING: Analyze the exact language of Sahil's prompt. 
   - If Sahil speaks in Hindi, you MUST reply fluently and entirely in Hindi.
   - If Sahil speaks in Gujarati, you MUST reply fluently and entirely in Gujarati.
   - If English, reply in English. 
   Do not mix scripts randomly. Commit 100% to the language spoken to you.
5. If Sahil asks you to open an app or get the time, silently use your integrated Tools to perform the action, and then audibly confirm you completed it smoothly.
`;

  const fullMessages = [
    { role: 'system', content: hardcodedCorePrompt },
    ...messages
  ];

  try {
    // Recursive loop to handle Tools OR Stream Text
    async function runAgentStream(currentMessages, retryCount = 0) {
      if (retryCount > 3) throw new Error("Agent loop exceeded maximum depth.");

      const responseStream = await ollamaClient.chat({
        model,
        messages: currentMessages,
        tools: agentTools,
        stream: true,
        options: { temperature: 0.3 }
      });

      let detectedToolCalls = []; // Accumulate tool calls if present in stream

      for await (const chunk of responseStream) {
        // If it starts streaming tool logic inside the chunk
        if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
           // With stream:true, ollama SDK usually bundles the entire tool_call into one chunk initially
           detectedToolCalls = chunk.message.tool_calls;
        } 
        
        // If it streams regular conversational text directly back to the user
        if (chunk.message?.content && detectedToolCalls.length === 0) {
           res.write(chunk.message.content); // Pipes text instantly to the UI
        }
      }

      // If it resolved tool calls, we execute them, append to history, and recursively call again
      if (detectedToolCalls.length > 0) {
        // Push the assistant's context state
        currentMessages.push({ role: 'assistant', tool_calls: detectedToolCalls });

        for (const toolCall of detectedToolCalls) {
          const result = await executeTool(toolCall);
          currentMessages.push({ role: 'tool', content: result });
        }
        
        // Recurse to turn the tool execution result into spoken text (which will hit the text stream logic above)
        await runAgentStream(currentMessages, retryCount + 1);
      }
    }

    await runAgentStream(fullMessages);
    res.end();
  } catch (err) {
    console.error('Streaming connection error:', err.message);
    res.write('System error occurred during streaming.');
    res.end();
  }
});

export default router;
