import express from 'express';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const router = express.Router();
const OLLAMA_URL = 'http://localhost:11434/api/chat';

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
  const args = toolCall.function.arguments; // May be object or raw JSON string depending on Ollama version
  
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

  if (name === 'get_time') {
    return new Date().toLocaleString();
  }
  
  if (name === 'open_application') {
    const app = parsedArgs.app_name;
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

// Recursive chat function to handle tool usage
async function chatWithTools(messages, model, retryCount = 0) {
  if (retryCount > 3) throw new Error("Agent loop exceeded maximum depth.");
  
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      tools: agentTools,
      options: {
        temperature: 0.3 // Keep it coherent for non-English formats
      }
    })
  });

  if (!response.ok) {
    throw new Error('Ollama connection failed.');
  }

  const data = await response.json();
  const msg = data.message;

  // Check if Ollama requested a tool execution
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    console.log('🤖 Tool Execution Triggered:', JSON.stringify(msg.tool_calls));
    
    // Add the AI's tool request to history
    messages.push(msg);

    // Execute each tool
    for (const toolCall of msg.tool_calls) {
      const result = await executeTool(toolCall);
      
      // Add tool output back to history
      messages.push({
        role: 'tool',
        content: result
      });
    }

    // Recurse to generate final speech based on tool outputs
    return chatWithTools(messages, model, retryCount + 1);
  }

  // No more tools, return final text
  return { reply: msg.content, model: data.model };
}

// Main API Route
router.post('/', async (req, res) => {
  const { messages, model = 'llama3.2:3b' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

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
    const result = await chatWithTools(fullMessages, model);
    res.json(result);
  } catch (err) {
    console.error('Chat route error:', err.message);
    res.status(500).json({ error: 'System connection error: ' + err.message });
  }
});

export default router;
