import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEntry } from '../api/client';
import WaveformPlayer from '../components/WaveformPlayer';
import './EntryDetail.css';

export default function EntryDetail() {
  const { id } = useParams();
  const [entry, setEntry] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const pollTimer = useRef(null);

  useEffect(() => {
    fetchEntry();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [id]);

  const fetchEntry = async () => {
    try {
      const data = await getEntry(id);
      setEntry(data);
      
      if (data.status !== 'done' && data.status !== 'error') {
        pollTimer.current = setTimeout(fetchEntry, 2000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load entry');
    }
  };

  const renderStatusPlaceholder = () => {
    let statusText = 'Processing...';
    if (entry.status === 'transcribing') statusText = 'Transcribing your entry…';
    if (entry.status === 'reflecting') statusText = 'Reflecting on it…';
    if (entry.status === 'pending') statusText = 'Preparing…';

    return (
      <div className="processing-placeholder">
        <div className="pulsing-waveform">
          <div className="waveform-bar" style={{ height: '10px' }}></div>
          <div className="waveform-bar" style={{ height: '20px' }}></div>
          <div className="waveform-bar" style={{ height: '15px' }}></div>
          <div className="waveform-bar" style={{ height: '25px' }}></div>
          <div className="waveform-bar" style={{ height: '10px' }}></div>
        </div>
        <p className="status-text">{statusText}</p>
      </div>
    );
  };

  if (errorMsg) {
    return (
      <div className="entry-detail-container">
        <p className="error-message">This entry couldn't be loaded. {errorMsg}</p>
      </div>
    );
  }

  if (!entry) {
    return <div className="entry-detail-container loading">Loading...</div>;
  }

  const dateStr = new Date(entry.created_at).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric'
  });
  const timeStr = new Date(entry.created_at).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit'
  });

  const audioUrl = entry.audio_path?.startsWith('http') 
    ? entry.audio_path 
    : `http://localhost:8000${entry.audio_path}`;

  let themes = [];
  if (entry.reflection?.themes) {
    themes = Array.isArray(entry.reflection.themes) 
      ? entry.reflection.themes 
      : (typeof entry.reflection.themes === 'string' ? JSON.parse(entry.reflection.themes) : []);
  }

  return (
    <div className="entry-detail-container">
      <header className="entry-header">
        <span className="entry-datetime">{dateStr} · {timeStr}</span>
      </header>

      {entry.audio_path && (
        <WaveformPlayer audioUrl={audioUrl} />
      )}

      {entry.status === 'error' ? (
        <div className="error-state">
          <p>This entry couldn't be processed. {entry.error_message || 'An unknown error occurred.'}</p>
        </div>
      ) : entry.status !== 'done' ? (
        renderStatusPlaceholder()
      ) : (
        <div className="entry-done-content">
          <section className="transcript-section">
            <p className="transcript-text">{entry.transcript}</p>
          </section>

          {entry.reflection && (
            <section className="reflection-card">
              <div className="reflection-header">
                {entry.reflection.mood && (
                  <span className="mood-pill">{entry.reflection.mood}</span>
                )}
                {themes.length > 0 && (
                  <div className="themes-list">
                    {themes.map((theme, i) => (
                      <span key={i} className="theme-pill">{theme}</span>
                    ))}
                  </div>
                )}
              </div>
              
              {entry.reflection.summary && (
                <p className="reflection-summary">{entry.reflection.summary}</p>
              )}
              
              {entry.reflection.follow_up_question && (
                <div className="reflection-question">
                  <p>"{entry.reflection.follow_up_question}"</p>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
