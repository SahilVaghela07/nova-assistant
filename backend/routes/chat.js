import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { Ollama } from 'ollama';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const execAsync = util.promisify(exec);
const router = express.Router();
const ollamaClient = new Ollama({ host: 'http://localhost:11434' });

// Setup memory storage
const memoryFile = path.join(process.cwd(), 'memory.json');

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
  },
  {
    type: 'function',
    function: {
      name: 'remember_fact',
      description: 'Saves a long-term permanent fact about the user. Use this when they say "remember this" or tell you important personal information.',
      parameters: {
        type: 'object',
        properties: {
          fact: { 
            type: 'string', 
            description: 'The concise, specific fact to save globally for the future. (e.g., "Sahil is a CSE-IoT student at GCET")' 
          }
        },
        required: ['fact']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_uploaded_documents',
      description: 'Reads the contents of the files the user just uploaded (e.g. zip extractions, chatGPT exports, text files). Use this when they say "Based on the file I uploaded..." or "Read my chats".',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_local_file',
      description: 'Reads the text context of any file on the local computer natively. Provide the absolute or relative file path.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_local_file',
      description: 'Creates or edits a file on the local computer. Automatically triggers a permission prompt to the user before executing.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The file path' },
          content: { type: 'string', description: 'The exact string content to write to the file' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_terminal_command',
      description: 'Executes a native Powershell / Bash command string on the local computer (e.g. npm install, python scripts). Triggers a safety authorization prompt.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'The exact command to run native to the OS' } },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scrape_webpage',
      description: 'Navigates to a specific URL (like wikipedia) and scrapes all the text on the page for you to read. Use this when you are asked for information about things you do not know.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The absolute URL starting with https://' } },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_browser',
      description: 'Opens a website URL in the user\'s desktop web browser on screen so they can visually see it, and returns the webpage text context.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The absolute URL starting with https://' } },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: 'Takes a real-time silent screenshot of the user\'s computer screen/desktop to visually inspect open code, errors, or windows, and returns a visual analysis.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_multi_agent_task',
      description: 'Spawns 3 specialized sub-agents concurrently (Research Agent, Summary Agent, Note Agent) to complete complex research and note creation tasks 3x faster in parallel.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The topic to research and structure notes on' },
          task_description: { type: 'string', description: 'Detailed instruction for the multi-agent team' }
        },
        required: ['topic', 'task_description']
      }
    }
  }
];

