import React, { useState } from 'react';

export default function AuthModal({ authRequest, onResolve }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!authRequest) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: authRequest.tool, 
          args: authRequest.args, 
          approved: true 
        })
      });
      const data = await res.json();
      onResolve(data.result);
    } catch (err) {
      onResolve(`❌ User approved, but tool execution failed locally: ${err.message}`);
    }
    setIsProcessing(false);
  };

  const handleDeny = () => {
    onResolve("❌ Action denied by the User. Apologize and adjust your plan.");
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <div className="auth-header">⚠️ SYSTEM AUTHORIZATION REQUIRED ⚠️</div>
        
        <div className="auth-body">
          <p>NOVA is attempting to execute a sensitive background action.</p>
          
          <div className="auth-details">
            <strong>Tool:</strong> <span>{authRequest.tool}</span>
            <br/><br/>
            <strong>Payload:</strong>
            <pre>{JSON.stringify(authRequest.args, null, 2)}</pre>
          </div>
          
          <p className="auth-warning">
            Executing this action will interact directly with your local hard drive or terminal. 
            Do you approve this execution?
          </p>
        </div>

        <div className="auth-footer">
          <button className="auth-btn deny" onClick={handleDeny} disabled={isProcessing}>
            ❌ DENY
          </button>
          <button className="auth-btn approve" onClick={handleApprove} disabled={isProcessing}>
            {isProcessing ? '⏳ EXECUTING...' : '✅ APPROVE & RUN'}
          </button>
        </div>
      </div>
    </div>
  );
}
