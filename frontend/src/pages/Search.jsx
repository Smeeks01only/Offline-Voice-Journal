import React, { useState } from 'react';
import { searchEntries } from '../api/client';
import RecordButton from '../components/RecordButton';
import EntryCard from '../components/EntryCard';
import './Search.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await searchEntries(query);
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <header className="search-header">
        <form onSubmit={handleSearch} className="search-form">
          <input 
            type="search" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries..."
            className="search-input"
            autoFocus
          />
          <button type="submit" className="search-button">Search</button>
        </form>
      </header>

      <div className="search-results">
        {loading ? (
          <p className="placeholder text-center">Searching...</p>
        ) : !hasSearched ? (
          <div className="empty-state">
            <p>Search your past entries.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <p>No entries matched '{query}'.</p>
          </div>
        ) : (
          <div className="entries-list">
            {results.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
