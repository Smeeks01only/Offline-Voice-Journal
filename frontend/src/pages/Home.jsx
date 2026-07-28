import React, { useState, useEffect } from 'react';
import RecordButton from '../components/RecordButton';
import { useRecording } from '../contexts/RecordingContext';
import { getEntries } from '../api/client';
import { Link } from 'react-router-dom';
import './Home.css';

function InsightChart({ entries }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0,0,0,0);
    return {
      dateObj: d,
      shortDay: d.toLocaleDateString(undefined, { weekday: 'short' }),
      dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: 0
    };
  });

  entries.forEach(entry => {
    const d = new Date(entry.created_at);
    d.setHours(0,0,0,0);
    const day = days.find(day => day.dateObj.getTime() === d.getTime());
    if (day) day.count++;
  });

  const maxCount = Math.max(...days.map(d => d.count), 1);
  
  const points = days.map((day, i) => {
    const x = i * 20;
    const y = 50 - (day.count / maxCount) * 40;
    return { ...day, x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="sparkline-wrapper">
      <div className="sparkline-container">
        <svg width="100%" height="80" viewBox="-10 0 140 80" preserveAspectRatio="none">
          <polyline 
            points={polylinePoints} 
            fill="none" 
            stroke="var(--color-coral-bloom)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {points.map((p, i) => (
            <g 
              key={i} 
              onMouseEnter={() => setHoveredIndex(i)} 
              onMouseLeave={() => setHoveredIndex(null)}
              className="chart-point-group"
            >
              <circle cx={p.x} cy={p.y} r="12" fill="transparent" className="hitbox" />
              <circle 
                cx={p.x} 
                cy={p.y} 
                r={hoveredIndex === i ? "4" : "2.5"} 
                fill={hoveredIndex === i ? "var(--color-ink-plum)" : "var(--color-coral-bloom)"} 
                className="point-dot"
              />
              <text x={p.x} y="75" textAnchor="middle" className="x-axis-label">{p.shortDay}</text>
            </g>
          ))}
        </svg>
        {hoveredIndex !== null && (
          <div className="chart-tooltip" style={{ left: `calc(${((hoveredIndex * 20) + 10) / 140 * 100}% - 40px)` }}>
            <strong>{points[hoveredIndex].dateStr}</strong>
            <span>{points[hoveredIndex].count} {points[hoveredIndex].count === 1 ? 'entry' : 'entries'}</span>
          </div>
        )}
      </div>
      <p className="insight-label">Entries per day</p>
    </div>
  );
}

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const data = await getEntries();
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryCreated = (newEntry) => {
    setSaveMessage(true);
    setEntries(prev => [newEntry, ...prev]);
    setTimeout(() => {
      setSaveMessage(false);
    }, 3000);
  };

  const { status, elapsedTime, lastCreatedEntry } = useRecording();

  useEffect(() => {
    if (lastCreatedEntry) {
      handleEntryCreated(lastCreatedEntry);
    }
  }, [lastCreatedEntry]);

  const recentEntry = entries.length > 0 ? entries[0] : null;
  const doneEntries = entries.filter(e => e.status === 'done');


  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return `1 day ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const renderStatus = (entry) => {
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
    <div className="home-container">
      <header className="home-header">
        <h1>Your journal</h1>
      </header>

      <div className="home-content">
        {/* CTA Card */}
        <section className="card cta-card">
          <RecordButton />
          <p className="cta-label">
            {saveMessage 
              ? "Saved — transcribing now…" 
              : status === 'recording'
                ? `Recording — tap to stop · ${Math.floor(elapsedTime / 60)}:${Math.floor(elapsedTime % 60).toString().padStart(2, '0')}`
                : "Tap to record a moment."}
          </p>
        </section>

        {/* Recent Entry Card */}
        {recentEntry ? (
          <Link to={`/entries/${recentEntry.id}`} className="card recent-card clickable-card">
            <div className="recent-card-header">
              <h2>Recent entry</h2>
              <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
            
            <div className="recent-entry-content">
              <div className="entry-card-header">
                <span className="entry-date">
                  {new Date(recentEntry.created_at).toLocaleDateString()} · {getRelativeTime(recentEntry.created_at)}
                </span>
                {renderStatus(recentEntry)}
              </div>
              <p className="entry-snippet">
                {recentEntry.status === 'done' 
                  ? (recentEntry.transcript?.slice(0, 100) + (recentEntry.transcript?.length > 100 ? '...' : '')) 
                  : recentEntry.status === 'error'
                  ? 'Processing failed.'
                  : 'Audio is being processed...'}
              </p>
            </div>
          </Link>
        ) : (
          <section className="card recent-card">
            <h2>Recent entry</h2>
            {loading ? (
              <p className="placeholder">Loading...</p>
            ) : (
              <p className="placeholder">No entries yet — record your first one above.</p>
            )}
          </section>
        )}

        {/* Insight Card */}
        {doneEntries.length >= 3 ? (
          <Link to="/timeline" className="card insight-card clickable-card">
            <div className="recent-card-header">
              <h2>Insight</h2>
              <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
            <InsightChart entries={doneEntries} />
          </Link>
        ) : (
          <section className="card insight-card">
            <h2>Insight</h2>
            <p className="placeholder">Insights appear once you've journaled a few times.</p>
          </section>
        )}
      </div>
    </div>
  );
}
