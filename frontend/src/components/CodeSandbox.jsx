import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

export default function CodeSandbox({ content }) {
  const [codeBlocks, setCodeBlocks] = useState([]);
  const [executionOutput, setExecutionOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Extract purely the code blocks natively
  useEffect(() => {
    if (!content) return;
    
    const blocks = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }
    setCodeBlocks(blocks);
  }, [content]);

  const handleRunLocally = async (language, code) => {
    setIsRunning(true);
    setExecutionOutput('Executing securely on local environment...\n');
    
    try {
      const res = await fetch('http://localhost:3001/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setExecutionOutput(`\n[PROCESS EXITED WITH SUCCESS]\n\n${data.output}`);
      } else {
        setExecutionOutput(`\n[RUNTIME ERROR]\n\n${data.error}`);
      }
    } catch (err) {
      setExecutionOutput(`\n[SYSTEM FALLBACK]\n\nFailed to reach local execution sandbox: ${err.message}`);
    }
    
    setIsRunning(false);
  };

  if (codeBlocks.length === 0) return null;

  return (
    <div className="code-sandbox-container">
      <div className="sandbox-header">
        <span className="sandbox-title">💻 Code Subroutine Detected</span>
      </div>
      
      {codeBlocks.map((block, idx) => (
        <div key={idx} className="code-block-wrapper">
          <div className="code-block-header">
            <span>{block.language}</span>
            <button 
              className="copy-btn"
              onClick={() => navigator.clipboard.writeText(block.code)}
            >
              Copy
            </button>
          </div>
          
          <pre className="code-pre">
            <code>{block.code}</code>
          </pre>

          {(block.language === 'javascript' || block.language === 'js' || block.language === 'python' || block.language === 'py') && (
            <button 
              className="run-btn" 
              onClick={() => handleRunLocally(block.language, block.code)}
              disabled={isRunning}
            >
              {isRunning ? '⏳ Running...' : '🚀 Run Locally'}
            </button>
          )}
        </div>
      ))}

      {executionOutput && (
        <div className="execution-output">
          <div className="output-header">Terminal / Sandbox Output</div>
          <pre>{executionOutput}</pre>
        </div>
      )}
    </div>
  );
}
