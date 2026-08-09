import React from 'react';

export default function JarvisOrb({ isRecording, isSpeaking, onClick }) {
  // Determine state class for animations
  let stateClass = 'idle';
  if (isSpeaking) stateClass = 'speaking';
  else if (isRecording) stateClass = 'listening';

  return (
    <div className={`jarvis-container ${stateClass}`} onClick={onClick}>
      <div className="jarvis-orb">
        {/* Outer ambient glow */}
        <div className="orb-glow-outer"></div>
        
        {/* Layer 1: Outermost slow rotating ring */}
        <div className="orb-ring ring-slow"></div>
        
        {/* Layer 2: Middle counter-rotating ring with dashed segments */}
        <div className="orb-ring ring-medium ring-dashed"></div>
        
        {/* Layer 3: Inner fast rotating ring */}
        <div className="orb-ring ring-fast"></div>

        {/* The solid energetic core */}
        <div className="orb-core">
          <div className="core-mesh"></div>
        </div>

        {/* Status text label (purely aesthetic) */}
        <div className="orb-status-text">
          {isSpeaking ? 'PROCESSING OUTPUT' : isRecording ? 'LISTENING OFF' : 'STANDBY IDLE'}
        </div>
      </div>
      
      <div className="orb-hint">
        {isRecording ? 'Tap to pause' : 'Tap orb to activate'}
      </div>
    </div>
  );
}