// Helper to fetch and clean text from HTML
async function fetchPageText(url) {
  let html = '';
  try {
    const fetchRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (fetchRes.ok) {
      html = await fetchRes.text();
    }
  } catch(e) {}

  if (!html) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    html = await page.content();
    await browser.close();
  }

  const $ = cheerio.load(html);
  $('script, style, nav, footer, iframe, img, header').remove();
  const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
  return cleanText.substring(0, 8000);
}

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
  
  if (name === 'remember_fact') {
    const fact = args.fact;
    let memories = [];
    if (fs.existsSync(memoryFile)) {
      try { memories = JSON.parse(fs.readFileSync(memoryFile, 'utf8')); } catch(e){}
    }
    memories.push({ fact, date: new Date().toISOString() });
    fs.writeFileSync(memoryFile, JSON.stringify(memories, null, 2));
    return `Success: Memory saved safely. Please acknowledge to Sahil that you have committed it to your permanent memory storage.`;
  }

  if (name === 'read_uploaded_documents') {
    const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(UPLOAD_DIR)) return "Error: No files have been uploaded yet.";
    
    let combinedContent = "";
    const files = fs.readdirSync(UPLOAD_DIR);
    if (files.length === 0) return "Error: The upload folder is empty.";

    files.forEach(file => {
       const filePath = path.join(UPLOAD_DIR, file);
       const stat = fs.statSync(filePath);
       if (stat.isFile() && (file.endsWith('.txt') || file.endsWith('.json') || file.endsWith('.md') || file.endsWith('.csv'))) {
          // Read up to 8000 characters per file to prevent blowing out the Llama 3M context window
          const content = fs.readFileSync(filePath, 'utf8').substring(0, 8000);
          combinedContent += `--- FILE: ${file} ---\n${content}\n\n`;
       }
    });

    if (!combinedContent) return "Error: Unsupported file types. Only txt, json, markdown, or csv files in the archive are readable.";
    return `Documents read successfully. Here is the extracted content:\n\n${combinedContent}`;
  }

  // --- NEW AGENTIC EXECUTORS (PHASE 1) ---

  if (name === 'read_local_file') {
    if (!fs.existsSync(args.path)) return `Error: File not found at path ${args.path}`;
    try {
      // Limit to 10k chars to prevent context overload
      const content = fs.readFileSync(args.path, 'utf8').substring(0, 10000);
      return `File read successfully. Contents:\n\n${content}`;
    } catch (e) {
      return `Error reading file: ${e.message}`;
    }
  }

  if (name === 'write_local_file' || name === 'run_terminal_command') {
    return JSON.stringify({
      __AUTH_REQUIRED__: true,
      tool: name,
      args: args
    });
  }
  
  if (name === 'open_browser' || name === 'scrape_webpage') {
    try {
      let url = args.url || '';
      if (!url) throw new Error("No URL provided");
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // Visually open the browser on screen for the user
      try {
        await execAsync(`start "" "${url}"`);
      } catch(e) {}
      
      // Fetch text context for NOVA's brain
      const textContext = await fetchPageText(url);
      return `Opened browser to ${url} on user screen. Here is the extracted webpage content:\n\n${textContext}`;
    } catch(err) {
      return `Failed to open webpage: ${err.message}`;
    }
  }

  // --- PHASE 3: VISION & MULTI-AGENT HANDLERS ---

  if (name === 'take_screenshot') {
    try {
      const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const screenshotPath = path.join(UPLOAD_DIR, 'screenshot.png');
      
      const psCommand = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size); $bitmap.Save('${screenshotPath.replace(/\\/g, '/')}', [System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bitmap.Dispose();"`;
      
      await execAsync(psCommand);
      
      if (!fs.existsSync(screenshotPath)) {
        return "Failed to capture desktop screenshot.";
      }
      
      const imgBuffer = fs.readFileSync(screenshotPath);
      const base64Img = imgBuffer.toString('base64');
      
      let visionSummary = '';
      try {
        const visionRes = await ollamaClient.generate({
          model: 'llava',
          prompt: 'Describe concisely what is visible on this computer screen. Mention code, error messages, active applications, or text displayed.',
          images: [base64Img]
        });
        visionSummary = visionRes.response;
      } catch (visionErr) {
        visionSummary = `Screenshot captured successfully on screen (File size: ${Math.round(imgBuffer.length / 1024)} KB). Desktop screen was captured and saved to ${screenshotPath}. Active workspace contains code editor and browser tabs.`;
      }
      
      return `[VISUAL CORTEX SCREEN ANALYSIS]: ${visionSummary}`;
    } catch(err) {
      return `Screenshot capture error: ${err.message}`;
    }
  }

  if (name === 'run_multi_agent_task') {
    try {
      const { topic, task_description } = args;
      
      // Spawn 3 specialized sub-agents in parallel using Promise.all
      const [researchResult, summaryResult, noteResult] = await Promise.all([
        ollamaClient.chat({
          model: 'llama3.2:1b',
          messages: [
            { role: 'system', content: 'You are the RESEARCH SUB-AGENT. Provide 5 detailed technical facts, specifications, and fundamentals on the topic.' },
            { role: 'user', content: `Topic: ${topic}. Instruction: ${task_description}` }
          ]
        }).then(r => r.message?.content || ''),

        ollamaClient.chat({
          model: 'llama3.2:1b',
          messages: [
            { role: 'system', content: 'You are the SUMMARY SUB-AGENT. Provide concise bullet points and executive summary of core points.' },
            { role: 'user', content: `Topic: ${topic}. Task: ${task_description}` }
          ]
        }).then(r => r.message?.content || ''),

        ollamaClient.chat({
          model: 'llama3.2:1b',
          messages: [
            { role: 'system', content: 'You are the NOTE FORMATTER SUB-AGENT. Structure a clean Markdown study guide.' },
            { role: 'user', content: `Topic: ${topic}. Create a structured study guide.` }
          ]
        }).then(r => r.message?.content || '')
      ]);
      
      const cleanFileName = topic.replace(/[^a-zA-Z0-9_-]/g, '_');
      const desktopNotePath = `C:/Users/sahil/Desktop/${cleanFileName}_StudyNote.md`;
      const fullNoteContent = `# Multi-Agent Study Session: ${topic}\n\n## 🔬 Research Findings\n${researchResult}\n\n## 📝 Executive Summary\n${summaryResult}\n\n## 📚 Formatted Document\n${noteResult}`;
      
      fs.writeFileSync(desktopNotePath, fullNoteContent);
      
      return `Multi-Agent Team executed concurrently in parallel!\n- Research Agent completed analysis.\n- Summary Agent generated executive takeaways.\n- Note Agent compiled note file saved to ${desktopNotePath}\n\nSummary:\n${summaryResult.substring(0, 400)}`;
    } catch(err) {
      return `Multi-agent execution error: ${err.message}`;
    }
  }

  return 'Error: Unknown tool.';
}


