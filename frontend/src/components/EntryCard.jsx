import React from 'react';
import { Link } from 'react-router-dom';
import './EntryCard.css';

export default function EntryCard({ entry }) {
  const dateStr = new Date(entry.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  const timeStr = new Date(entry.created_at).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit'
  });
  const formattedDate = `${dateStr} · ${timeStr}`;
  
  let snippet = entry.transcript || '';
  if (snippet.length > 120) {
    snippet = snippet.slice(0, 120) + '...';
  }

  const renderStatus = () => {
    if (entry.status === 'done') {
      return entry.reflection?.mood ? (
        <span className="mood-pill">{entry.reflection.mood}</span>
      ) : null;
    }
    
    if (entry.status === 'error') {
      return <span className="status-indicator error">Couldn't process this entry</span>;
    }
    
    let statusText = 'Processing...';
    if (entry.status === 'transcribing') statusText = 'Transcribing...';
    if (entry.status === 'reflecting') statusText = 'Reflecting...';
    if (entry.status === 'pending') statusText = 'Pending...';
    
    return <span className="status-indicator">{statusText}</span>;
  };

  return (
    <Link to={`/entries/${entry.id}`} className="entry-card">
      <div className="entry-card-header">
        <span className="entry-date">{formattedDate}</span>
        <div className="entry-status-group">
          {renderStatus()}
          <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
      {entry.status === 'done' ? (
        <p className="entry-snippet">{snippet}</p>
      ) : entry.status === 'error' ? (
        <p className="entry-snippet placeholder">Processing failed.</p>
      ) : (
        <p className="entry-snippet placeholder">Audio is being processed...</p>
      )}
    </Link>
  );
}
