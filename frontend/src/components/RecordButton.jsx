import React from 'react';
import { useRecording } from '../contexts/RecordingContext';
import './RecordButton.css';

export default function RecordButton({ className = '' }) {
  const { status, errorMsg, barHeights, startRecording, stopRecording } = useRecording();

  const handleClick = () => {
    if (status === 'uploading') return;
    
    if (status === 'idle') {
      startRecording();
    } else if (status === 'recording') {
      stopRecording();
    }
  };

  return (
    <div className={`record-button-container ${className ? className + '-wrapper' : ''}`}>
      <button 
        className={`record-button ${status} ${className}`}
        onClick={handleClick}
        disabled={status === 'uploading'}
        aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
      >
        {status === 'recording' ? (
          <div className="stop-icon" />
        ) : (
          <div className="waveform-icon">
            {barHeights.map((h, i) => (
              <div 
                key={i} 
                className="waveform-bar" 
                style={{ height: `${h}px` }} 
              />
            ))}
          </div>
        )}
      </button>
      
      {status === 'uploading' && (
        <p className="status-text">Uploading...</p>
      )}
      
      {errorMsg && (
        <p className="error-text">{errorMsg}</p>
      )}
    </div>
  );
}
