import React, { useState, useEffect } from 'react';
import { getEntries } from '../api/client';
import RecordButton from '../components/RecordButton';
import EntryCard from '../components/EntryCard';
import './Timeline.css';

export default function Timeline() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

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
    // Add new entry to the top
    setEntries(prev => [newEntry, ...prev]);
  };

  return (
    <div className="timeline-container">
      <header className="timeline-header">
        <h1>Timeline</h1>
      </header>

      {loading ? (
        <p className="placeholder">Loading timeline...</p>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <p>Nothing here yet — your recorded entries will show up on this timeline.</p>
        </div>
      ) : (
        <div className="entries-list">
          {entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