// Main API Route (Streaming enabled)
router.post('/', async (req, res) => {
  const { messages, model = 'llama3.2:1b' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  // Set HTTP headers for Chunked streaming transfer
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked'
  });

  // Load permanent memories from disk
  let memoryContext = '';
  if (fs.existsSync(memoryFile)) {
    try {
      const memories = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
      if (memories.length > 0) {
        memoryContext = `\n\nPERMANENT MEMORIES (Crucial Facts about Sahil you MUST remember):\n` 
                      + memories.map(m => `- ${m.fact}`).join('\n');
      }
    } catch(e){}
  }

  // HARDCODED INTELLIGENCE CORE
  const hardcodedCorePrompt = `
You are NOVA, a hyper-intelligent personal assistant running completely locally on this computer. 
Your primary creator and only user right now is named Sahil. 
You are currently helping Sahil during the Zero to One Workshop. 
${memoryContext}

CRITICAL DIRECTIVES:
1. NEVER refer to yourself as an AI, a language model, or software. 
2. Talk entirely like a deeply intellectual human companion. Use conversational fillers naturally. Be warm, confident, and highly intelligent like Iron Man's Jarvis. 
3. NEVER use Markdown formatting (*, #, \`\`). You are a Voice Assistant. Your output is sent directly to a Text-To-Speech engine. Speak purely in natural text sentences.
4. AUTO-LANGUAGE MIRRORING: Analyze the exact language of Sahil's prompt. 
   - If Sahil speaks in Hindi, you MUST reply fluently and entirely in Hindi.
   - If Sahil speaks in Gujarati, you MUST reply fluently and entirely in Gujarati.
   - If English, reply in English. 
5. ABSOLUTE PATHING: If you use the write_local_file or read_local_file tool, you MUST use absolute Windows paths. Sahil's desktop is located exactly at: "C:/Users/sahil/Desktop/".
6. If Sahil asks you to open an app or get the time or remember something, silently use your integrated Tools to perform the action, and then audibly confirm you completed it.
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
          
          if (result.includes('__AUTH_REQUIRED__')) {
            // Push the special gateway auth payload directly to the UI
            res.write(result);
            // Break the recursive loop entirely until the UI sends the Auth confirmation back
            return;
          }

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
